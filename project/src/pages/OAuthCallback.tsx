import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleMercadoLivreAuth } from '../lib/marketplaces/mercadolivre/auth';
import { Logo } from '../components/Logo';
import { AlertCircle } from 'lucide-react';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const marketplace = searchParams.get('marketplace');

    if (!code || !state) {
      setError('Invalid callback parameters');
      setProcessing(false);
      return;
    }

    // Handle Mercado Livre OAuth callback
    if (marketplace === 'mercadolivre') {
      handleMercadoLivreAuth(code)
        .then(() => {
          navigate('/sync', { 
            replace: true,
            state: { success: true, message: 'Successfully connected to Mercado Livre' }
          });
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Authentication failed');
          setProcessing(false);
        });
    } else {
      setError('Unsupported marketplace');
      setProcessing(false);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="h-12 mx-auto" />
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          {processing ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Completing Authentication...
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while we finish setting up your marketplace connection.
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="flex items-center justify-center text-red-500 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">
                Authentication Failed
              </h2>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <button
                onClick={() => navigate('/sync')}
                className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Return to Marketplace Sync
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}