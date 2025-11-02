import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { IconaOrder } from "@shared/schema";

export default function ThankYou() {
  const [, params] = useRoute("/thank-you/:orderId");
  const [, setLocation] = useLocation();
  const orderId = params?.orderId;

  // Fetch order details
  const { data: order, isLoading } = useQuery<IconaOrder>({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const json = await response.json();
      // API returns { success: true, data: order }
      return json.data || json;
    },
    enabled: !!orderId,
  });

  const handleViewOrder = () => {
    if (order) {
      // Store order to open in purchases page
      sessionStorage.setItem('openPurchaseOrder', JSON.stringify(order));
      setLocation('/purchases');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <div className="h-8 w-48 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-64 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Thank You for Your Order!</CardTitle>
          <p className="text-muted-foreground mt-2">
            Your order has been successfully placed
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {order && (
            <>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Order Number</span>
                  <span className="font-mono font-semibold" data-testid="text-order-id">
                    #{(order._id || '').slice(-8).toUpperCase()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-semibold text-lg" data-testid="text-order-total">
                    US${(() => {
                      // Calculate total from items since order.total doesn't exist in API response
                      const itemsTotal = order.items?.reduce((sum: number, item: any) => {
                        return sum + ((item.price || 0) * (item.quantity || 1));
                      }, 0) || 0;
                      const shipping = order.shipping_fee || 0;
                      const tax = order.tax || 0;
                      return (itemsTotal + shipping + tax).toFixed(2);
                    })()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">What's Next?</p>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email confirmation shortly. The seller will process your order and update you with shipping details.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setLocation('/')}
              data-testid="button-continue-shopping"
            >
              Continue Shopping
            </Button>
            <Button
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
              onClick={handleViewOrder}
              data-testid="button-view-order"
            >
              View Order Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
