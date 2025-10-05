'use client';

import { useState } from 'react';

interface DeletePortfolioDialogProps {
  isOpen: boolean;
  portfolioId: string;
  portfolioName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeletePortfolioDialog({
  isOpen,
  portfolioId,
  portfolioName,
  onClose,
  onSuccess
}: DeletePortfolioDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function getAuthSession() {
    const { createClient } = await import('@/lib/supabase-browser');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const session = await getAuthSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4 text-red-600">Delete Portfolio</h3>
        <p className="mb-6">
          Are you sure you want to delete <strong>{portfolioName}</strong>? This action cannot be undone. 
          All transactions associated with this portfolio will also be deleted.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
