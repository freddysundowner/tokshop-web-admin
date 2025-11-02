import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { IconaOrder, IconaOrdersResponse } from "@shared/schema";

const statusColors = {
  ended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function RecentOrders() {
  const { data: ordersResponse, isLoading } = useQuery<IconaOrdersResponse>({
    queryKey: ["/api/orders"],
  });

  if (isLoading) {
    return (
      <Card className="shadow border border-border">
        <CardHeader className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">Recent Orders</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentOrders = ordersResponse?.orders?.slice(0, 4) || [];

  return (
    <Card className="shadow border border-border">
      <CardHeader className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Recent Orders</h3>
          <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 font-medium" data-testid="button-view-all-orders">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flow-root">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {recentOrders.map((order) => (
                <tr key={order._id} data-testid={`row-order-${order._id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {order._id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {`${order.customer.firstName} ${order.customer.lastName || ''}`.trim()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.giveaway?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      className={statusColors[(order.giveaway?.status || order.status || 'pending') as keyof typeof statusColors]}
                      data-testid={`status-${order.giveaway?.status || order.status || 'pending'}`}
                    >
                      {(order.giveaway?.status || order.status || 'pending').charAt(0).toUpperCase() + (order.giveaway?.status || order.status || 'pending').slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
