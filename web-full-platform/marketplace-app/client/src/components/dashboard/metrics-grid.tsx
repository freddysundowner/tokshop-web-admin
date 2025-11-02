import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingCart, Users, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { IconaDashboardResponse } from "@shared/schema";

interface Metric {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  color: string;
}

export function MetricsGrid() {
  const { data: metrics, isLoading } = useQuery<IconaDashboardResponse>({
    queryKey: ["/api/dashboard/metrics"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards: Metric[] = [
    {
      title: "Total Sales",
      value: `$${metrics?.totalAmount || "0"}`,
      change: "+12.3% from last month",
      icon: DollarSign,
      color: "text-chart-1",
    },
    {
      title: "Orders",
      value: metrics?.totalOrder?.toString() || "0",
      change: "+8.1% from last month",
      icon: ShoppingCart,
      color: "text-chart-2",
    },
    {
      title: "Pending Orders",
      value: metrics?.totalPendingOrder?.count?.toString() || "0",
      change: "+24.5% from last month",
      icon: Users,
      color: "text-chart-3",
    },
    {
      title: "Delivered Orders",
      value: metrics?.totalDeliveredOrder?.toString() || "0",
      change: "+15.2% from last month",
      icon: Video,
      color: "text-chart-4",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {metricCards.map((metric, index) => (
        <Card key={metric.title} className="overflow-hidden shadow border border-border">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <metric.icon className={`${metric.color} text-2xl`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">
                    {metric.title}
                  </dt>
                  <dd 
                    className="text-lg font-semibold text-foreground"
                    data-testid={`metric-${metric.title.toLowerCase().replace(" ", "-")}`}
                  >
                    {metric.value}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600 font-medium">+12.3%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
