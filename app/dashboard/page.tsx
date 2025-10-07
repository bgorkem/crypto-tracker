'use client';

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceTicker } from "@/components/dashboard/PriceTicker";
import { CreatePortfolioDialog } from "@/components/dashboard/CreatePortfolioDialog";
import { EmptyPortfolioState } from "@/components/dashboard/EmptyPortfolioState";
import { PortfolioContent } from "@/components/dashboard/PortfolioContent";
import Link from "next/link";
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

  const response = await fetch('/api/portfolios', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ name, description })
  });

  if (!response.ok) {
    throw new Error('Failed to create portfolio');
  }

  const data = await response.json();
  return data.data;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
    setIsCreating(true);
    try {
      const newPortfolio = await createPortfolio(supabase, name, description);
      setPortfolios(prev => [...(prev || []), newPortfolio]);
      setSelectedPortfolioId(newPortfolio.id);
      toast.success('Portfolio created successfully');
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast.error('Failed to create portfolio');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PriceTicker />
      
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Crypto Portfolio Tracker</h1>
            <p className="text-sm text-muted-foreground">Track your cryptocurrency investments in real-time</p>
          </div>
          <nav className="flex gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </nav>
        </div>
      </header>

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
