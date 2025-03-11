import axios from 'axios';
import queryString from 'query-string';
import { encrypt, decrypt } from '../crypto';
import { MARKETPLACE_CONFIGS } from './config';
import type { MarketplaceCredentials, MarketplaceError } from './types';
import { supabase } from '../supabase';

export async function initiateOAuth(marketplaceId: string): Promise<string> {
  const config = MARKETPLACE_CONFIGS[marketplaceId];
  if (!config) throw new Error(`Unknown marketplace: ${marketplaceId}`);

  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);

  const params = {
    client_id: config.clientId,
    response_type: 'code',
    scope: config.scopes.join(' '),
    redirect_uri: `${window.location.origin}/oauth/callback`,
    state
  };

  return `${config.authUrl}?${queryString.stringify(params)}`;
}

export async function handleOAuthCallback(
  marketplaceId: string,
  code: string,
  state: string
): Promise<void> {
  const storedState = sessionStorage.getItem('oauth_state');
  if (!storedState || storedState !== state) {
    throw new Error('Invalid OAuth state');
  }

  const config = MARKETPLACE_CONFIGS[marketplaceId];
  if (!config) throw new Error(`Unknown marketplace: ${marketplaceId}`);

  try {
    const { data } = await axios.post(config.tokenUrl, {
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${window.location.origin}/oauth/callback`
    });

    const credentials: MarketplaceCredentials = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const encryptedCredentials = encrypt(JSON.stringify(credentials));
    
    await supabase
      .from('marketplace_connections')
      .upsert({
        user_id: user.id,
        marketplace_name: marketplaceId,
        enabled: true,
        credentials: encryptedCredentials,
        settings: {}
      });

  } catch (error) {
    const marketplaceError: MarketplaceError = {
      name: 'AuthError',
      message: 'Failed to authenticate with marketplace',
      code: 'AUTH_FAILED',
      retryable: false
    };

    if (axios.isAxiosError(error)) {
      marketplaceError.status = error.response?.status;
      marketplaceError.message = error.response?.data?.message || error.message;
    }

    throw marketplaceError;
  } finally {
    sessionStorage.removeItem('oauth_state');
  }
}