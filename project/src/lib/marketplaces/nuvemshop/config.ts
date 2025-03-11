import { MarketplaceConfig } from '../types';

export const NUVEMSHOP_CONFIG: MarketplaceConfig = {
  id: 'nuvemshop',
  name: 'Nuvemshop',
  authUrl: 'https://www.nuvemshop.com.br/apps/authorize',
  tokenUrl: 'https://www.nuvemshop.com.br/apps/authorize/token',
  apiUrl: 'https://api.nuvemshop.com.br/v1',
  scopes: ['products', 'orders', 'customers'],
  endpoints: {
    products: '/products',
    orders: '/orders',
    categories: '/categories'
  },
  rateLimit: {
    maxRequests: 40,
    windowMs: 60000,
    retryAfter: 30,
    timeout: 10000
  }
};