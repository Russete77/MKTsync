import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        // Clear any invalid session state
        supabase.auth.signOut().then(() => {
          setSession(null);
          navigate('/login');
        });
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
        navigate('/login');
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    // Handle refresh token errors
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error || !session) {
            // Clear invalid session state
            supabase.auth.signOut().then(() => {
              setSession(null);
              navigate('/login');
            });
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};