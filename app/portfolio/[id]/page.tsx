'use client';

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PortfolioHeader } from "./components/PortfolioHeader";
import { PortfolioStats } from "./components/PortfolioStats";
import { HoldingsTable } from "./components/HoldingsTable";
import { TransactionsTable } from "./components/TransactionsTable";
import { AddTransactionDialog } from "./components/AddTransactionDialog";
import { EditPortfolioDialog } from "./components/EditPortfolioDialog";
import { DeletePortfolioDialog } from "./components/DeletePortfolioDialog";
import { PortfolioDetailSkeleton } from "./components/PortfolioDetailSkeleton";
import { TransactionFilters, applyTransactionFilters, type TransactionFilter } from "./components/TransactionFilters";
import { calculateHoldingsFromTransactions } from "./lib/holdings";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
}

interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price_per_unit?: number;
  price?: number;
  type?: 'BUY' | 'SELL';
  side?: 'BUY' | 'SELL';
  transaction_date?: string;
  executed_at?: string;
}

async function getAuthSession() {
  const { createClient } = await import('@/lib/supabase-browser');
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function loadPortfolioData(portfolioId: string, router: ReturnType<typeof useRouter>) {
  const session = await getAuthSession();
  if (!session?.access_token) {
    router.push('/auth/login');
    return null;
  }

  const portfolioRes = await fetch(`/api/portfolios/${portfolioId}`, {
    headers: { 'Authorization': `Bearer ${session.access_token}` }
  });
  
  const txRes = await fetch(`/api/portfolios/${portfolioId}/transactions`, {
    headers: { 'Authorization': `Bearer ${session.access_token}` }
  });

  const portfolioData = portfolioRes.ok ? await portfolioRes.json() : null;
  const txData = txRes.ok ? await txRes.json() : null;

  return {
    portfolio: portfolioData?.data?.portfolio || null,
    transactions: txData?.data || []
  };
}

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const portfolioId = params.id as string;
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilter>({
    symbol: null,
    type: 'ALL',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  useEffect(() => {
    loadPortfolioData(portfolioId, router).then(data => {
      if (data) {
        setPortfolio(data.portfolio);
        setTransactions(data.transactions);
      }
      setIsLoading(false);
    });
  }, [portfolioId, router]);

  // Fetch current prices when transactions change
  useEffect(() => {
    const fetchPrices = async () => {
      if (transactions.length === 0) return;

      const symbols = Array.from(new Set(transactions.map(tx => tx.symbol)));
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();
      
      const { data: prices } = await supabase
        .from('price_cache')
        .select('symbol, price_usd')
        .in('symbol', symbols);

      if (prices) {
        const priceMap = new Map(prices.map((p: { symbol: string; price_usd: number }) => [p.symbol, p.price_usd]));
        setCurrentPrices(priceMap);
      }
    };

    fetchPrices();
  }, [transactions]);

  const handleTransactionSuccess = (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleEditSuccess = (name: string, description: string) => {
    if (portfolio) {
      setPortfolio({ ...portfolio, name, description });
    }
  };

  const handleDeleteSuccess = () => {
    router.push('/dashboard');
  };

  // Calculate holdings with current market prices
  const holdings = useMemo(() => {
    const baseHoldings = calculateHoldingsFromTransactions(transactions);
    
    // Update market values with current prices
    return baseHoldings.map(holding => {
      const currentPrice = currentPrices.get(holding.symbol) || holding.averageCost;
      const marketValue = holding.totalQuantity * currentPrice;
      const unrealizedPL = marketValue - (holding.totalQuantity * holding.averageCost);
      
      return {
        ...holding,
        marketValue,
        unrealizedPL,
      };
    });
  }, [transactions, currentPrices]);

  // Get unique symbols for filter dropdown
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(transactions.map(tx => tx.symbol));
    return Array.from(symbols).sort();
  }, [transactions]);

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    return applyTransactionFilters(transactions, filters);
  }, [transactions, filters]);

  if (isLoading) {
    return <PortfolioDetailSkeleton />;
  }

  if (!portfolio) {
    return <div className="min-h-screen flex items-center justify-center">Portfolio not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PortfolioHeader
        name={portfolio.name}
        description={portfolio.description}
        onBack={() => router.push('/dashboard')}
        onDelete={() => setIsDeleteDialogOpen(true)}
        onEdit={() => setIsEditDialogOpen(true)}
        onAddTransaction={() => setIsDialogOpen(true)}
      />

      <main className="container mx-auto px-4 py-8">
        <PortfolioStats transactions={transactions} />
        <HoldingsTable holdings={holdings} />
        
        {/* Transaction Filters */}
        {transactions.length > 0 && (
          <TransactionFilters
            symbols={uniqueSymbols}
            onFilterChange={setFilters}
          />
        )}
        
        <TransactionsTable transactions={filteredTransactions} />
      </main>

      <AddTransactionDialog
        isOpen={isDialogOpen}
        portfolioId={portfolioId}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleTransactionSuccess}
      />

      <EditPortfolioDialog
        isOpen={isEditDialogOpen}
        portfolioId={portfolioId}
        currentName={portfolio.name}
        currentDescription={portfolio.description}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={handleEditSuccess}
      />

      <DeletePortfolioDialog
        isOpen={isDeleteDialogOpen}
        portfolioId={portfolioId}
        portfolioName={portfolio.name}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
