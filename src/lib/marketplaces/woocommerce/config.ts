import { MarketplaceConfig } from '../types';

export const WOOCOMMERCE_CONFIG: MarketplaceConfig = {
  id: 'woocommerce',
  name: 'WooCommerce',
  authUrl: '{site_url}/wc-auth/v1/authorize',
  tokenUrl: '{site_url}/oauth/token',
  apiUrl: '{site_url}/wp-json/wc/v3',
  scopes: ['read', 'write'],
  endpoints: {
    products: '/products',
    orders: '/orders',
    categories: '/products/categories'
  },
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000,
    retryAfter: 30,
    timeout: 10000
  }
};