import { MarketplaceConfig } from '../types';

export const SHOPIFY_CONFIG: MarketplaceConfig = {
  id: 'shopify',
  name: 'Shopify',
  authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
  tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
  apiUrl: 'https://{shop}.myshopify.com/admin/api/2024-01',
  scopes: [
    'read_products',
    'write_products',
    'read_orders',
    'read_inventory',
    'write_inventory'
  ],
  endpoints: {
    products: '/products.json',
    orders: '/orders.json',
    inventory: '/inventory_levels.json'
  },
  rateLimit: {
    maxRequests: 40,
    windowMs: 60000,
    retryAfter: 30,
    timeout: 10000
  }
};