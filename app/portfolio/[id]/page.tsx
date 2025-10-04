'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

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

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const portfolioId = params.id as string;
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [transactionDate, setTransactionDate] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId]);

  const loadData = async () => {
    try {
      // Dynamically import Supabase to avoid SSR issues
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/auth/login');
        return;
      }

      // Fetch portfolio
      const portfolioRes = await fetch(`/api/portfolios/${portfolioId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (portfolioRes.ok) {
        const data = await portfolioRes.json();
        setPortfolio(data.data);
      }

      // Fetch transactions  
      const txRes = await fetch(`/api/portfolios/${portfolioId}/transactions`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const res = await fetch(`/api/portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          quantity: parseFloat(quantity),
          price: parseFloat(pricePerUnit),
          side: transactionType,
          executed_at: transactionDate
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTransactions(prev => [data.data, ...prev]);
        setIsDialogOpen(false);
        setSymbol('');
        setQuantity('');
        setPricePerUnit('');
        setTransactionDate('');
      }
    } catch (error) {
      console.error('Create error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const calculateTotal = () => {
    return transactions.reduce((total, tx) => {
      const price = tx.price_per_unit || tx.price || 0;
      const amount = tx.quantity * price;
      const type = tx.type || tx.side;
      return type === 'BUY' ? total + amount : total - amount;
    }, 0);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!portfolio) {
    return <div className="min-h-screen flex items-center justify-center">Portfolio not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <button onClick={() => router.push('/dashboard')} className="px-4 py-2 border rounded">
          ← Back
        </button>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">{portfolio.name}</h2>
            <p className="text-gray-600">{portfolio.description || 'No description'}</p>
          </div>
          
          <button 
            onClick={() => setIsDialogOpen(true)}
            className="px-4 py-2 bg-black text-white rounded"
          >
            + Add Transaction
          </button>
        </div>

        <div className="mb-8 p-6 border rounded">
          <p className="text-sm text-gray-600">Total Portfolio Value</p>
          <p className="text-4xl font-bold">${calculateTotal().toFixed(2)}</p>
        </div>

        <div className="border rounded p-6">
          <h3 className="text-xl font-bold mb-4">Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No transactions yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Quantity</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const txType = tx.type || tx.side || 'BUY';
                  const txPrice = tx.price_per_unit || tx.price || 0;
                  const txDate = tx.transaction_date || tx.executed_at || '';
                  return (
                    <tr key={tx.id} className="border-b">
                      <td className="p-2 font-medium">{tx.symbol}</td>
                      <td className="p-2">
                        <span className={txType === 'BUY' ? 'text-green-600' : 'text-red-600'}>
                          {txType}
                        </span>
                      </td>
                      <td className="p-2 text-right">{tx.quantity}</td>
                      <td className="p-2 text-right">${txPrice.toLocaleString()}</td>
                      <td className="p-2 text-right">${(tx.quantity * txPrice).toLocaleString()}</td>
                      <td className="p-2">{new Date(txDate).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Simple Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Transaction</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Symbol</label>
                <input
                  name="symbol"
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                  placeholder="BTC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price Per Unit</label>
                <input
                  name="price_per_unit"
                  type="number"
                  step="any"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  name="transaction_type"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as 'BUY' | 'SELL')}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  name="transaction_date"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-black text-white rounded"
                >
                  {isCreating ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
