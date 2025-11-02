import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AddPaymentDialog } from './add-payment-dialog';
import { AddAddressDialog } from './add-address-dialog';

interface PaymentShippingAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentShippingAlertDialog({
  open,
  onOpenChange,
}: PaymentShippingAlertDialogProps) {
  const { user } = useAuth();
  const userData = user as any;
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  
  const hasAddress = !!userData?.address;
  const hasPayment = !!userData?.defaultpaymentmethod;

  const handleAddAddress = () => {
    // Open address dialog instead of navigating
    setShowAddressDialog(true);
  };

  const handleAddPayment = () => {
    // Open payment dialog instead of navigating
    setShowPaymentDialog(true);
  };

  const handleAddressSuccess = () => {
    // Refresh user data or refetch to show new address
    // For now, just close dialogs
    setShowAddressDialog(false);
    onOpenChange(false);
  };

  const handlePaymentSuccess = () => {
    // Refresh user data or refetch to show new payment method
    // For now, just close dialogs
    setShowPaymentDialog(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-payment-shipping-alert">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <DialogTitle className="text-lg">
                Payment & Shipping Required
              </DialogTitle>
            </div>
            <DialogDescription className="text-base text-muted-foreground">
              To purchase items in live shows and place bids on auctions, you need to add your payment method and shipping address.
            </DialogDescription>
          </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-4">
          {/* Delivery Method Section */}
          {hasAddress ? (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">Delivery Method</h4>
                    <p className="text-sm text-muted-foreground">
                      {userData.address.addrress1 || 'Address on file'}
                      {userData.address.city && `, ${userData.address.city}`}
                      {userData.address.state && `, ${userData.address.state}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddAddress}
                  data-testid="button-edit-address"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
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
          {hasPayment ? (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">Payment Method</h4>
                    <p className="text-sm text-muted-foreground">
                      {userData.defaultpaymentmethod.name || 'Payment method'} - 
                      {userData.defaultpaymentmethod.last4 && ` ****${userData.defaultpaymentmethod.last4}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddPayment}
                  data-testid="button-edit-payment"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
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
        </div>
      </DialogContent>
    </Dialog>

      {/* Address Dialog */}
      <AddAddressDialog
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        onSuccess={handleAddressSuccess}
      />

      {/* Payment Dialog */}
      <AddPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
