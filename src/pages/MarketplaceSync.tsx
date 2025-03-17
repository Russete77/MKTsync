import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowLeft, ExternalLink, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { initiateOAuth } from '../lib/marketplaces/auth';
import { syncMercadoLivreProducts } from '../lib/marketplaces/mercadolivre/api';
import { MARKETPLACE_CONFIGS } from '../lib/marketplaces/config';
import type { MarketplaceError } from '../lib/marketplaces/types';
import { Logo } from '../components/Logo';

interface MarketplaceStatus {
  id: string;
  name: string;
  connected: boolean;
  lastSync?: string;
  syncing?: boolean;
  error?: string;
}

export default function MarketplaceSync() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [marketplaces, setMarketplaces] = useState<MarketplaceStatus[]>(
    Object.values(MARKETPLACE_CONFIGS).map(config => ({
      id: config.id,
      name: config.name,
      connected: false
    }))
  );

  useEffect(() => {
    loadMarketplaceStatuses();
  }, []);

  const loadMarketplaceStatuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: connections } = await supabase
        .from('marketplace_connections')
        .select('*')
        .eq('user_id', user.id);

      if (connections) {
        setMarketplaces(prev =>
          prev.map(marketplace => {
            const connection = connections.find(c => c.marketplace_name === marketplace.id);
            return {
              ...marketplace,
              connected: !!connection?.enabled,
              lastSync: connection?.updated_at
            };
          })
        );
      }
    } catch (error) {
      console.error('Error loading marketplace statuses:', error);
    }
  };

  const handleConnect = async (marketplaceId: string) => {
    setLoading(prev => ({ ...prev, [marketplaceId]: true }));

    try {
      // Store marketplace ID in session storage for callback handling
      sessionStorage.setItem('connecting_marketplace', marketplaceId);
      
      const authUrl = await initiateOAuth(marketplaceId);
      
      // For Shopify, we need the shop URL
      if (marketplaceId === 'shopify') {
        const shopUrl = window.prompt('Please enter your Shopify store URL (e.g., mystore.myshopify.com):');
        if (!shopUrl) {
          throw new Error('Shop URL is required for Shopify integration');
        }
        sessionStorage.setItem('shopify_shop_url', shopUrl);
      }
      
      // For WooCommerce and Magento, we need the site URL
      if (marketplaceId === 'woocommerce' || marketplaceId === 'magento') {
        const siteUrl = window.prompt('Please enter your site URL:');
        if (!siteUrl) {
          throw new Error(`Site URL is required for ${marketplaceId} integration`);
        }
        sessionStorage.setItem(`${marketplaceId}_site_url`, siteUrl);
      }
      
      // For VTEX, we need the account name
      if (marketplaceId === 'vtex') {
        const accountName = window.prompt('Please enter your VTEX account name:');
        if (!accountName) {
          throw new Error('Account name is required for VTEX integration');
        }
        sessionStorage.setItem('vtex_account_name', accountName);
      }

      window.location.href = authUrl;
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to marketplace';
      setMarketplaces(prev =>
        prev.map(m =>
          m.id === marketplaceId
            ? { ...m, error: errorMessage }
            : m
        )
      );
    } finally {
      setLoading(prev => ({ ...prev, [marketplaceId]: false }));
    }
  };

  const handleSync = async (marketplaceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      setMarketplaces(prev =>
        prev.map(m =>
          m.id === marketplaceId
            ? { ...m, syncing: true, error: undefined }
            : m
        )
      );

      if (marketplaceId === 'mercadolivre') {
        const result = await syncMercadoLivreProducts(user.id);
        
        if (!result.success) {
          throw result.error;
        }

        setMarketplaces(prev =>
          prev.map(m =>
            m.id === marketplaceId
              ? {
                  ...m,
                  syncing: false,
                  lastSync: new Date().toISOString(),
                  error: undefined
                }
              : m
          )
        );

        const details = result.details;
        if (details) {
          console.log(`Sync completed: ${details.productsUpdated} updated, ${details.productsFailed} failed`);
          if (details.errors.length > 0) {
            console.log('Sync errors:', details.errors);
          }
        }
      } else {
        // For other marketplaces, we'll implement their sync logic later
        throw new Error('Sync not yet implemented for this marketplace');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setMarketplaces(prev =>
        prev.map(m =>
          m.id === marketplaceId
            ? { ...m, syncing: false, error: errorMessage }
            : m
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('common.back')}
            </button>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('marketplaces.title')}</h1>
              
              <div className="space-y-6">
                {marketplaces.map((marketplace) => (
                  <div
                    key={marketplace.id}
                    className="flex items-center justify-between p-6 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <Store className="h-8 w-8 text-gray-400" />
                      <div className="ml-4">
                        <h2 className="text-lg font-medium text-gray-900">
                          {marketplace.name}
                        </h2>
                        {marketplace.connected && marketplace.lastSync && (
                          <p className="text-sm text-gray-500">
                            {t('marketplaces.lastSync', {
                              time: new Date(marketplace.lastSync).toLocaleString()
                            })}
                          </p>
                        )}
                        {marketplace.error && (
                          <p className="text-sm text-red-600 mt-1 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {marketplace.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {marketplace.connected ? (
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            <span>{t('marketplaces.connected')}</span>
                          </div>
                          <button
                            onClick={() => handleSync(marketplace.id)}
                            disabled={marketplace.syncing}
                            className="flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${marketplace.syncing ? 'animate-spin' : ''}`} />
                            {marketplace.syncing ? t('marketplaces.syncing') : t('marketplaces.syncNow')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(marketplace.id)}
                          disabled={loading[marketplace.id]}
                          className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {loading[marketplace.id] ? t('common.loading') : t('marketplaces.connect')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Important Information</h3>
                <div className="bg-blue-50 p-4 rounded-md">
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-2">
                    <li>You'll be redirected to each marketplace to authorize access</li>
                    <li>Your credentials are securely stored and encrypted</li>
                    <li>You can disconnect a marketplace at any time</li>
                    <li>Products will sync automatically once connected</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}