import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { MARKETPLACE_CONFIGS } from './config';
import type { MarketplaceCredentials, MarketplaceError, SyncResult } from './types';
import { decrypt } from '../crypto';
import { supabase } from '../supabase';

const API_CLIENTS: Record<string, AxiosInstance> = {};

function createApiClient(marketplaceId: string, credentials: MarketplaceCredentials): AxiosInstance {
  const config = MARKETPLACE_CONFIGS[marketplaceId];
  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`
    }
  });

  // Configure retry logic
  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 429 || // Rate limit
        (error.response?.status ?? 0) >= 500; // Server errors
    }
  });

  return client;
}

async function getApiClient(marketplaceId: string): Promise<AxiosInstance> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { data: connection } = await supabase
    .from('marketplace_connections')
    .select('credentials')
    .eq('user_id', user.id)
    .eq('marketplace_name', marketplaceId)
    .single();

  if (!connection) {
    throw new Error('Marketplace not connected');
  }

  const credentials: MarketplaceCredentials = JSON.parse(decrypt(connection.credentials));

  if (!API_CLIENTS[marketplaceId] || Date.now() >= credentials.expiresAt) {
    API_CLIENTS[marketplaceId] = createApiClient(marketplaceId, credentials);
  }

  return API_CLIENTS[marketplaceId];
}

export async function syncProducts(marketplaceId: string): Promise<SyncResult> {
  try {
    const client = await getApiClient(marketplaceId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    // Get all products from the marketplace
    const { data: marketplaceProducts } = await client.get('/products');

    const results = {
      productsUpdated: 0,
      productsFailed: 0,
      errors: [] as Array<{ sku: string; error: string }>
    };

    // Process products in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < marketplaceProducts.length; i += BATCH_SIZE) {
      const batch = marketplaceProducts.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (product) => {
        try {
          // Check if product already exists
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', user.id)
            .eq('sku', product.sku)
            .single();

          const productData = {
            user_id: user.id,
            sku: product.sku,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price),
            stock_quantity: parseInt(product.stock_quantity),
            metadata: {
              brand: product.brand,
              category: product.category,
              dimensions: {
                weight: product.weight,
                length: product.length,
                width: product.width,
                height: product.height
              },
              images: {
                main: product.main_image,
                additional: product.additional_images || []
              },
              ean: product.ean,
              warranty: product.warranty
            }
          };

          if (existingProduct) {
            // Update existing product
            await supabase
              .from('products')
              .update(productData)
              .eq('id', existingProduct.id);
          } else {
            // Create new product
            await supabase
              .from('products')
              .insert([productData]);
          }
          
          results.productsUpdated++;
        } catch (error) {
          results.productsFailed++;
          results.errors.push({
            sku: product.sku,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }));

      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < marketplaceProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      details: results
    };

  } catch (error) {
    const marketplaceError: MarketplaceError = {
      name: 'SyncError',
      message: 'Failed to sync products',
      code: 'SYNC_FAILED',
      retryable: true
    };

    if (axios.isAxiosError(error)) {
      marketplaceError.status = error.response?.status;
      marketplaceError.message = error.response?.data?.message || error.message;
      marketplaceError.retryable = error.response?.status !== 401; // Don't retry auth errors
    }

    return {
      success: false,
      error: marketplaceError
    };
  }
}