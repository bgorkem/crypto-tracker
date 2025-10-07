import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { CreatePortfolioDialog } from "./CreatePortfolioDialog";

interface EmptyPortfolioStateProps {
  onCreatePortfolio: (name: string, description: string) => Promise<void>;
  isCreating: boolean;
}

export function EmptyPortfolioState({ onCreatePortfolio, isCreating }: EmptyPortfolioStateProps) {
  return (
    <Card className="border-dashed flex items-center justify-center min-h-[400px]">
      <CardContent className="text-center pt-6">
        <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📊</span>
        </div>
        <CardTitle className="mb-2">No Portfolios Yet</CardTitle>
        <CardDescription className="mb-4">
          Create your first portfolio to start tracking your cryptocurrency holdings
        </CardDescription>
        <CreatePortfolioDialog
          onCreatePortfolio={onCreatePortfolio}
          isCreating={isCreating}
        />
      </CardContent>
    </Card>
  );
}
