import { MarketplaceConfig } from '../types';

export const MERCADOLIVRE_CONFIG: MarketplaceConfig = {
  id: 'mercadolivre',
  name: 'Mercado Livre',
  authUrl: 'https://auth.mercadolibre.com/authorization',
  tokenUrl: 'https://api.mercadolibre.com/oauth/token',
  apiUrl: 'https://api.mercadolibre.com',
  scopes: ['write', 'read', 'offline_access'],
  endpoints: {
    me: '/users/me',
    categories: '/sites/MLB/categories',
    products: '/items',
    orders: '/orders/search',
    questions: '/questions/search',
    messages: '/messages',
    shipping: '/shipments',
    userItems: (userId: string) => `/users/${userId}/items/search`
  },
  fallbackDomains: {
    auth: [
      'https://auth.mercadolibre.com',
      'https://auth.mercadolibre.com.mx',
      'https://auth.mercadolibre.cl'
    ]
  },
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000,
    retryAfter: 60,
    timeout: 10000
  },
  redirectUri: 'https://www.mktsync.com/oauth/callback'
};