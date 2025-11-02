import { useState } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, HelpCircle, Package, X, Truck, Info } from "lucide-react";
import type { IconaOrder } from "@shared/schema";
import { formatCurrency, calculateOrderSubtotal } from "@shared/pricing";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getOrCreateChat } from "@/lib/firebase-chat";
import { useSettings } from "@/lib/settings-context";

interface OrderDetailsDrawerProps {
  order: IconaOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelOrder?: (orderId: string) => void;
  onViewShipment?: (order: IconaOrder) => void;
  onMessageBuyer?: (order: IconaOrder) => void;
  cancelLoading?: boolean;
}

export function OrderDetailsDrawer({
  order,
  open,
  onOpenChange,
  onCancelOrder,
  onViewShipment,
  onMessageBuyer,
  cancelLoading = false,
}: OrderDetailsDrawerProps) {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [messagingLoading, setMessagingLoading] = useState(false);

  if (!order) return null;

  // Get product details
  const product = order.items?.[0]?.productId;
  const productImage = product?.images?.[0] || order.giveaway?.images?.[0] || "";
  const productName = product?.name || order.giveaway?.name || "Product";
  const category = product?.category?.name || order.giveaway?.category?.name || "N/A";
  const isGiveaway = !!order.giveaway || order.ordertype === 'giveaway';
  
  // Financial calculations - calculate from items
  const price = calculateOrderSubtotal(order);
  const tax = order.tax || 0;
  const shippingFee = order.shipping_fee || 0;
  const orderTotal = price + tax + shippingFee;
  
  // Seller earnings calculations - use commission rate from settings
  const commissionRate = settings.commission_rate || 0; // Get from settings API (uses 'commision' key)
  const serviceFee = (price * commissionRate) / 100;
  const sellerShippingCost = order.seller_shipping_fee_pay || 0;
  
  // Payment processing fee - calculated as 2.9% + $0.30 for display purposes
  // This is a standard Stripe rate, shown for transparency
  const processingFeeRate = 2.9;
  const processingFeeFixed = 0.30;
  const processingFee = (orderTotal * (processingFeeRate / 100)) + processingFeeFixed;
  
  // Net earnings - actual revenue after all fees
  const netEarnings = price - serviceFee - processingFee - sellerShippingCost;
  
  // Status badge
  const getStatusBadge = () => {
    const status = order.status || "processing";
    const statusColors: Record<string, string> = {
      processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      ended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    
    const displayText = order.label ? "Label Created" : status.charAt(0).toUpperCase() + status.slice(1);
    
    return (
      <Badge className={statusColors[status] || statusColors.processing} data-testid="badge-order-status">
        {displayText}
      </Badge>
    );
  };
  
  // Format date
  const orderDate = order.date ? new Date(order.date) : order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedDate = format(orderDate, 'dd MMM yyyy');
  const formattedTime = format(orderDate, 'h:mm a');
  
  // Buyer name
  const buyerName = order.customer?.userName || 
                   `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 
                   'Unknown';

  // Handle message buyer button click
  const handleMessageBuyer = async () => {
    const buyerId = order.customer?._id;
    const currentUserId = (currentUser as any)?._id || (currentUser as any)?.id;
    
    if (!buyerId || !currentUserId) {
      toast({
        title: "Error",
        description: "Unable to start chat. User information is missing.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setMessagingLoading(true);
      
      const currentUserData = {
        firstName: (currentUser as any)?.firstName || '',
        lastName: (currentUser as any)?.lastName || '',
        userName: (currentUser as any)?.userName || '',
        profilePhoto: (currentUser as any)?.profilePhoto || ''
      };
      
      const buyerData = {
        firstName: order.customer?.firstName || '',
        lastName: order.customer?.lastName || '',
        userName: order.customer?.userName || '',
        profilePhoto: order.customer?.profilePhoto || ''
      };
      
      const chatId = await getOrCreateChat(
        currentUserId,
        buyerId,
        currentUserData,
        buyerData
      );
      
      setLocation(`/inbox/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to open chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMessagingLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-order-details">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">Order</SheetTitle>
              <SheetDescription className="text-lg text-muted-foreground mt-1" data-testid="text-order-id">
                #{order.invoice || order._id.slice(-8)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Order Status Badge */}
          <div>
            {getStatusBadge()}
          </div>

          {/* Items List */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Items</h3>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => {
                  const itemProduct = item.productId;
                  const itemImage = itemProduct?.images?.[0] || "";
                  const itemName = itemProduct?.name || "Product";
                  
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex gap-3 items-center">
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {itemImage ? (
                            <img 
                              src={itemImage} 
                              alt={itemName}
                              className="w-full h-full object-cover"
                              data-testid={`img-product-${idx}`}
                            />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground" data-testid={`text-product-name-${idx}`}>
                            {itemName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity || 1} × {formatCurrency(item.price || 0)}
                          </p>
                        </div>
                        {/* Video receipt inline - only for non-giveaway */}
                        {!isGiveaway && (
                          <button 
                            className="text-xs text-primary font-medium whitespace-nowrap"
                            data-testid={`button-view-receipt-${idx}`}
                          >
                            View receipt
                          </button>
                        )}
                      </div>
                      {idx < (order.items?.length || 0) - 1 && <Separator />}
                    </div>
                  );
                })
              ) : order.giveaway ? (
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {order.giveaway.images?.[0] ? (
                      <img 
                        src={order.giveaway.images[0]} 
                        alt={order.giveaway.name}
                        className="w-full h-full object-cover"
                        data-testid="img-product-giveaway"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground" data-testid="text-product-name-giveaway">
                      {order.giveaway.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Giveaway Item
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Message Buyer */}
          <button
            onClick={handleMessageBuyer}
            disabled={messagingLoading}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-message-buyer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-foreground" />
              </div>
              <span className="font-medium text-foreground">
                {messagingLoading ? "Loading..." : "Message the buyer"}
              </span>
            </div>
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Get Help */}
          {/* <button
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            data-testid="button-get-help"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-foreground" />
              </div>
              <span className="font-medium text-foreground">Get help with this order</span>
            </div>
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button> */}

          {/* Shipment Information */}
          {(order.tracking_number || order.label) && (
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <p className="font-medium text-foreground mb-3">
                This order is attached to a shipment.
              </p>
              {order.tracking_number && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Shipment</span>
                  <span className="text-primary font-medium" data-testid="text-tracking-number">
                    #{order.tracking_number}
                  </span>
                </div>
              )}
              {order.customer?.address && (
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Ship to</span>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{order.customer.address.addrress1}</p>
                    <p className="text-muted-foreground">
                      {order.customer.address.city}, {order.customer.address.state} {order.customer.address.zipcode}
                    </p>
                  </div>
                </div>
              )}
              {onViewShipment && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onViewShipment(order)}
                  data-testid="button-view-shipment"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  View Shipment
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Order Details */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Order details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order date</span>
                <span className="text-foreground" data-testid="text-order-date">{formattedDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order time</span>
                <span className="text-foreground" data-testid="text-order-time">{formattedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Buyer</span>
                <span className="text-primary font-medium" data-testid="text-buyer-name">{buyerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="text-foreground" data-testid="text-category">{category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span className="text-foreground" data-testid="text-quantity">{order.items?.[0]?.quantity || 1}</span>
              </div>
              {/* Show name - from tokshow field */}
              {order.tokshow && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Show</span>
                  <span className="text-foreground">{order.tokshow.title || order.tokshow.name || order.tokshow._id}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Buyer Paid */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Buyer paid</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="text-foreground" data-testid="text-price">{formatCurrency(price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes paid by buyer</span>
                <span className="text-foreground" data-testid="text-tax">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping paid by buyer</span>
                <span className="text-foreground" data-testid="text-shipping-fee">{formatCurrency(shippingFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Order total</span>
                <span data-testid="text-order-total">{formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Your Earnings - Only show for non-giveaway orders */}
          {!isGiveaway ? (
            <div>
              <h3 className="font-semibold text-lg mb-4">Your earnings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Earnings became available for payout on {format(new Date(orderDate.getTime() + 86400000), 'dd MMM yyyy')}.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="text-foreground">{formatCurrency(price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Commission</p>
                    <p className="text-xs text-muted-foreground">({commissionRate.toFixed(1)}% of sale price)</p>
                  </div>
                  <span className="text-foreground">-{formatCurrency(serviceFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <p className="text-muted-foreground">Payment Processing Fee</p>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">-{formatCurrency(processingFee)}</span>
                </div>
                <div className="text-xs text-muted-foreground ml-0">
                  ({processingFeeRate}% of order total + ${processingFeeFixed.toFixed(2)})
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">-{formatCurrency(sellerShippingCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Net earnings</span>
                  <span data-testid="text-net-earnings">{formatCurrency(netEarnings)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-lg mb-4">Giveaway Item</h3>
              <p className="text-sm text-muted-foreground">
                This is a giveaway item. No payment was collected and there are no earnings for this order.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {onCancelOrder && 
             order.status !== "cancelled" && 
             order.status !== "delivered" && 
             order.status !== "shipped" &&
             !order.tracking_number && 
             !(order as any).tracking_url && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onCancelOrder(order._id)}
                disabled={cancelLoading}
                data-testid="button-cancel-order"
              >
                {cancelLoading ? "Cancelling..." : "Cancel order"}
              </Button>
            )}
            {onViewShipment && (order.tracking_number || order.label) && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onViewShipment(order)}
                data-testid="button-view-shipment-footer"
              >
                <Truck className="w-4 h-4 mr-2" />
                View Shipment
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
