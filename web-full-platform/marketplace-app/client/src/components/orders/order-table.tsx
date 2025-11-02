import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Truck, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import type { IconaOrder, IconaOrdersResponse } from "@shared/schema";
import { calculateOrderTotal, formatCurrency } from "@shared/pricing";
import { format } from "date-fns";

const statusColors = {
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface OrderTableProps {
  statusFilter?: string;
  dateFilter?: string;
}

export function OrderTable({ statusFilter, dateFilter }: OrderTableProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [relistOption, setRelistOption] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orderResponse, isLoading } = useQuery<IconaOrdersResponse>({
    queryKey: ["/api/orders", { status: statusFilter, date: dateFilter }],
  });

  const orders = orderResponse?.orders || [];

  // Use centralized calculation function
  const calculateTotal = calculateOrderTotal;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update order status", variant: "destructive" });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, relist }: { orderId: string; relist: boolean }) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}`, { 
        status: "cancelled", 
        relist 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order cancelled successfully" });
      setCancelOrderId(null);
      setRelistOption(false);
    },
    onError: () => {
      toast({ title: "Failed to cancel order", variant: "destructive" });
    },
  });

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders?.map(order => order._id) || []);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleUpdateStatus = (orderId: string, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  const handleCancelOrder = () => {
    if (cancelOrderId) {
      cancelOrderMutation.mutate({ orderId: cancelOrderId, relist: relistOption });
    }
  };

  const canCancelOrder = (status: string) => {
    return status !== "cancelled" && status !== "shipped" && status !== "delivered" && status !== "ended";
  };

  if (isLoading) {
    return (
      <Card className="shadow border border-border">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow border border-border">
      <CardContent className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Checkbox
                  checked={selectedOrders.length === orders?.length && orders.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {orders?.map((order) => (
              <tr key={order._id} data-testid={`row-order-${order._id}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Checkbox
                    checked={selectedOrders.includes(order._id)}
                    onCheckedChange={(checked) => handleSelectOrder(order._id, checked as boolean)}
                    data-testid={`checkbox-order-${order._id}`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                  #{order.invoice || order._id.slice(-8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {`${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {order.giveaway?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatCurrency(calculateTotal(order))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {order.date ? format(new Date(order.date), "MMM d, yyyy") : format(new Date(order.createdAt || Date.now()), "MMM d, yyyy")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge 
                    className={statusColors[(order.status || 'processing') as keyof typeof statusColors]}
                    data-testid={`status-${order.status || 'processing'}`}
                  >
                    {(order.status || 'processing').charAt(0).toUpperCase() + (order.status || 'processing').slice(1)}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button variant="ghost" size="sm" className="mr-3" data-testid={`button-view-order-${order._id}`}>
                    <Eye size={16} />
                  </Button>
                  {order.status === "processing" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="mr-3"
                      onClick={() => handleUpdateStatus(order._id, "shipped")}
                      data-testid={`button-ship-order-${order._id}`}
                    >
                      <Truck size={16} />
                    </Button>
                  )}
                  {canCancelOrder(order.status || 'processing') && (
                    <AlertDialog onOpenChange={(open) => {
                      if (!open) {
                        setCancelOrderId(null);
                        setRelistOption(false);
                      }
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-cancel-order-${order._id}`}
                          onClick={() => setCancelOrderId(order._id)}
                        >
                          <X size={16} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel this order? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="flex items-center space-x-2 my-4">
                          <Checkbox
                            id="relist"
                            checked={relistOption}
                            onCheckedChange={(checked) => setRelistOption(Boolean(checked === true))}
                            data-testid="checkbox-relist"
                          />
                          <label htmlFor="relist" className="text-sm">
                            Relist this order for future processing
                          </label>
                        </div>
                        
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {
                            setCancelOrderId(null);
                            setRelistOption(false);
                          }}>
                            Keep Order
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelOrder}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-cancel"
                          >
                            Cancel Order
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
