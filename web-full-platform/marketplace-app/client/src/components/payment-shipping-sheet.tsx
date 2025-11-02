import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AddPaymentDialog } from './add-payment-dialog';
import { AddAddressDialog } from './add-address-dialog';
import { AddressListDialog } from './address-list-dialog';
import { PaymentMethodListDialog } from './payment-method-list-dialog';
import { useQuery } from '@tanstack/react-query';

interface PaymentShippingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentShippingSheet({
  open,
  onOpenChange,
}: PaymentShippingSheetProps) {
  const { user, refreshUserData } = useAuth();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentListDialog, setShowPaymentListDialog] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showAddressListDialog, setShowAddressListDialog] = useState(false);
  const [hasJustAddedData, setHasJustAddedData] = useState(false);
  
  const userId = (user as any)?.id || (user as any)?._id;
  
  // Fetch default payment method
  const { data: defaultPaymentData, isLoading: isLoadingPayment, refetch: refetchDefaultPayment } = useQuery({
    queryKey: [`/api/users/paymentmethod/default/${userId}`],
    enabled: !!userId && open,
  });
  
  // Fetch default shipping address
  const { data: defaultAddressData, isLoading: isLoadingAddress, refetch: refetchDefaultAddress } = useQuery({
    queryKey: [`/api/address/default/address/${userId}`],
    enabled: !!userId && open,
  });
  
  // Fetch fresh user data when sheet opens
  useEffect(() => {
    if (open) {
      refreshUserData();
      refetchDefaultPayment();
      refetchDefaultAddress();
      // Reset the flag when opening
      setHasJustAddedData(false);
    }
  }, [open]);

  const defaultAddress = (defaultAddressData as any)?.address;
  const hasAddress = !!defaultAddress || !!user?.address;
  
  // Extract default payment method from response (could be wrapped or direct)
  const defaultPaymentMethod = (defaultPaymentData as any)?.data 
    ? (defaultPaymentData as any).data 
    : (defaultPaymentData || null);
  const hasPayment = !!defaultPaymentMethod && !isLoadingPayment;

  // Auto-close sheet only after user adds data AND both are complete
  useEffect(() => {
    if (open && hasJustAddedData && hasAddress && hasPayment) {
      onOpenChange(false);
    }
  }, [hasAddress, hasPayment, open, onOpenChange, hasJustAddedData]);

  const handleAddAddress = () => {
    // If user has an address, show list dialog, otherwise show add dialog
    if (hasAddress) {
      setShowAddressListDialog(true);
    } else {
      setShowAddressDialog(true);
    }
  };

  const handleAddPayment = () => {
    // If user has a payment method, show list dialog, otherwise show add dialog
    if (hasPayment) {
      setShowPaymentListDialog(true);
    } else {
      setShowPaymentDialog(true);
    }
  };

  const handleAddressSuccess = async () => {
    // Refetch user data to show new address
    await refreshUserData();
    // Mark that user just added data (for auto-close logic)
    setHasJustAddedData(true);
    // Keep sheet open, just close the nested dialog
    setShowAddressDialog(false);
    setShowAddressListDialog(false);
  };

  const handlePaymentSuccess = async () => {
    // Refetch user data and default payment method
    await refreshUserData();
    await refetchDefaultPayment();
    // Don't set hasJustAddedData here - it causes immediate auto-close
    // Keep sheet open, just close the nested dialogs
    setShowPaymentDialog(false);
    setShowPaymentListDialog(false);
  };

  // Allow user to close manually, but auto-close when both complete
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
        <SheetContent 
          side="bottom" 
          className="h-auto max-h-[80vh] overflow-y-auto left-0 right-0 lg:left-96 lg:right-72"
          data-testid="sheet-payment-shipping"
        >
          <SheetHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <SheetTitle className="text-lg">
                Payment & Shipping Required
              </SheetTitle>
            </div>
            <SheetDescription className="text-base text-muted-foreground">
              To purchase items in live shows and place bids on auctions, you need to add your payment method and shipping address.
            </SheetDescription>
          </SheetHeader>
        
          <div className="flex flex-col gap-4 mt-6">
            {/* Delivery Method Section */}
            {hasAddress ? (
              <button
                onClick={handleAddAddress}
                className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left w-full"
                data-testid="button-address-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md">
                      <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Delivery Method ✓</h4>
                      <p className="text-sm text-muted-foreground">
                        {(user?.address as any)?.addrress1 || (user?.address as any)?.address1 || 'Address on file'}
                        {user?.address?.city && `, ${user.address.city}`}
                        {user?.address?.state && `, ${user.address.state}`}
                        {user?.address?.zipcode && ` ${user.address.zipcode}`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ) : (
              <button
                onClick={handleAddAddress}
                className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                data-testid="button-add-address"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Delivery Method</h4>
                      <p className="text-sm text-muted-foreground">
                        Add your shipping address
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            )}

            {/* Payment Method Section */}
            {isLoadingPayment ? (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-muted p-2 rounded-md">
                      <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Payment Method</h4>
                      <p className="text-sm text-muted-foreground">
                        Loading payment information...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : hasPayment ? (
              <button
                onClick={handleAddPayment}
                className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left w-full"
                data-testid="button-payment-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-md">
                      <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Payment Method ✓</h4>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const pm = defaultPaymentMethod;
                          if (!pm) return 'Payment method on file';
                          
                          // Try to build a descriptive string from available fields
                          // Check name first (Icona API uses 'name' for card brand like "visa", "mastercard")
                          const brand = pm.name || pm.brand || pm.card_type || pm.type || '';
                          const last4 = pm.last4 || pm.lastFour || pm.last_four || '';
                          
                          // Capitalize first letter of brand name
                          const displayBrand = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : '';
                          
                          if (displayBrand && last4) {
                            return `${displayBrand} ****${last4}`;
                          } else if (last4) {
                            return `Card ****${last4}`;
                          } else if (displayBrand) {
                            return `${displayBrand} card on file`;
                          } else {
                            return 'Payment method on file';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ) : (
              <button
                onClick={handleAddPayment}
                className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                data-testid="button-add-payment"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Payment Method</h4>
                      <p className="text-sm text-muted-foreground">
                        Add your payment information
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            )}

            {(!hasAddress || !hasPayment) && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Add both delivery and payment methods to bid or buy items
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Address Dialog (for adding new address) */}
      <AddAddressDialog
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        onSuccess={handleAddressSuccess}
      />

      {/* Address List Dialog (for viewing/editing existing addresses) */}
      <AddressListDialog
        open={showAddressListDialog}
        onOpenChange={setShowAddressListDialog}
        onSuccess={handleAddressSuccess}
      />

      {/* Payment Dialog */}
      <AddPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSuccess={handlePaymentSuccess}
      />

      {/* Payment List Dialog (for viewing/editing existing payment methods) */}
      <PaymentMethodListDialog
        open={showPaymentListDialog}
        onOpenChange={setShowPaymentListDialog}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
