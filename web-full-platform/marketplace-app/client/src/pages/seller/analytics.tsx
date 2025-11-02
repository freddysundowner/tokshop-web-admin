import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Analytics() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  return (
    <div className="py-6">
      <div className="px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-analytics-title">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed insights into your sales performance and business metrics.
          </p>
        </div>

        {/* Performance Metrics */}
        <div className="mb-8">
          <Card className="shadow border border-border">
            <CardHeader className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Performance Metrics</h3>
                <div className="flex space-x-2">
                  <Button size="sm" data-testid="button-this-month">This Month</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Last Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-6 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div data-testid="metric-avg-shipping-time">
                    <div className="text-2xl font-bold text-foreground">
                      {(metrics as any)?.avgShippingTime || "0"} days
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Shipping Time</div>
                    <div className="mt-1 flex items-center text-sm">
                      <TrendingDown className="text-green-600 mr-1" size={16} />
                      <span className="text-green-600">0.3 days faster</span>
                    </div>
                  </div>
                  <div data-testid="metric-cancellation-rate">
                    <div className="text-2xl font-bold text-foreground">
                      {(metrics as any)?.cancellationRate || "0"}%
                    </div>
                    <div className="text-sm text-muted-foreground">Cancellation Rate</div>
                    <div className="mt-1 flex items-center text-sm">
                      <TrendingDown className="text-green-600 mr-1" size={16} />
                      <span className="text-green-600">0.5% lower</span>
                    </div>
                  </div>
                  <div data-testid="metric-satisfaction">
                    <div className="text-2xl font-bold text-foreground">
                      {(metrics as any)?.satisfactionRating || "0"}/5
                    </div>
                    <div className="text-sm text-muted-foreground">Buyer Satisfaction</div>
                    <div className="mt-1 flex items-center text-sm">
                      <TrendingUp className="text-green-600 mr-1" size={16} />
                      <span className="text-green-600">0.2 points higher</span>
                    </div>
                  </div>
                  <div data-testid="metric-followers">
                    <div className="text-2xl font-bold text-foreground">
                      {(metrics as any)?.followers?.toLocaleString() || "0"}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Followers</div>
                    <div className="mt-1 flex items-center text-sm">
                      <TrendingUp className="text-green-600 mr-1" size={16} />
                      <span className="text-green-600">+156 this month</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SalesChart />
          <RevenueChart />
        </div>
      </div>
    </div>
  );
}
