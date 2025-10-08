'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { PriceTicker } from "@/components/dashboard/PriceTicker";
import { CreatePortfolioDialog } from "@/components/dashboard/CreatePortfolioDialog";
import { EmptyPortfolioState } from "@/components/dashboard/EmptyPortfolioState";
import { PortfolioContent } from "@/components/dashboard/PortfolioContent";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { usePortfolios } from "./hooks/usePortfolios";
import { toast } from "sonner";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

// Helpers
async function createPortfolio(
  supabase: ReturnType<typeof createClient>,
  name: string,
  description: string
): Promise<Portfolio> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  console.log('Creating portfolio with:', { name, description });

  const response = await fetch('/api/portfolios', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ name, description })
  });

  console.log('Portfolio creation response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    console.error('Portfolio creation failed:', errorData);
    throw new Error(errorData.error?.message || 'Failed to create portfolio');
  }

  const data = await response.json();
  console.log('Portfolio created successfully:', data);
  return data.data;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  
  const {
    portfolios,
    isLoading: isLoadingPortfolios,
    accessToken,
    selectedPortfolioId,
    setSelectedPortfolioId,
    setPortfolios,
    supabase,
  } = usePortfolios();

  const handleCreatePortfolio = async (name: string, description: string) => {
    console.log('handleCreatePortfolio called with:', { name, description });
    setIsCreating(true);
    try {
      const newPortfolio = await createPortfolio(supabase, name, description);
      console.log('Portfolio created, updating state:', newPortfolio);
      setPortfolios(prev => [...(prev || []), newPortfolio]);
      setSelectedPortfolioId(newPortfolio.id);
      toast.success('Portfolio created successfully');
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create portfolio');
      throw error; // Re-throw so the dialog knows it failed
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PriceTicker />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              View your portfolio performance and manage holdings
            </p>
          </div>
          
          <CreatePortfolioDialog
            onCreatePortfolio={handleCreatePortfolio}
            isCreating={isCreating}
          />
        </div>

        {isLoadingPortfolios && (
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        )}

        {!isLoadingPortfolios && portfolios.length === 0 && (
          <EmptyPortfolioState
            onCreatePortfolio={handleCreatePortfolio}
            isCreating={isCreating}
          />
        )}

        {!isLoadingPortfolios && portfolios.length > 0 && (
          <PortfolioContent
            portfolios={portfolios}
            selectedPortfolioId={selectedPortfolioId}
            setSelectedPortfolioId={setSelectedPortfolioId}
            accessToken={accessToken}
            onViewDetails={(id) => router.push(`/portfolio/${id}`)}
          />
        )}
      </main>
    </div>
  );
}
