import { MarketplaceConfig } from '../types';

export const MAGENTO_CONFIG: MarketplaceConfig = {
  id: 'magento',
  name: 'Magento',
  authUrl: '{site_url}/oauth/authorize',
  tokenUrl: '{site_url}/oauth/token',
  apiUrl: '{site_url}/rest/V1',
  scopes: ['products', 'orders', 'inventory'],
  endpoints: {
    products: '/products',
    orders: '/orders',
    categories: '/categories'
  },
  rateLimit: {
    maxRequests: 30,
    windowMs: 60000,
    retryAfter: 60,
    timeout: 15000
  }
};