import axios from 'axios';
import { AMAZON_CONFIG } from './config';
import { supabase } from '../../../lib/supabase';
import { decrypt } from '../../../lib/crypto';

// Função para sincronizar produtos da Amazon
export async function syncAmazonProducts(userId) {
    try {
        const { data: connection } = await supabase
            .from('marketplace_connections')
            .select('credentials')
            .eq('user_id', userId)
            .eq('marketplace_name', 'amazon')
            .single();

        if (!connection) {
            throw new Error('Amazon connection not found');
        }

        const credentials = JSON.parse(decrypt(connection.credentials));
        const api = axios.create({
            baseURL: AMAZON_CONFIG.apiUrl,
            headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Obter produtos do vendedor
        const { data: products } = await api.get(AMAZON_CONFIG.endpoints.products);

        const results = {
            productsUpdated: 0,
            productsFailed: 0,
            errors: []
        };

        for (const product of products) {
            try {
                const mappedProduct = {
                    sku: product.sku,
                    name: product.title,
                    description: product.description,
                    price: product.price,
                    stock_quantity: product.available_quantity,
                    // Adicione outros mapeamentos conforme necessário
                };

                // Atualizar ou criar produto no banco de dados
                const { error: upsertError } = await supabase
                    .from('products')
                    .upsert({
                        user_id: userId,
                        sku: mappedProduct.sku,
                        name: mappedProduct.name,
                        description: mappedProduct.description,
                        price: mappedProduct.price,
                        stock_quantity: mappedProduct.stock_quantity,
                        status: 'active'
                    });

                if (upsertError) throw upsertError;
                results.productsUpdated++;
            } catch (error) {
                results.productsFailed++;
                results.errors.push({
                    sku: product.sku,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return {
            success: true,
            details: results
        };
    } catch (error) {
        console.error('Amazon sync error:', error);
        return {
            success: false,
            error: {
                name: 'SyncError',
                message: error instanceof Error ? error.message : 'Failed to sync with Amazon',
                code: 'AMAZON_SYNC_FAILED',
                retryable: true
            }
        };
    }
}
