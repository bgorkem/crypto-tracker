import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-background to-muted">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Crypto Portfolio Tracker
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Real-time cryptocurrency portfolio tracking and management
        </p>
        
        <div className="flex gap-4 justify-center mb-12">
          <Link href="/dashboard">
            <Button size="lg">View Dashboard</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline">Get Started</Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mt-16">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Prices</CardTitle>
              <CardDescription>
                Track live cryptocurrency prices with automatic updates every 30 seconds
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Analytics</CardTitle>
              <CardDescription>
                View holdings, cost basis, unrealized P/L, and portfolio allocation charts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Track all your buy and sell transactions with detailed history and filtering
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </main>
  );
}

