import { MarketplaceConfig } from '../types';

export const AMAZON_CONFIG: MarketplaceConfig = {
  id: 'amazon',
  name: 'Amazon',
  authUrl: 'https://sellercentral.amazon.com/apps/authorize/consent',
  tokenUrl: 'https://api.amazon.com/auth/o2/token',
  apiUrl: 'https://sellingpartnerapi.amazon.com',
  scopes: ['products:write', 'products:read', 'orders:read'],
  endpoints: {
    products: '/catalog/2022-04-01/items',
    orders: '/orders/v0/orders',
    inventory: '/inventory/v1/inventories'
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000,
    retryAfter: 60,
    timeout: 15000
  }
};