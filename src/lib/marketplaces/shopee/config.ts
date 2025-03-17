import { MarketplaceConfig } from '../types';

export const SHOPEE_CONFIG: MarketplaceConfig = {
  id: 'shopee',
  name: 'Shopee',
  authUrl: 'https://partner.shopeemobile.com/api/v2/shop/auth_partner',
  tokenUrl: 'https://partner.shopeemobile.com/api/v2/auth/token/get',
  apiUrl: 'https://partner.shopeemobile.com/api/v2',
  scopes: ['products', 'orders', 'shop'],
  endpoints: {
    products: '/product/get_item_list',
    orders: '/order/get_order_list',
    categories: '/product/get_category'
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60000,
    retryAfter: 10,
    timeout: 10000
  }
};