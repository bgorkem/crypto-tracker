interface PortfolioHeaderProps {
  name: string;
  description: string | null;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onAddTransaction: () => void;
}

export function PortfolioHeader({
  name,
  description,
  onBack,
  onDelete,
  onEdit,
  onAddTransaction
}: PortfolioHeaderProps) {
  return (
    <>
      <header className="border-b p-4">
        <div className="container mx-auto px-4">
          <button onClick={onBack} className="px-4 py-2 border rounded">
            ← Back
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">{name}</h2>
            <p className="text-gray-600">{description || 'No description'}</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={onDelete}
              className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
            >
              Delete Portfolio
            </button>
            <button 
              onClick={onEdit}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Edit Portfolio
            </button>
            <button 
              onClick={onAddTransaction}
              className="px-4 py-2 bg-black text-white rounded"
            >
              + Add Transaction
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
