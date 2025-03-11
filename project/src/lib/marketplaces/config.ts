import { MarketplaceConfig } from './types';

// Import marketplace configurations
import { MERCADOLIVRE_CONFIG } from './mercadolivre/config';
import { AMAZON_CONFIG } from './amazon/config';
import { SHOPIFY_CONFIG } from './shopify/config';
import { WOOCOMMERCE_CONFIG } from './woocommerce/config';
import { SHOPEE_CONFIG } from './shopee/config';
import { MAGENTO_CONFIG } from './magento/config';
import { VTEX_CONFIG } from './vtex/config';
import { NUVEMSHOP_CONFIG } from './nuvemshop/config';

export const MARKETPLACE_CONFIGS: Record<string, MarketplaceConfig> = {
  mercadolivre: {
    ...MERCADOLIVRE_CONFIG,
    clientId: import.meta.env.VITE_MERCADOLIVRE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_MERCADOLIVRE_CLIENT_SECRET
  },
  amazon: AMAZON_CONFIG,
  shopify: SHOPIFY_CONFIG,
  woocommerce: WOOCOMMERCE_CONFIG,
  shopee: SHOPEE_CONFIG,
  magento: MAGENTO_CONFIG,
  vtex: VTEX_CONFIG,
  nuvemshop: NUVEMSHOP_CONFIG
};