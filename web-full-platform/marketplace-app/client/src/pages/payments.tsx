import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Plus, 
  Check, 
  Trash2,
  MoreVertical 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { AddPaymentDialog } from "@/components/add-payment-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface PaymentMethod {
  _id: string;
  id?: string;
  name?: string;
  brand?: string;
  card_type?: string;
  type?: string;
  last4?: string;
  lastFour?: string;
  last_four?: string;
  expiry?: string;
  exp_month?: number;
  exp_year?: number;
  primary?: boolean;
}

export default function Payments() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch payment methods
  const userId = (user as any)?.id || (user as any)?._id;
  
  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: [`/users/paymentmethod/${userId}`],
    enabled: !!userId,
  });

  // Get default payment method ID from user object
  const defaultPaymentMethodId = (user as any)?.defaultpaymentmethod?._id || (user as any)?.defaultpaymentmethod;

  // Mutation to set default payment method
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return await apiRequest("PUT", "/stripe/default", {
        userid: user?.id,
        paymentMethodId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/users/paymentmethod/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      toast({
        title: "Default payment method updated",
        description: "Your default payment method has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update default payment method",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to remove payment method
  const removeMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return await apiRequest("DELETE", "/stripe/remove", {
        paymentMethodId,
        userid: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/users/paymentmethod/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      toast({
        title: "Payment method removed",
        description: "The payment method has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove payment method",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSetDefault = (paymentMethodId: string) => {
    setDefaultMutation.mutate(paymentMethodId);
  };

  const handleRemove = (paymentMethodId: string) => {
    removeMutation.mutate(paymentMethodId);
  };

  const getCardBrandName = (method: PaymentMethod): string => {
    const brand = method.name || method.brand || method.card_type || method.type || '';
    const brandMap: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
    };
    return brandMap[brand.toLowerCase()] || (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card');
  };
  
  const getCardLast4 = (method: PaymentMethod): string => {
    return method.last4 || method.lastFour || method.last_four || '****';
  };
  
  const getCardExpiry = (method: PaymentMethod): string => {
    if (method.expiry) return method.expiry;
    if (method.exp_month && method.exp_year) {
      return `${String(method.exp_month).padStart(2, '0')}/${method.exp_year}`;
    }
    return '';
  };

  const handleAddSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [`/users/paymentmethod/${userId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-page-title">
              Payment Methods
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your saved payment methods
            </p>
          </div>
          <Button 
            onClick={() => setAddDialogOpen(true)} 
            data-testid="button-add-card" 
            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </div>

        {/* Saved Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Cards</CardTitle>
            <CardDescription>
              Your saved payment methods for quick checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading payment methods...</p>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground" data-testid="text-no-cards">No payment methods saved</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a card to get started
                </p>
              </div>
            ) : (
              paymentMethods.map((method, index) => {
                const isDefault = method.primary || method._id === defaultPaymentMethodId || method.id === defaultPaymentMethodId;
                const cardBrand = getCardBrandName(method);
                const cardLast4 = getCardLast4(method);
                const cardExpiry = getCardExpiry(method);
                
                return (
                  <div key={method._id || method.id}>
                    <div className="flex items-center justify-between py-4 gap-2">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="h-10 w-14 sm:h-12 sm:w-16 rounded-md border border-border flex items-center justify-center bg-muted flex-shrink-0">
                          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground text-sm sm:text-base truncate" data-testid={`text-card-${method._id || method.id}`}>
                              {cardBrand} •••• {cardLast4}
                            </p>
                            {isDefault && (
                              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" data-testid={`badge-default-${method._id || method.id}`}>
                                <Check className="h-3 w-3" />
                                Default
                              </div>
                            )}
                          </div>
                          {cardExpiry && (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Expires {cardExpiry}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-menu-${method._id || method.id}`} 
                            className="flex-shrink-0"
                            disabled={setDefaultMutation.isPending || removeMutation.isPending}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isDefault && (
                            <DropdownMenuItem 
                              onClick={() => handleSetDefault(method._id || method.id || '')}
                              data-testid={`button-set-default-${method._id || method.id}`}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleRemove(method._id || method.id || '')}
                            className="text-destructive"
                            data-testid={`button-remove-${method._id || method.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {index < paymentMethods.length - 1 && <Separator />}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Secure payments</p>
                <p className="text-sm text-muted-foreground">
                  Your payment information is encrypted and securely stored. We never store your full card details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Dialog */}
      <AddPaymentDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
