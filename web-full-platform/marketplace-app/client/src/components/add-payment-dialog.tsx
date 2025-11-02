import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Card Form Component (uses Stripe hooks)
function CardForm({ onSuccess, onClose }: { onSuccess?: () => void; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsLoading(true);

    try {
      const userData = user as any;
      const userEmail = userData.email;
      
      if (!userEmail) {
        throw new Error('User email not found. Please contact support.');
      }

      // Step 1: Create setup intent and get clientSecret and customer_id
      const setupResponse = await apiRequest('POST', '/stripe/setupitent', {
        email: userEmail,
      });

      const setupData = await setupResponse.json();
      const { clientSecret, customer_id } = setupData;
      
      if (!clientSecret) {
        throw new Error('Failed to initialize payment setup. Please try again.');
      }

      if (!customer_id) {
        throw new Error('Customer ID not found. Please contact support.');
      }

      // Step 2: Confirm card setup with Stripe
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!setupIntent || !setupIntent.payment_method) {
        throw new Error('Failed to set up payment method');
      }

      // Step 3: Save payment method to backend
      // Note: methodid is only passed when editing/replacing an existing payment method
      // When adding a new payment method, we don't pass methodid
      const existingPaymentMethodId = (userData.defaultpaymentmethod as any)?._id;
      
      const savePayload: any = {
        customer_id,
        userid: userData.id || userData._id,
      };
      
      // Only include methodid when replacing an existing payment method
      if (existingPaymentMethodId) {
        savePayload.methodid = existingPaymentMethodId;
      }

      await apiRequest('POST', '/stripe/savepaymentmethod', savePayload);

      toast({
        title: "Card Added",
        description: "Your payment method has been saved successfully.",
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to add payment method:', error);
      
      let errorMessage = "Failed to add payment method. Please try again.";
      if (error?.text) {
        try {
          const errorData = JSON.parse(error.text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          if (typeof error.text === 'string') {
            errorMessage = error.text;
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Card Details</label>
          <div className="border rounded-md p-3 bg-background">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: 'hsl(var(--foreground))',
                    '::placeholder': {
                      color: 'hsl(var(--muted-foreground))',
                    },
                  },
                  invalid: {
                    color: 'hsl(var(--destructive))',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          data-testid="button-cancel"
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          data-testid="button-add-card"
          className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          {isLoading ? "Adding..." : "Add Card"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentDialogProps) {
  const { settings } = useSettings();
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Initialize Stripe when publishable key is available
  useEffect(() => {
    if (settings.stripe_publishable_key) {
      setStripePromise(loadStripe(settings.stripe_publishable_key));
    }
  }, [settings.stripe_publishable_key]);

  const elementsOptions: StripeElementsOptions = {
    mode: 'setup',
    currency: 'usd',
    appearance: {
      theme: 'stripe',
    },
  };

  // Check if Stripe is configured
  const isStripeConfigured = settings.stripe_publishable_key && settings.stripe_publishable_key.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-payment">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Enter your card details to add a new payment method.
          </DialogDescription>
        </DialogHeader>
        {!isStripeConfigured ? (
          <div className="py-8 px-4 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-destructive"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Payment System Not Configured</h3>
              <p className="text-sm text-muted-foreground">
                Stripe payment processing is not configured. Please contact the administrator to set up payment processing.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-close"
                className="w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : stripePromise ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CardForm onSuccess={onSuccess} onClose={() => onOpenChange(false)} />
          </Elements>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Loading payment form...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
