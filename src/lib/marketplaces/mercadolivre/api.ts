import axios from 'axios';
import { MERCADOLIVRE_CONFIG } from './config';
import type { MarketplaceProduct, SyncResult } from '../types';
import { supabase } from '../../../lib/supabase';
import { decrypt } from '../../../lib/crypto';

interface MercadoLivreProduct {
  id: string;
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  buying_mode: string;
  condition: string;
  listing_type_id: string;
  description: string;
  pictures: Array<{ source: string }>;
  attributes: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
}

export async function syncMercadoLivreProducts(userId: string): Promise<SyncResult> {
  try {
    const { data: connection } = await supabase
      .from('marketplace_connections')
      .select('credentials')
      .eq('user_id', userId)
      .eq('marketplace_name', 'mercadolivre')
      .single();

    if (!connection) {
      throw new Error('Mercado Livre connection not found');
    }

    const credentials = JSON.parse(decrypt(connection.credentials));
    const api = axios.create({
      baseURL: MERCADOLIVRE_CONFIG.apiUrl,
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Get user's Mercado Livre seller ID
    const { data: userInfo } = await api.get(MERCADOLIVRE_CONFIG.endpoints.me);
    const sellerId = userInfo.id;

    // Get all active listings
    const { data: listings } = await api.get(MERCADOLIVRE_CONFIG.endpoints.userItems(sellerId));
    
    const results = {
      productsUpdated: 0,
      productsFailed: 0,
      errors: [] as Array<{ sku: string; error: string }>
    };

    // Process products in batches
    const BATCH_SIZE = 20;
    for (let i = 0; i < listings.results.length; i += BATCH_SIZE) {
      const batch = listings.results.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (itemId) => {
        try {
          const { data: product } = await api.get<MercadoLivreProduct>(`${MERCADOLIVRE_CONFIG.endpoints.products}/${itemId}`);
          
          // Map Mercado Livre product to our format
          const mappedProduct: MarketplaceProduct = {
            sku: product.id,
            name: product.title,
            description: product.description,
            price: product.price,
            stock_quantity: product.available_quantity,
            brand: product.attributes.find(attr => attr.id === 'BRAND')?.value_name,
            category: product.category_id,
            main_image: product.pictures[0]?.source,
            additional_images: product.pictures.slice(1).map(pic => pic.source),
            ean: product.attributes.find(attr => attr.id === 'GTIN')?.value_name,
            warranty: parseInt(product.attributes.find(attr => attr.id === 'WARRANTY_TIME')?.value_name || '0')
          };

          // Update or create product in our database
          const { error: upsertError } = await supabase
            .from('products')
            .upsert({
              user_id: userId,
              sku: mappedProduct.sku,
              name: mappedProduct.name,
              description: mappedProduct.description,
              price: mappedProduct.price,
              stock_quantity: mappedProduct.stock_quantity,
              status: 'active',
              metadata: {
                brand: mappedProduct.brand,
                category: mappedProduct.category,
                images: {
                  main: mappedProduct.main_image,
                  additional: mappedProduct.additional_images
                },
                ean: mappedProduct.ean,
                warranty: mappedProduct.warranty,
                mercadolivre: {
                  id: product.id,
                  category_id: product.category_id,
                  listing_type: product.listing_type_id
                }
              }
            });

          if (upsertError) throw upsertError;
          results.productsUpdated++;
        } catch (error) {
          results.productsFailed++;
          results.errors.push({
            sku: itemId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }));

      // Respect rate limits
      if (i + BATCH_SIZE < listings.results.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      details: results
    };

  } catch (error) {
    console.error('Mercado Livre sync error:', error);
    return {
      success: false,
      error: {
        name: 'SyncError',
        message: error instanceof Error ? error.message : 'Failed to sync with Mercado Livre',
        code: 'ML_SYNC_FAILED',
        retryable: true
      }
    };
  }
}