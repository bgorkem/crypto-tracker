import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortfolioValueChart } from "@/components/portfolio/PortfolioValueChart";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface PortfolioContentProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string) => void;
  accessToken: string | null;
  onViewDetails: (id: string) => void;
}

export function PortfolioContent({
  portfolios,
  selectedPortfolioId,
  setSelectedPortfolioId,
  accessToken,
  onViewDetails,
}: PortfolioContentProps) {
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label htmlFor="portfolio-select" className="text-sm font-medium">
          Selected Portfolio:
        </label>
        <Select
          value={selectedPortfolioId || undefined}
          onValueChange={setSelectedPortfolioId}
        >
          <SelectTrigger id="portfolio-select" className="w-[300px]">
            <SelectValue placeholder="Select a portfolio" />
          </SelectTrigger>
          <SelectContent>
            {portfolios.map((portfolio) => (
              <SelectItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPortfolio && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(selectedPortfolio.id)}
          >
            View Details →
          </Button>
        )}
      </div>

      {selectedPortfolioId && accessToken && (
        <PortfolioValueChart
          portfolioId={selectedPortfolioId}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
