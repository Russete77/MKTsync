import { MarketplaceConfig } from '../types';

export const VTEX_CONFIG: MarketplaceConfig = {
  id: 'vtex',
  name: 'VTEX',
  authUrl: 'https://{account_name}.myvtex.com/admin/oauth/authorize',
  tokenUrl: 'https://{account_name}.myvtex.com/api/vtexid/pub/authentication/oauth/accesstoken',
  apiUrl: 'https://{account_name}.myvtex.com/api',
  scopes: ['Catalog_API', 'OMS_API', 'Logistics_API'],
  endpoints: {
    products: '/catalog/pvt/product',
    orders: '/oms/pvt/orders',
    inventory: '/logistics/pvt/inventory/skus'
  },
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000,
    retryAfter: 30,
    timeout: 10000
  }
};