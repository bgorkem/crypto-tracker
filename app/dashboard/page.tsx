'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PriceTicker } from "@/components/dashboard/PriceTicker";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function DashboardPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [portfolios, setPortfolios] = useState<{ id: string; name: string; description: string | null }[]>([]);
  
  const supabase = createClient();

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Get session token
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
        body: JSON.stringify({
          name: portfolioName,
          description: portfolioDescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create portfolio');
      }

      const data = await response.json();
      
      // Add to portfolios list
      setPortfolios(prev => [...prev, data.data]);
      
      // Close dialog and reset form
      setIsDialogOpen(false);
      setPortfolioName('');
      setPortfolioDescription('');
    } catch (error) {
      console.error('Error creating portfolio:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Sign out using Supabase client
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      // Redirect to login page after signOut
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if there's an error
      window.location.href = '/auth/login';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Price Ticker */}
      <PriceTicker />
      
      {/* Header */}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Portfolios</h2>
            <p className="text-muted-foreground">
              Manage and track your cryptocurrency portfolios
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Create Portfolio</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Portfolio</DialogTitle>
                <DialogDescription>
                  Add a new portfolio to track your cryptocurrency holdings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePortfolio} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="My Portfolio"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={portfolioDescription}
                    onChange={(e) => setPortfolioDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Long-term holdings..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Portfolio Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Render created portfolios */}
          {portfolios.map((portfolio) => (
            <Card 
              key={portfolio.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/portfolio/${portfolio.id}`)}
            >
              <CardHeader>
                <CardTitle>{portfolio.name}</CardTitle>
                <CardDescription>{portfolio.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="text-2xl font-bold">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Holdings</span>
                    <span className="text-sm">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Show empty state if no portfolios */}
          {portfolios.length === 0 && (
            <Card className="border-dashed flex items-center justify-center min-h-[200px] md:col-span-2 lg:col-span-3">
              <CardContent className="text-center pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <CardTitle className="mb-2">No Portfolios Yet</CardTitle>
                <CardDescription>
                  Create your first portfolio to start tracking your cryptocurrency holdings
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Value</CardDescription>
              <CardTitle className="text-3xl">$25,430.50</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Across 1 portfolio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>24h Change</CardDescription>
              <CardTitle className="text-3xl text-green-600">+5.1%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                +$1,234.00
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Holdings</CardDescription>
              <CardTitle className="text-3xl">3</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Different cryptocurrencies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Transactions</CardDescription>
              <CardTitle className="text-3xl">12</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Total buy/sell orders
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
