interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price_per_unit?: number;
  price?: number;
  type?: 'BUY' | 'SELL';
  side?: 'BUY' | 'SELL';
}

interface PortfolioStatsProps {
  transactions: Transaction[];
}

export function PortfolioStats({ transactions }: PortfolioStatsProps) {
  const calculateTotal = () => {
    return transactions.reduce((total, tx) => {
      const price = tx.price_per_unit || tx.price || 0;
      const amount = tx.quantity * price;
      const type = tx.type || tx.side;
      return type === 'BUY' ? total + amount : total - amount;
    }, 0);
  };

  return (
    <div className="mb-8 p-6 border rounded">
      <p className="text-sm text-gray-600">Total Portfolio Value</p>
      <p className="text-4xl font-bold">${calculateTotal().toFixed(2)}</p>
    </div>
  );
}
