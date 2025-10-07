'use client';

import { useState, useEffect, FormEvent } from 'react';

interface EditPortfolioDialogProps {
  isOpen: boolean;
  portfolioId: string;
  currentName: string;
  currentDescription: string | null;
  onClose: () => void;
  onSuccess: (name: string, description: string) => void;
}

export function EditPortfolioDialog({
  isOpen,
  portfolioId,
  currentName,
  currentDescription,
  onClose,
  onSuccess
}: EditPortfolioDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [editName, setEditName] = useState(currentName);
  const [editDescription, setEditDescription] = useState(currentDescription || '');

  // Update form when dialog opens or when current values change
  useEffect(() => {
    if (isOpen) {
      setEditName(currentName);
      setEditDescription(currentDescription || '');
    }
  }, [isOpen, currentName, currentDescription]);

  async function getAuthSession() {
    const { createClient } = await import('@/lib/supabase-browser');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const session = await getAuthSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription
        })
      });

      if (res.ok) {
        onSuccess(editName, editDescription);
        onClose();
      }
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Edit Portfolio</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
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
              disabled={isUpdating}
              className="px-4 py-2 bg-black text-white rounded"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
