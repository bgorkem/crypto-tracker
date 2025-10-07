import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export function usePortfolios() {
  const router = useRouter();
  const supabase = createClient();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);

  useEffect(() => {
    const loadPortfolios = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          router.push('/auth/login');
          return;
        }

        setAccessToken(session.access_token);

        const response = await fetch('/api/portfolios', {
          headers: { 
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch portfolios');
        }

        const data = await response.json();
        setPortfolios(data.data.portfolios || []);
        
        // Auto-select first portfolio
        if (data.data.portfolios && data.data.portfolios.length > 0) {
          setSelectedPortfolioId(data.data.portfolios[0].id);
        }
      } catch (error) {
        console.error('Error fetching portfolios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    portfolios,
    isLoading,
    accessToken,
    selectedPortfolioId,
    setSelectedPortfolioId,
    setPortfolios,
    supabase,
  };
}
