import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, Settings, Plus, Upload, Download, 
  AlertCircle, AlertTriangle, TrendingUp, DollarSign, ShoppingBag, BarChart,
  ShoppingCart, Globe, Store, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { MARKETPLACE_CONFIGS } from '../lib/marketplaces/config';
import { useSettings } from '../lib/settings';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { ProductList } from '../components/ProductList';
import { Logo } from '../components/Logo';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface StatisticCard {
  icon: React.ReactNode;
  label: string;
  value: string | number | React.ReactNode;
  loading?: boolean;
}

interface ImportProduct {
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

interface MarketplaceStatus {
  id: string;
  name: string;
  connected: boolean;
}

interface SalesMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  loading: boolean;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  status: string;
  metadata: {
    brand?: string;
    category?: string;
    images?: {
      main?: string;
    };
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const settings = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [marketplaces, setMarketplaces] = useState<MarketplaceStatus[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeListings: 0,
    pendingUpdates: 0,
    loading: true
  });
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    revenueGrowth: 0,
    loading: true
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    loadMarketplaceStatuses();
    loadStatistics();
    loadSalesMetrics();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductDelete = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const loadMarketplaceStatuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: connections } = await supabase
        .from('marketplace_connections')
        .select('*')
        .eq('user_id', user.id);

      const marketplaceStatuses = Object.values(MARKETPLACE_CONFIGS).map(config => ({
        id: config.id,
        name: config.name,
        connected: connections?.some(c => c.marketplace_name === config.id && c.enabled) || false
      }));

      setMarketplaces(marketplaceStatuses);
    } catch (error) {
      console.error('Error loading marketplace statuses:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id);

      const { data: listings } = await supabase
        .from('product_listings')
        .select('*')
        .eq('sync_status', 'pending');

      setStats({
        totalProducts: products?.length || 0,
        activeListings: products?.filter(p => p.status === 'active').length || 0,
        pendingUpdates: listings?.length || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const loadSalesMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const today = new Date().toISOString().split('T')[0];
      
      const { data: metrics, error } = await supabase
        .from('sales_metrics')
        .upsert({
          user_id: user.id,
          date: today,
          total_sales: 0,
          total_orders: 0,
          average_order_value: 0,
          revenue_growth_rate: 0,
          top_selling_products: [],
          marketplace_performance: {}
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) throw error;

      setSalesMetrics({
        totalSales: metrics.total_sales,
        totalOrders: metrics.total_orders,
        averageOrderValue: metrics.average_order_value,
        revenueGrowth: metrics.revenue_growth_rate,
        loading: false
      });
    } catch (error) {
      console.error('Error loading sales metrics:', error);
      setSalesMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleSync = () => {
    navigate('/sync');
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    if (file.type !== 'application/json' && file.type !== 'text/csv') {
      setImportError('Please upload a JSON or CSV file');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileContent = await file.text();
      let products: ImportProduct[] = [];

      if (file.type === 'application/json') {
        products = JSON.parse(fileContent);
      } else {
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        products = lines.slice(1).map(line => {
          const values = line.split(',').map(value => value.trim());
          const product: any = {};
          headers.forEach((header, index) => {
            if (values[index]) {
              if (header === 'additional_images') {
                product[header] = values[index].split(';').filter(Boolean);
              } else if (['price', 'weight', 'length', 'width', 'height'].includes(header)) {
                product[header] = parseFloat(values[index]);
              } else if (['stock_quantity', 'warranty'].includes(header)) {
                product[header] = parseInt(values[index]);
              } else {
                product[header] = values[index];
              }
            }
          });
          return product;
        });
      }

      const { error: insertError } = await supabase
        .from('products')
        .insert(
          products.map(product => ({
            user_id: user.id,
            sku: product.sku,
            name: product.name,
            description: product.description,
            price: product.price,
            stock_quantity: product.stock_quantity,
            metadata: {
              brand: product.brand,
              category: product.category,
              dimensions: {
                weight: product.weight,
                length: product.length,
                width: product.width,
                height: product.height
              },
              images: {
                main: product.main_image,
                additional: product.additional_images || []
              },
              ean: product.ean,
              warranty: product.warranty
            }
          }))
        );

      if (insertError) throw insertError;
      setImportSuccess(`Successfully imported ${products.length} products`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'An error occurred while importing products');
    }
  };

  const handleExport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const exportData = products.map(product => ({
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        stock_quantity: product.stock_quantity,
        brand: product.metadata?.brand,
        category: product.metadata?.category,
        weight: product.metadata?.dimensions?.weight,
        length: product.metadata?.dimensions?.length,
        width: product.metadata?.dimensions?.width,
        height: product.metadata?.dimensions?.height,
        main_image: product.metadata?.images?.main,
        additional_images: product.metadata?.images?.additional,
        ean: product.metadata?.ean,
        warranty: product.metadata?.warranty
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleSaveSettings = () => {
    setIsSettingsOpen(false);
  };

  const statistics: StatisticCard[] = [
    {
      icon: <ShoppingCart className="h-6 w-6 text-blue-500" />,
      label: t('statistics.totalProducts'),
      value: stats.loading ? '-' : stats.totalProducts,
      loading: stats.loading
    },
    {
      icon: <Globe className="h-6 w-6 text-green-500" />,
      label: t('statistics.activeListings'),
      value: stats.loading ? '-' : stats.activeListings,
      loading: stats.loading
    },
    {
      icon: <RefreshCw className="h-6 w-6 text-orange-500" />,
      label: t('statistics.pendingUpdates'),
      value: stats.loading ? '-' : stats.pendingUpdates,
      loading: stats.loading
    },
    {
      icon: <DollarSign className="h-6 w-6 text-emerald-500" />,
      label: t('statistics.totalSales'),
      value: salesMetrics.loading ? '-' : <CurrencyDisplay amount={salesMetrics.totalSales} />,
      loading: salesMetrics.loading
    },
    {
      icon: <ShoppingBag className="h-6 w-6 text-purple-500" />,
      label: t('statistics.totalOrders'),
      value: salesMetrics.loading ? '-' : salesMetrics.totalOrders,
      loading: salesMetrics.loading
    },
    {
      icon: <BarChart className="h-6 w-6 text-indigo-500" />,
      label: t('statistics.averageOrderValue'),
      value: salesMetrics.loading ? '-' : <CurrencyDisplay amount={salesMetrics.averageOrderValue} />,
      loading: salesMetrics.loading
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-rose-500" />,
      label: t('statistics.revenueGrowth'),
      value: salesMetrics.loading ? '-' : `${salesMetrics.revenueGrowth}%`,
      loading: salesMetrics.loading
    }
  ];

  const quickActions: QuickAction[] = [
    {
      icon: <Plus className="h-5 w-5" />,
      label: t('quickActions.addProduct'),
      onClick: () => navigate('/products/add')
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      label: t('quickActions.sync'),
      onClick: handleSync
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: t('quickActions.import'),
      onClick: handleImportClick
    },
    {
      icon: <Download className="h-5 w-5" />,
      label: t('quickActions.export'),
      onClick: handleExport
    }
  ];

  const hasConnectedMarketplaces = marketplaces.some(m => m.connected);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {t('auth.signIn.button')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {!hasConnectedMarketplaces && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">{t('marketplaces.title')}</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {t('marketplaces.connect')}{' '}
                  <button
                    onClick={() => navigate('/sync')}
                    className="font-medium underline hover:text-yellow-900"
                  >
                    {t('common.actions')}
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {(importError || importSuccess) && (
          <div className={`mb-4 p-4 rounded-md ${importError ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className="flex">
              {importError ? (
                <AlertCircle className="h-5 w-5 text-red-400" />
              ) : (
                <div className="h-5 w-5 text-green-400" />
              )}
              <p className={`ml-3 text-sm ${importError ? 'text-red-700' : 'text-green-700'}`}>
                {importError || importSuccess}
              </p>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json,.csv"
          onChange={handleFileImport}
        />

        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('quickActions.title')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="flex items-center justify-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {action.icon}
                <span className="ml-2 text-sm font-medium text-gray-900">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">{t('product.list.columns.product')}</h2>
            <button
              onClick={() => navigate('/products/add')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('quickActions.addProduct')}
            </button>
          </div>
          
          {loadingProducts ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm">
              <ProductList products={products} onDelete={handleProductDelete} />
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('statistics.title')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statistics.map((stat, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-sm"
              >
                <div className="flex items-center">
                  {stat.icon}
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <div className="flex items-center">
                      {stat.loading ? (
                        <div className="h-8 flex items-center">
                          <div className="animate-pulse h-6 w-12 bg-gray-200 rounded"></div>
                        </div>
                      ) : (
                        <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('marketplaces.title')}</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {marketplaces.map((marketplace) => (
                <div key={marketplace.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <Store className="h-6 w-6 text-gray-400" />
                    <span className="ml-3 font-medium text-gray-900">{marketplace.name}</span>
                  </div>
                  {marketplace.connected ? (
                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                      {t('marketplaces.connected')}
                    </span>
                  ) : (
                    <button
                      onClick={() => navigate('/sync')}
                      className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full"
                    >
                      {t('marketplaces.connect')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{t('settings.title')}</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.notifications.title')}</h3>
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => settings.updateNotifications({ email: e.target.checked })}
                      className="form-checkbox h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-3 text-gray-900">{t('settings.notifications.email')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push}
                      onChange={(e) => settings.updateNotifications({ push: e.target.checked })}
                      className="form-checkbox h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-3 text-gray-900">{t('settings.notifications.push')}</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.general.title')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings.general.language')}
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => settings.setLanguage(e.target.value)}
                      className="form-select block w-full rounded-md border-gray-300"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="pt">Português</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings.general.currency')}
                    </label>
                    <select
                      value={settings.currency}
                      onChange={(e) => settings.setCurrency(e.target.value)}
                      className="form-select block w-full rounded-md border-gray-300"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="BRL">BRL</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('settings.buttons.cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {t('settings.buttons.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}