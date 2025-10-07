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

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="border rounded p-6">
        <h3 className="text-xl font-bold mb-4">Transactions</h3>
        <p className="text-center py-8 text-gray-500">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="border rounded p-6">
      <h3 className="text-xl font-bold mb-4">Transactions</h3>
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
            const total = tx.quantity * txPrice;

            return (
              <tr key={tx.id} className="border-b">
                <td className="p-2 font-medium">{tx.symbol}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    txType === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {txType}
                  </span>
                </td>
                <td className="p-2 text-right">{tx.quantity}</td>
                <td className="p-2 text-right">
                  ${txPrice.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </td>
                <td className="p-2 text-right">
                  ${total.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </td>
                <td className="p-2">
                  {new Date(txDate).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
