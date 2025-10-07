'use client';

import { useState, FormEvent } from 'react';
import { toast } from 'sonner';

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

interface AddTransactionDialogProps {
  isOpen: boolean;
  portfolioId: string;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
}

export function AddTransactionDialog({
  isOpen,
  portfolioId,
  onClose,
  onSuccess
}: AddTransactionDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [transactionDate, setTransactionDate] = useState('');

  async function getAuthSession() {
    const { createClient } = await import('@/lib/supabase-browser');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const session = await getAuthSession();
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
        const responseData = await res.json();
        onSuccess(responseData.data);
        toast.success('Transaction added successfully!');
        onClose();
        
        // Reset form
        setSymbol('');
        setQuantity('');
        setPricePerUnit('');
        setTransactionType('BUY');
        setTransactionDate('');
      } else {
        toast.error('Failed to add transaction. Please try again.');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to add transaction. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Add Transaction</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Symbol</label>
            <input
              type="text"
              name="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="BTC"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              step="any"
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price Per Unit</label>
            <input
              type="number"
              name="price_per_unit"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              step="any"
              className="w-full px-3 py-2 border rounded"
              required
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
              type="date"
              name="transaction_date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
  );
}
