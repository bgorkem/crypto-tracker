interface Holding {
  symbol: string;
  totalQuantity: number;
  averageCost: number;
  marketValue: number;
  unrealizedPL: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="border rounded p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Holdings</h3>
        <p className="text-center py-8 text-gray-500">No holdings yet</p>
      </div>
    );
  }

  return (
    <div className="border rounded p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">Holdings</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Symbol</th>
            <th className="text-right p-2">Quantity</th>
            <th className="text-right p-2">Avg Cost</th>
            <th className="text-right p-2">Market Value</th>
            <th className="text-right p-2">Unrealized P/L</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <tr key={holding.symbol} className="border-b">
              <td className="p-2 font-medium">{holding.symbol}</td>
              <td className="p-2 text-right">{holding.totalQuantity}</td>
              <td className="p-2 text-right">
                ${holding.averageCost.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </td>
              <td className="p-2 text-right">
                ${holding.marketValue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </td>
              <td className={`p-2 text-right ${holding.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${holding.unrealizedPL.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
