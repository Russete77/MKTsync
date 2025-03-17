export interface MarketplaceConfig {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  apiUrl: string;
  scopes: string[];
  endpoints?: {
    me?: string;
    categories?: string;
    products?: string;
    orders?: string;
    questions?: string;
    messages?: string;
    shipping?: string;
    userItems?: (userId: string) => string;
  };
  fallbackDomains?: {
    auth: string[];
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    retryAfter: number;
    timeout: number;
  };
}

export interface MarketplaceCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface MarketplaceError extends Error {
  code: string;
  status?: number;
  retryable: boolean;
}

export interface MarketplaceProduct {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  brand?: string;
  category?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  main_image?: string;
  additional_images?: string[];
  ean?: string;
  warranty?: number;
}

export interface SyncResult {
  success: boolean;
  error?: MarketplaceError;
  details?: {
    productsUpdated: number;
    productsFailed: number;
    errors: Array<{
      sku: string;
      error: string;
    }>;
  };
}