import { supabase } from '../../../lib/supabase';
import { encrypt, decrypt } from '../../../lib/crypto';
import { MERCADOLIVRE_CONFIG } from './config';
import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configure axios with enhanced retry logic
const api = axios.create({
  timeout: MERCADOLIVRE_CONFIG.rateLimit.timeout,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.response?.status === 429 ||
      (error.response?.status ?? 0) >= 500;
  },
  onRetry: (retryCount, error, requestConfig) => {
    // On DNS failure, try alternative domains
    if (error.code === 'ENOTFOUND' && requestConfig.url?.includes('auth.mercadolibre.com.br')) {
      const fallbackDomain = MERCADOLIVRE_CONFIG.fallbackDomains.auth[retryCount - 1];
      if (fallbackDomain) {
        requestConfig.url = requestConfig.url.replace(
          /https:\/\/[^\/]+/,
          fallbackDomain
        );
      }
    }
    console.log(`Retrying request (${retryCount}/3)...`);
  }
});

export async function handleMercadoLivreAuth(code: string): Promise<void> {
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: import.meta.env.VITE_MERCADOLIVRE_CLIENT_ID,
      client_secret: import.meta.env.VITE_MERCADOLIVRE_CLIENT_SECRET,
      code,
      redirect_uri: 'https://www.mktsync.com/oauth/callback'
    });

    // Try authentication with primary domain
    let tokenResponse;
    try {
      const response = await api.post(
        MERCADOLIVRE_CONFIG.tokenUrl,
        params.toString(),
        {
          validateStatus: (status) => status < 500
        }
      );
      tokenResponse = response.data;
    } catch (error) {
      // If primary domain fails, try fallback domains
      if (axios.isAxiosError(error) && (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')) {
        for (const fallbackDomain of MERCADOLIVRE_CONFIG.fallbackDomains.auth) {
          try {
            const response = await api.post(
              `${fallbackDomain}/oauth/token`,
              params.toString(),
              {
                validateStatus: (status) => status < 500
              }
            );
            tokenResponse = response.data;
            break;
          } catch (fallbackError) {
            console.error(`Fallback domain ${fallbackDomain} failed:`, fallbackError);
          }
        }
      }
      
      if (!tokenResponse) {
        throw error;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const credentials = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000
    };

    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    await supabase
      .from('marketplace_connections')
      .upsert({
        user_id: user.id,
        marketplace_name: 'mercadolivre',
        enabled: true,
        credentials: encryptedCredentials,
        settings: {
          site_id: 'MLB',
          auto_sync: true,
          sync_interval: 30
        }
      });

  } catch (error) {
    console.error('Mercado Livre auth error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Mercado Livre. The service might be temporarily unavailable. Please try again later.');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid client credentials. Please check your Mercado Livre app configuration.');
      }
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
    }
    
    throw new Error('Failed to authenticate with Mercado Livre. Please try again.');
  }
}

export async function refreshMercadoLivreToken(userId: string): Promise<void> {
  try {
    const { data: connection } = await supabase
      .from('marketplace_connections')
      .select('credentials')
      .eq('user_id', userId)
      .eq('marketplace_name', 'mercadolivre')
      .single();

    if (!connection) throw new Error('No Mercado Livre connection found');

    const credentials = JSON.parse(decrypt(connection.credentials));

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: import.meta.env.VITE_MERCADOLIVRE_CLIENT_ID,
      client_secret: import.meta.env.VITE_MERCADOLIVRE_CLIENT_SECRET,
      refresh_token: credentials.refreshToken
    });

    // Try token refresh with primary domain
    let tokenResponse;
    try {
      const response = await api.post(
        MERCADOLIVRE_CONFIG.tokenUrl,
        params.toString(),
        {
          validateStatus: (status) => status < 500
        }
      );
      tokenResponse = response.data;
    } catch (error) {
      // If primary domain fails, try fallback domains
      if (axios.isAxiosError(error) && (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')) {
        for (const fallbackDomain of MERCADOLIVRE_CONFIG.fallbackDomains.auth) {
          try {
            const response = await api.post(
              `${fallbackDomain}/oauth/token`,
              params.toString(),
              {
                validateStatus: (status) => status < 500
              }
            );
            tokenResponse = response.data;
            break;
          } catch (fallbackError) {
            console.error(`Fallback domain ${fallbackDomain} failed:`, fallbackError);
          }
        }
      }
      
      if (!tokenResponse) {
        throw error;
      }
    }

    const newCredentials = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000
    };

    const encryptedCredentials = encrypt(JSON.stringify(newCredentials));

    await supabase
      .from('marketplace_connections')
      .update({
        credentials: encryptedCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('marketplace_name', 'mercadolivre');

  } catch (error) {
    console.error('Failed to refresh Mercado Livre token:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Mercado Livre. The service might be temporarily unavailable. Please try again later.');
      }
      if (error.response?.status === 401) {
        // Token is invalid or expired, remove the connection
        await supabase
          .from('marketplace_connections')
          .update({ enabled: false })
          .eq('user_id', userId)
          .eq('marketplace_name', 'mercadolivre');
          
        throw new Error('Your Mercado Livre connection has expired. Please reconnect your account.');
      }
    }
    
    throw error;
  }
}