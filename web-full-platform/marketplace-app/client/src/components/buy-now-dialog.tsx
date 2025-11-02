import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  MapPin, 
  Plus, 
  Minus, 
  ChevronRight,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

interface BuyNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onOpenPaymentMethods?: () => void;
  onOpenShippingAddresses?: () => void;
}

export function BuyNowDialog({ 
  open, 
  onOpenChange, 
  product,
  onOpenPaymentMethods,
  onOpenShippingAddresses
}: BuyNowDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [isQuantityExpanded, setIsQuantityExpanded] = useState(false);

  const availableStock = product?.quantity || 1;
  const showQuantityControls = availableStock > 1;

  const userId = (user as any)?._id || (user as any)?.id || user?.id;

  // Fetch default payment method
  const { data: defaultPaymentData } = useQuery({
    queryKey: [`/api/users/paymentmethod/default/${userId}`],
    enabled: open && !!userId,
  });

  // Extract payment method - API may return it wrapped in .data or directly
  const defaultPayment = (defaultPaymentData as any)?.data 
    ? (defaultPaymentData as any).data 
    : (defaultPaymentData || null);
  
  // Use address directly from user context (already loaded on login)
  const defaultAddress = user?.address;

  // Fetch shipping estimate with proper parameters
  const { data: shippingEstimate, isLoading: isLoadingShipping } = useQuery({
    queryKey: ['/api/shipping/estimate', product?._id, quantity, defaultAddress?.id],
    queryFn: async () => {
      if (!product?.shipping_profile || !defaultAddress) {
        return { amount: '0.00' };
      }

      const userId = (user as any)?._id || (user as any)?.id || user?.id;
      const productId = product._id || product.id;
      
      // Extract owner ID - could be object or string
      let ownerId = '';
      if (typeof product.owner === 'string') {
        ownerId = product.owner;
      } else if (product.owner) {
        ownerId = product.owner._id || product.owner.id || '';
      }
      // Fallback: try to get from ownerId field directly
      if (!ownerId && product.ownerId) {
        ownerId = typeof product.ownerId === 'string' 
          ? product.ownerId 
          : (product.ownerId._id || product.ownerId.id || '');
      }
      
      return await apiRequest('POST', '/api/shipping/estimate', {
        weight: product.shipping_profile.weight,
        unit: product.shipping_profile.scale || 'oz',
        product: productId,
        owner: ownerId,
        customer: userId,
        tokshow: product.tokshow,
        buying_label: true
      });
    },
    enabled: open && !!product?.shipping_profile?.weight && !!defaultAddress && !!user,
  });

  // Fetch tax estimate
  const { data: taxEstimate, isLoading: isLoadingTax } = useQuery({
    queryKey: ['/api/tax/estimate', product?.id, quantity],
    enabled: open && !!product?.id,
  });

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setIsQuantityExpanded(false);
    }
  }, [open]);

  const incrementQuantity = () => {
    if (quantity < availableStock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const subtotal = (product?.price || 0) * quantity;
  const shippingCost = parseFloat((shippingEstimate as any)?.amount || '0');
  const taxAmount = parseFloat((taxEstimate as any)?.tax || '0');
  const total = subtotal + shippingCost + taxAmount;

  const buyNowMutation = useMutation({
    mutationFn: async () => {
      // Build payload matching Flutter implementation
      const productId = product._id || product.id;
      
      // Extract seller/owner ID - could be object or string
      let sellerId = '';
      if (typeof product.owner === 'string') {
        sellerId = product.owner;
      } else if (product.owner) {
        sellerId = product.owner._id || product.owner.id || '';
      }
      // Fallback: try to get from ownerId field directly
      if (!sellerId && product.ownerId) {
        sellerId = typeof product.ownerId === 'string' 
          ? product.ownerId 
          : (product.ownerId._id || product.ownerId.id || '');
      }
      
      const payload = {
        product: productId,
        status: 'processing',
        shippingFee: parseFloat((shippingEstimate as any)?.amount || '0'),
        servicelevel: (shippingEstimate as any)?.servicelevel || '',
        rate_id: (shippingEstimate as any)?.rate_id || '',
        bundleId: (shippingEstimate as any)?.bundleId || '',
        totalWeightOz: parseFloat((shippingEstimate as any)?.totalWeightOz || '0'),
        seller_shipping_fee_pay: parseFloat((shippingEstimate as any)?.seller_shipping_fee_pay || '0'),
        subtotal: subtotal,
        tax: parseFloat(taxAmount.toString() || '0'),
        seller: sellerId,
        buyer: userId,
        quantity: quantity,
        total: parseFloat(total.toFixed(2)),
        color: '',
        size: '',
        tokshow: product.tokshow || '',
      };
      
      // POST to /api/orders/:id endpoint (matching Flutter)
      return await apiRequest('POST', `/api/orders/${productId}`, payload);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Purchase Successful!",
        description: "Your order has been placed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.error || error?.message || "Failed to complete purchase";
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleBuyNow = () => {
    // Validation checks matching Flutter
    if (!defaultPayment) {
      toast({
        title: "No Payment Method",
        description: "Please add a payment method first",
        variant: "destructive",
      });
      return;
    }
    if (!defaultAddress) {
      toast({
        title: "No Address",
        description: "Please add a shipping address first",
        variant: "destructive",
      });
      return;
    }
    if (quantity > availableStock) {
      toast({
        title: "Quantity Error",
        description: "Quantity exceeds available stock",
        variant: "destructive",
      });
      return;
    }
    buyNowMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Buy Now</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Product Section */}
          <div className="flex gap-4">
            {product?.images?.[0] && (
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-base leading-tight mb-1">{product?.name}</h3>
              {availableStock > 0 && (
                <p className="text-sm text-zinc-400">{availableStock} available</p>
              )}
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Quantity Section */}
          {showQuantityControls && (
            <>
              <div>
                <button
                  onClick={() => setIsQuantityExpanded(!isQuantityExpanded)}
                  className="w-full flex items-center justify-between py-2 text-sm"
                  data-testid="button-toggle-quantity"
                >
                  <span className="font-medium">Quantity: {quantity}</span>
                  <ChevronRight className={`h-4 w-4 text-zinc-400 transition-transform ${isQuantityExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isQuantityExpanded && (
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      data-testid="button-decrement-quantity"
                    >
                      <Minus className="h-4 w-4" style={{ color: 'white', stroke: 'white' }} />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-lg font-bold">{quantity}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                      onClick={incrementQuantity}
                      disabled={quantity >= availableStock}
                      data-testid="button-increment-quantity"
                    >
                      <Plus className="h-4 w-4" style={{ color: 'white', stroke: 'white' }} />
                    </Button>
                  </div>
                )}
              </div>
              <Separator className="bg-zinc-800" />
            </>
          )}

          {/* Payment Method */}
          <div>
            <p className="text-sm font-semibold mb-2">Payment Method</p>
            <button
              onClick={onOpenPaymentMethods}
              className="w-full flex items-center justify-between py-3 hover:bg-zinc-800/50 rounded-lg px-2 transition-colors"
              data-testid="button-payment-method"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-zinc-400" />
                {defaultPayment ? (
                  <div className="text-left">
                    <p className="text-sm">{defaultPayment.brand?.toUpperCase()} •••• {defaultPayment.last4}</p>
                    {defaultPayment.exp_month && defaultPayment.exp_year && (
                      <p className="text-xs text-zinc-400">
                        Expires {String(defaultPayment.exp_month).padStart(2, '0')}/{defaultPayment.exp_year}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-400">Add payment method</span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Shipping Address */}
          <div>
            <p className="text-sm font-semibold mb-2">Shipping Address</p>
            <button
              onClick={onOpenShippingAddresses}
              className="w-full flex items-center justify-between py-3 hover:bg-zinc-800/50 rounded-lg px-2 transition-colors"
              data-testid="button-shipping-address"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-zinc-400" />
                {defaultAddress ? (
                  <div className="text-left">
                    <p className="text-sm">
                      {(defaultAddress as any)?.addrress1 || (defaultAddress as any)?.address1 || 'Address on file'}
                      {defaultAddress.city && `, ${defaultAddress.city}`}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {defaultAddress.state && `${defaultAddress.state} `}
                      {defaultAddress.zipcode}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-zinc-400">Add shipping address</span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Price Breakdown */}
          <div className="space-y-2 bg-zinc-800/30 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Shipping</span>
              {isLoadingShipping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-medium">${shippingCost.toFixed(2)}</span>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Tax</span>
              {isLoadingTax ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-medium">${taxAmount.toFixed(2)}</span>
              )}
            </div>
            <Separator className="bg-zinc-700 my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Buy Now Button */}
          <Button
            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleBuyNow}
            disabled={buyNowMutation.isPending || !defaultPayment || !defaultAddress}
            data-testid="button-confirm-buy-now"
          >
            {buyNowMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Buy Now - $${total.toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
