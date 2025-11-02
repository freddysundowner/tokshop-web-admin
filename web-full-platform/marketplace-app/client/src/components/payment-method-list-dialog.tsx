import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { AddPaymentDialog } from './add-payment-dialog';
import { CreditCard, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface PaymentMethodListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentMethodListDialog({
  open,
  onOpenChange,
  onSuccess,
}: PaymentMethodListDialogProps) {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  
  const userId = (user as any)?.id || (user as any)?._id;
  
  // Fetch all payment methods
  const { data: paymentMethods, isLoading, refetch } = useQuery({
    queryKey: [`/api/users/paymentmethod/${userId}`],
    enabled: !!userId && open,
  });
  
  // Refetch payment methods every time the dialog opens
  useEffect(() => {
    if (open && userId) {
      refetch();
    }
  }, [open, userId, refetch]);

  const handleAddNew = () => {
    setShowAddDialog(true);
  };

  const handlePaymentSuccess = async () => {
    setShowAddDialog(false);
    await refetch(); // Refresh payment methods list
    await refreshUserData();
    // Don't call onSuccess here - it would close the payment methods dialog
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    if (!user) return;
    
    setSettingDefaultId(paymentMethodId);
    
    try {
      await apiRequest('PUT', '/stripe/default', {
        paymentMethodId,
        userid: userId,
      });

      toast({
        title: "Default Payment Set",
        description: "This payment method is now your default.",
      });

      await refetch(); // Refresh payment methods list
      await refreshUserData();
    } catch (error: any) {
      console.error('Failed to set default payment method:', error);
      
      let errorMessage = "Failed to set default payment method. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!user) return;
    
    setDeletingId(paymentMethodId);
    
    try {
      await apiRequest('DELETE', '/stripe/remove', {
        paymentMethodId,
        userid: userId,
      });

      toast({
        title: "Payment Method Deleted",
        description: "Your payment method has been removed.",
      });

      await refetch(); // Refresh payment methods list
      await refreshUserData();
      // Don't call onSuccess here - keep dialog open after deletion
    } catch (error: any) {
      console.error('Failed to delete payment method:', error);
      
      let errorMessage = "Failed to delete payment method. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const methods = Array.isArray(paymentMethods) ? paymentMethods : [];
  const hasPayment = methods.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-payment-methods">
          <DialogHeader>
            <DialogTitle>Payment Methods</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading payment methods...</p>
              </div>
            )}

            {/* Payment Methods */}
            {!isLoading && hasPayment && methods.map((pm: any) => (
              <div key={pm._id} className="flex items-start gap-3 border rounded-lg p-4 bg-muted/30">
                <CreditCard className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  {pm.primary && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <p className="font-medium text-sm">Default Payment</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const brand = pm.name || pm.brand || pm.card_type || pm.type || '';
                      const last4 = pm.last4 || pm.lastFour || pm.last_four || '';
                      
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
                  {pm.expiry && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires {pm.expiry}
                    </p>
                  )}
                  {!pm.primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(pm._id)}
                      disabled={settingDefaultId === pm._id}
                      className="mt-2 h-7 text-xs"
                      data-testid={`button-set-default-${pm._id}`}
                    >
                      {settingDefaultId === pm._id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Setting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Set as Default
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(pm._id)}
                  disabled={deletingId === pm._id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  data-testid={`button-delete-payment-${pm._id}`}
                >
                  {deletingId === pm._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}

            {!isLoading && !hasPayment && (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No payment methods added yet</p>
              </div>
            )}

            {/* Add New Payment Method Link */}
            <button
              onClick={handleAddNew}
              className="text-sm text-primary hover:underline"
              data-testid="link-add-new-payment"
            >
              Add new payment method
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3">
            <Button
              variant="default"
              className="flex-1 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 rounded-full"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-payment-list"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500 dark:bg-yellow-400 dark:text-black dark:hover:bg-yellow-500 rounded-full"
              onClick={() => {
                onOpenChange(false);
                if (onSuccess) onSuccess();
              }}
              data-testid="button-save-payment-list"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested Add Payment Dialog */}
      <AddPaymentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
