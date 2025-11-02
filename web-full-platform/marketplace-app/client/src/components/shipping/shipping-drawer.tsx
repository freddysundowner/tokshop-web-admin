import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Package, 
  Printer, 
  Calculator, 
  RefreshCw,
  Truck,
  DollarSign,
  ChevronDown,
  Users
} from "lucide-react";
import type { IconaOrder, ShippingEstimateRequest, ShippingEstimateResponse, ShippingLabelPurchaseRequest, ShippingLabelPurchaseResponse, ShipmentBundle } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BulkLabelDialog } from "./bulk-label-dialog";

interface ShippingDrawerProps {
  order?: IconaOrder;
  bundle?: ShipmentBundle & { orders: IconaOrder[] };
  children: React.ReactNode;
  currentTab?: string;
}

// Use shared type instead of local interface
type ShippingEstimate = ShippingEstimateResponse;

export function ShippingDrawer({ order, bundle, children, currentTab }: ShippingDrawerProps) {
  // Determine if we're dealing with a bundle or individual order
  const isBundle = !!bundle;
  const bundleOrders = bundle?.orders || [];
  const displayOrder = order || (bundleOrders.length > 0 ? bundleOrders[0] : null);
  
  // Early return if no order data available - BEFORE any hooks are called
  if (!displayOrder) {
    return <>{children}</>;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  
  // State for collapsible bundle sections - collapsed by default
  const [bundleSummaryOpen, setBundleSummaryOpen] = useState(false);
  
  // State for label format dialog
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<ShippingEstimate | null>(null);
  
  // Helper function to toggle expanded order states
  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };
  
  // Bundle calculation helpers
  const calculateBundleTotals = () => {
    if (!isBundle || !bundleOrders.length) {
      return { subtotal: 0, tax: 0, shipping: 0, total: 0, itemCount: 0 };
    }
    
    return bundleOrders.reduce((acc, order) => {
      const orderSubtotal = order.items && order.items.length > 0 
        ? order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
        : (order.total || 0) + (order.servicefee || 0);
      
      const orderItemCount = order.items 
        ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) 
        : 1;
      
      // Use total_shipping_cost if available, otherwise fall back to seller_shipping_fee_pay or shipping_fee
      const orderShipping = order.total_shipping_cost ?? order.seller_shipping_fee_pay ?? order.shipping_fee ?? 0;
      
      return {
        subtotal: acc.subtotal + orderSubtotal,
        tax: acc.tax + (order.tax || 0),
        shipping: acc.shipping + orderShipping,
        total: acc.total + orderSubtotal + (order.tax || 0) + orderShipping,
        itemCount: acc.itemCount + orderItemCount
      };
    }, { subtotal: 0, tax: 0, shipping: 0, total: 0, itemCount: 0 });
  };
  
  const getBundleDimensions = () => {
    // For bundles, don't auto-calculate dimensions - use default 12x12x12
    if (!isBundle || !bundleOrders.length) {
      return { length: "0", width: "0", height: "0" };
    }
    
    // Return default dimensions of 12x12x12 for bundles
    return { length: "12", width: "12", height: "12" };
  };
  
  const getBundleWeight = () => {
    if (!isBundle || !bundleOrders.length) {
      return "0";
    }
    
    const totalWeight = bundleOrders.reduce((acc, order) => {
      // Always get weight from order.weight field
      const orderWeight = order.weight ? parseFloat(order.weight.toString()) : 0;
      return acc + orderWeight;
    }, 0);
    
    return totalWeight.toString();
  };
  
  // Helper function to calculate correct subtotal for single orders
  const calculateSubtotal = () => {
    // Calculate subtotal from items if available
    if (displayOrder.items && displayOrder.items.length > 0) {
      const itemsTotal = displayOrder.items.reduce((sum, item) => {
        return sum + ((item.price || 0) * (item.quantity || 1));
      }, 0);
      if (itemsTotal > 0) return itemsTotal;
    }
    // Fall back to order total + service fee
    return (displayOrder.total || 0) + (displayOrder.servicefee || 0);
  };
  
  // Extract real dimensions from order data (giveaway or first item)
  const getRealOrderDimensions = () => {
    // For bundles, use aggregated dimensions
    if (isBundle) {
      return getBundleDimensions();
    }
    
    // Try giveaway dimensions first
    if (displayOrder.giveaway?.length && displayOrder.giveaway?.width && displayOrder.giveaway?.height) {
      return {
        length: displayOrder.giveaway.length,
        width: displayOrder.giveaway.width,
        height: displayOrder.giveaway.height,
      };
    }
    
    // Try first item dimensions
    if (displayOrder.items && displayOrder.items.length > 0) {
      const item = displayOrder.items[0];
      if (item.length && item.width && item.height) {
        return {
          length: item.length,
          width: item.width,
          height: item.height,
        };
      }
    }
    
    // Fallback to reasonable defaults based on order type
    // For giveaways, typically smaller packages
    if (displayOrder.giveaway) {
      return {
        length: "8",
        width: "6", 
        height: "2",
      };
    }
    
    // For other orders, slightly larger default
    return {
      length: "10",
      width: "8", 
      height: "3",
    };
  };
  
  // Extract real weight from order data
  const getRealOrderWeight = () => {
    // For bundles, use aggregated weight
    if (isBundle) {
      return getBundleWeight();
    }
    
    // Always get weight from order.weight field
    if (displayOrder.weight) {
      return displayOrder.weight.toString();
    }
    
    // Fallback to 0 if no weight
    return "0";
  };
  
  // Get the weight unit from order data
  const getWeightUnit = () => {
    return displayOrder.giveaway?.shipping_profile?.scale || "oz";
  };
  
  const [dimensions, setDimensions] = useState(getRealOrderDimensions());
  const [weight, setWeight] = useState(getRealOrderWeight());
  
  // Check if we have valid data for fetching estimates
  const hasValidDimensions = Boolean(dimensions.length && dimensions.width && dimensions.height && weight);
  const shouldAutoFetch = hasValidDimensions && isOpen;

  const { toast } = useToast();
  const queryClient = useQueryClient();


  // Shipping estimates API call - automatically fetch when drawer opens with valid data
  const shippingEstimatesQuery = useQuery({
    queryKey: ['/api/shipping/profiles/estimate/rates', {
      weight,
      length: dimensions.length,
      width: dimensions.width,
      height: dimensions.height,
      product: displayOrder.giveaway?._id || '',
      owner: displayOrder.seller._id,
      customer: displayOrder.customer._id,
      isBundle,
    }],
    queryFn: async () => {
      // Send data in request body instead of query parameters
      const requestData = {
        weight: weight,
        unit: getWeightUnit(),
        product: displayOrder.giveaway?._id || (displayOrder.items?.[0]?.productId?._id) || displayOrder._id,
        update: true,
        owner: displayOrder.seller._id,
        customer: displayOrder.customer._id,
        length: parseFloat(dimensions.length),
        width: parseFloat(dimensions.width),
        height: parseFloat(dimensions.height),
      };

      const response = await fetch(`/api/shipping/profiles/estimate/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shipping estimates: ${response.status}`);
      }
      
      return await response.json() as ShippingEstimateResponse[];
    },
    enabled: shouldAutoFetch, // Automatically fetch when drawer opens with valid data
    retry: 1,
  });

  const estimates = shippingEstimatesQuery.data || [];


  const handleRefreshEstimates = () => {
    // Invalidate and refetch the current query
    queryClient.invalidateQueries({ 
      queryKey: ['/api/shipping/profiles/estimate/rates', {
        weight,
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        product: displayOrder.giveaway?._id || '',
        owner: displayOrder.seller._id,
        customer: displayOrder.customer._id,
        isBundle,
      }] 
    });
    toast({ title: "Refreshing shipping estimates..." });
  };

  // Purchase shipping label mutation
  const purchaseLabelMutation = useMutation({
    mutationFn: async (estimate: ShippingEstimate & { labelFileType?: string }) => {
      const requestData: ShippingLabelPurchaseRequest & { label_file_type?: string } = {
        rate_id: estimate.objectId, // Use objectId from shipping estimate as rate_id
        order: isBundle ? (bundleOrders[0]?.bundleId || displayOrder._id) : displayOrder._id, // Pass the actual bundleId that groups the orders
        isBundle: isBundle, // Explicitly indicate if this is a bundle purchase
        shipping_fee: parseFloat(estimate.price),
        servicelevel: `${estimate.carrier} ${estimate.service}`,
        carrier: estimate.carrier,
        deliveryTime: estimate.deliveryTime,
        label_file_type: estimate.labelFileType, // Add label file type
      };

      const response = await apiRequest('POST', '/api/shipping/profiles/buy/label', requestData);
      return await response.json() as ShippingLabelPurchaseResponse;
    },
    onSuccess: (response, estimate) => {
      if (response.success && response.data) {
        // Immediately open the label for printing
        if (response.data.label_url) {
          window.open(response.data.label_url, '_blank');
        }

        // Refresh logic based on current tab
        if (currentTab === 'all') {
          // If tab is "all", refresh orders
          queryClient.invalidateQueries({ queryKey: ['external-orders'] });
        } else {
          // For other tabs, just refresh bundles
          queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
        }
        
        // Always refresh shipping metrics
        queryClient.invalidateQueries({ queryKey: ['/api/shipping/metrics'] });

        toast({
          title: "Shipping label purchased successfully!",
          description: `${response.data.carrier} ${response.data.service} - $${response.data.cost}\nTracking: ${response.data.tracking_number}`,
        });

        console.log('Label purchase successful:', response.data);
        setIsOpen(false);
      } else {
        toast({
          title: "Label purchase failed",
          description: response.message || "Unable to purchase shipping label",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Label purchase error:', error);
      toast({
        title: "Failed to purchase shipping label",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handlePrintLabel = (estimate: ShippingEstimate) => {
    // Safety check: ensure objectId is present before purchasing
    if (!estimate.objectId || estimate.objectId.trim() === '') {
      toast({
        title: "Cannot purchase label",
        description: "Invalid shipping rate. Please refresh estimates and try again.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedEstimate(estimate);
    setLabelDialogOpen(true);
  };

  const confirmLabelPurchase = (labelFileType: string) => {
    if (!selectedEstimate) return;
    
    // Add labelFileType to the mutation data - note: this may need backend support
    purchaseLabelMutation.mutate({ ...selectedEstimate, labelFileType });
    setLabelDialogOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isBundle ? (
              <>
                <Users size={20} />
                Ship Bundle - {bundleOrders.length} Orders
              </>
            ) : (
              <>
                <Package size={20} />
                Ship Order {displayOrder.invoice || displayOrder._id.slice(-8)}
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {isBundle 
              ? `Manage bundle dimensions, get shipping estimates, and print labels for ${bundleOrders.length} orders`
              : "Manage dimensions, get shipping estimates, and print labels"
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-6">
          {/* Bundle or Order Summary */}
          {isBundle ? (
            <>
              {/* Customer Name at Top - Always Visible */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{displayOrder.customer.firstName} {displayOrder.customer.lastName || ''}</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Bundle Summary */}
              <Collapsible open={bundleSummaryOpen} onOpenChange={setBundleSummaryOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          Bundle Summary
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${bundleSummaryOpen ? 'rotate-180' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Orders in Bundle:</span>
                    <span className="font-medium">{bundleOrders.length} orders</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span>{calculateBundleTotals().itemCount} items</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bundle Subtotal:</span>
                    <span className="font-medium">${calculateBundleTotals().subtotal.toFixed(2)}</span>
                  </div>
                  {calculateBundleTotals().tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bundle Tax:</span>
                      <span>${calculateBundleTotals().tax.toFixed(2)}</span>
                    </div>
                  )}
                  {calculateBundleTotals().shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bundle Shipping:</span>
                      <span>${calculateBundleTotals().shipping.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span className="text-muted-foreground">Bundle Total:</span>
                    <span>${calculateBundleTotals().total.toFixed(2)}</span>
                  </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </>
          ) : (
            /* Single Order Summary */
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{displayOrder.customer.firstName} {displayOrder.customer.lastName || ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items:</span>
                  <span>
                    {displayOrder.giveaway?.name || (displayOrder.items && displayOrder.items.length > 0 ? displayOrder.items[0].productId?.name : 'Unknown Item')} 
                    ({displayOrder.giveaway ? displayOrder.giveaway.quantity : (displayOrder.items ? displayOrder.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 1)} items)
                  </span>
                </div>
                {calculateSubtotal() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{(displayOrder.tax ?? 0) > 0 ? `$${(displayOrder.tax ?? 0).toFixed(2)}` : '—'}</span>
                </div>
                {((displayOrder.seller_shipping_fee_pay ?? displayOrder.shipping_fee ?? 0) > 0) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span>${(displayOrder.seller_shipping_fee_pay ?? displayOrder.shipping_fee ?? 0).toFixed(2)}</span>
                  </div>
                )}
                {(calculateSubtotal() + (displayOrder.tax || 0) + (displayOrder.seller_shipping_fee_pay || displayOrder.shipping_fee || 0)) > 0 && (
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span className="text-muted-foreground">Total:</span>
                    <span>${(calculateSubtotal() + (displayOrder.tax || 0) + (displayOrder.seller_shipping_fee_pay || displayOrder.shipping_fee || 0)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Date:</span>
                  <span>{displayOrder.createdAt ? format(new Date(displayOrder.createdAt), "MMM dd, yyyy") : "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Package Dimensions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator size={16} />
                {isBundle ? 'Bundle' : 'Package'} Dimensions & Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="length" className="text-xs">Length (in)</Label>
                  <Input
                    id="length"
                    value={dimensions.length}
                    onChange={(e) => setDimensions({...dimensions, length: e.target.value})}
                    placeholder="11"
                    data-testid="input-length"
                  />
                </div>
                <div>
                  <Label htmlFor="width" className="text-xs">Width (in)</Label>
                  <Input
                    id="width"
                    value={dimensions.width}
                    onChange={(e) => setDimensions({...dimensions, width: e.target.value})}
                    placeholder="6"
                    data-testid="input-width"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">Height (in)</Label>
                  <Input
                    id="height"
                    value={dimensions.height}
                    onChange={(e) => setDimensions({...dimensions, height: e.target.value})}
                    placeholder="0.25"
                    data-testid="input-height"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="weight" className="text-xs">Weight (oz)</Label>
                <Input
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="1.5"
                  className="mt-1"
                  data-testid="input-weight"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleRefreshEstimates}
                  variant="outline"
                  size="sm"
                  disabled={shippingEstimatesQuery.isLoading}
                  data-testid="button-refresh-estimates"
                >
                  <RefreshCw size={14} className={`mr-1 ${shippingEstimatesQuery.isLoading ? 'animate-spin' : ''}`} />
                  {shippingEstimatesQuery.isLoading ? 'Loading...' : 'Refresh Estimates'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Estimates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck size={16} />
                Shipping Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shippingEstimatesQuery.error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">
                    Failed to fetch shipping estimates: {shippingEstimatesQuery.error.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please check package dimensions and weight, then try again.
                  </p>
                </div>
              )}
              {!hasValidDimensions && estimates.length === 0 && !shippingEstimatesQuery.error && (
                <div className="mb-4 p-3 bg-muted/50 border border-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Enter package dimensions and weight above to automatically calculate shipping costs.
                  </p>
                </div>
              )}
              {hasValidDimensions && !shippingEstimatesQuery.isLoading && estimates.length === 0 && !shippingEstimatesQuery.error && (
                <div className="mb-4 p-3 bg-muted/50 border border-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Loading shipping estimates based on your package dimensions...
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {estimates.map((estimate, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {estimate.carrier}
                        </Badge>
                        <span className="font-medium text-sm">{estimate.service}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {estimate.deliveryTime}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg">${estimate.price}</p>
                      </div>
                      <Button
                        onClick={() => handlePrintLabel(estimate)}
                        disabled={purchaseLabelMutation.isPending}
                        size="sm"
                        data-testid={`button-print-${estimate.carrier.toLowerCase()}-${estimate.service.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <Printer size={14} className="mr-1" />
                        {purchaseLabelMutation.isPending ? 'Purchasing...' : 'Buy Label'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          {(displayOrder.tracking_number || (isBundle && bundleOrders.some(order => order.tracking_number))) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Current Shipping Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isBundle ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Bundle Status</div>
                    {bundleOrders.filter(order => order.tracking_number).map((order, index) => (
                      <div key={order._id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div>
                          <p className="text-sm font-medium">Order #{order.invoice || order._id.slice(-8)}</p>
                          <p className="text-xs text-muted-foreground">
                            Tracking: {order.tracking_number}
                          </p>
                          {((order.seller_shipping_fee_pay ?? order.shipping_fee ?? 0) > 0) && (
                            <p className="text-xs text-muted-foreground">
                              Shipping Cost: ${(order.seller_shipping_fee_pay ?? order.shipping_fee ?? 0).toFixed(2)}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Tracking Number: {displayOrder.tracking_number}</p>
                      {((displayOrder.seller_shipping_fee_pay ?? displayOrder.shipping_fee ?? 0) > 0) && (
                        <p className="text-sm text-muted-foreground">
                          Shipping Cost: ${(displayOrder.seller_shipping_fee_pay ?? displayOrder.shipping_fee ?? 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Badge>{displayOrder.status}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
      
      <BulkLabelDialog
        open={labelDialogOpen}
        onOpenChange={setLabelDialogOpen}
        orderCount={1}
        onConfirm={confirmLabelPurchase}
        isPending={purchaseLabelMutation.isPending}
      />
    </Sheet>
  );
}