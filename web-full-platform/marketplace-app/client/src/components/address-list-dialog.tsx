import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { AddAddressDialog } from './add-address-dialog';
import { MapPin, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface AddressListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddressListDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddressListDialogProps) {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  
  const userId = (user as any)?._id || (user as any)?.id;

  // Fetch all addresses for the user
  const { data: addresses, isLoading, refetch } = useQuery({
    queryKey: [`/api/address/all/${userId}`],
    enabled: !!userId && open,
  });

  const handleEdit = (address: any) => {
    setEditingAddress(address);
    setShowAddDialog(true);
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setShowAddDialog(true);
  };

  const handleAddressSuccess = async () => {
    setShowAddDialog(false);
    await refetch();
    await refreshUserData();
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) return;
    
    setSettingDefaultId(addressId);
    
    try {
      await apiRequest('PATCH', `/api/address/${addressId}`, {
        primary: true,
        userId: userId,
      });

      toast({
        title: "Default Address Set",
        description: "This address is now your default.",
      });

      await refetch();
      await refreshUserData();
    } catch (error: any) {
      console.error('Failed to set default address:', error);
      
      let errorMessage = "Failed to set default address. Please try again.";
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

  const handleDelete = async (addressId: string) => {
    if (!user) return;
    
    setDeletingId(addressId);
    
    try {
      await apiRequest('DELETE', `/api/address/${addressId}`, {});

      toast({
        title: "Address Deleted",
        description: "Your address has been removed.",
      });

      await refetch();
      await refreshUserData();
    } catch (error: any) {
      console.error('Failed to delete address:', error);
      
      let errorMessage = "Failed to delete address. Please try again.";
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

  const addressList = Array.isArray(addresses) ? addresses : [];
  const hasAddresses = addressList.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-addresses">
          <DialogHeader>
            <DialogTitle>Shipping Addresses</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading addresses...</p>
              </div>
            )}

            {/* Addresses */}
            {!isLoading && hasAddresses && addressList.map((addr: any) => (
              <div key={addr._id} className="flex items-start gap-3 border rounded-lg p-4 bg-muted/30">
                <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  {addr.primary && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <p className="font-medium text-sm">Default Address</p>
                    </div>
                  )}
                  <p className="text-sm font-medium">{addr.name || 'Address'}</p>
                  <p className="text-sm text-muted-foreground">
                    {addr.addrress1 || addr.address1}
                  </p>
                  {addr.addrress2 && (
                    <p className="text-sm text-muted-foreground">{addr.addrress2}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {addr.city}, {addr.state} {addr.zipcode || addr.zip}
                  </p>
                  <p className="text-sm text-muted-foreground">{addr.countryCode}</p>
                  {addr.phone && (
                    <p className="text-xs text-muted-foreground mt-1">Phone: {addr.phone}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(addr)}
                      className="h-7 text-xs"
                      data-testid={`button-edit-address-${addr._id}`}
                    >
                      Edit
                    </Button>
                    {!addr.primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(addr._id)}
                        disabled={settingDefaultId === addr._id}
                        className="h-7 text-xs"
                        data-testid={`button-set-default-address-${addr._id}`}
                      >
                        {settingDefaultId === addr._id ? (
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
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(addr._id)}
                  disabled={deletingId === addr._id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  data-testid={`button-delete-address-${addr._id}`}
                >
                  {deletingId === addr._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}

            {!isLoading && !hasAddresses && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No addresses added yet</p>
              </div>
            )}

            {/* Add New Address Link */}
            <button
              onClick={handleAddNew}
              className="text-sm text-primary hover:underline"
              data-testid="link-add-new-address"
            >
              Add new shipping address
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3">
            <Button
              variant="default"
              className="flex-1 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 rounded-full"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-address-list"
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
              data-testid="button-save-address-list"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested Add/Edit Address Dialog */}
      <AddAddressDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleAddressSuccess}
        address={editingAddress}
      />
    </>
  );
}
