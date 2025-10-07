import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PortfolioDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="container mx-auto px-4 py-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64 mb-2" /> {/* Portfolio name */}
            <Skeleton className="h-5 w-96" /> {/* Description */}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" /> {/* Delete */}
            <Skeleton className="h-10 w-24" /> {/* Edit */}
            <Skeleton className="h-10 w-40" /> {/* Add Transaction */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Holdings Table Skeleton */}
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4 flex-1">
                    <Skeleton className="h-10 w-10 rounded-full" /> {/* Icon */}
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-24" /> {/* Symbol */}
                      <Skeleton className="h-4 w-32" /> {/* Name */}
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20" /> {/* Quantity */}
                  <Skeleton className="h-5 w-24" /> {/* Value */}
                  <Skeleton className="h-5 w-20" /> {/* P/L */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-5 w-20" /> {/* Type */}
                  <Skeleton className="h-5 w-16" /> {/* Symbol */}
                  <Skeleton className="h-5 w-24" /> {/* Quantity */}
                  <Skeleton className="h-5 w-24" /> {/* Price */}
                  <Skeleton className="h-5 w-32" /> {/* Date */}
                  <Skeleton className="h-8 w-16" /> {/* Actions */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
