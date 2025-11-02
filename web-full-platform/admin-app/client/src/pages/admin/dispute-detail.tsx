import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, AlertTriangle, Package, User, ShoppingCart, Scale, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Dispute {
  _id: string;
  orderId: {
    _id: string;
    tax: number;
    customer?: string;  // Customer ID as string
    seller?: string;    // Seller ID as string
    items: Array<{
      _id: string;
      price: number;
      quantity?: number;
      productId: {
        _id: string;
        name: string;
        images?: string[];
      };
    }>;
    shipping_fee: number;
  };
  seller_response: string;
  userId: {
    _id: string;
    userName: string;
    email?: string;
  };
  status: string;
  reason: string;
  details: string;
  createdAt?: string;
  __v: number;
}

export default function AdminDisputeDetail() {
  const [, params] = useRoute("/admin/disputes/:disputeId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const disputeId = params?.disputeId;

  const [adminNotes, setAdminNotes] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<"buyer" | "seller" | null>(null);

  // Fetch dispute details
  const { data: disputeData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/disputes', disputeId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dispute');
      }
      return await response.json();
    },
    enabled: !!disputeId,
  });

  const dispute: Dispute | undefined = disputeData?.data;

  // Resolve dispute mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ decision }: { decision: "buyer" | "seller" }) => {
      if (!dispute || !dispute.orderId) throw new Error("Dispute data not available");
      
      // Get the favored user ID from orderId object
      let favoredId: string;
      if (decision === "buyer") {
        // Customer ID is directly in orderId.customer
        favoredId = dispute.orderId.customer || "";
      } else {
        // Seller ID is directly in orderId.seller
        favoredId = dispute.orderId.seller || "";
      }
      
      if (!favoredId) {
        throw new Error(`Could not find ${decision} ID in order data`);
      }
      
      // Use dispute._id, not the orderId from URL params
      return apiRequest("POST", `/api/admin/disputes/${dispute._id}/resolve`, {
        favored: favoredId,
        final_comments: adminNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/disputes'] });
      toast({
        title: "Success",
        description: "Dispute resolved successfully",
      });
      setLocation("/admin/disputes");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve dispute",
        variant: "destructive",
      });
    },
  });

  const handleResolve = (decision: "buyer" | "seller") => {
    setSelectedDecision(decision);
    setShowResolveDialog(true);
  };

  const confirmResolve = () => {
    if (selectedDecision) {
      resolveMutation.mutate({ decision: selectedDecision });
      setShowResolveDialog(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'under_review':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getReasonDisplay = (reason: string) => {
    return reason?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'N/A';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dispute...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!dispute) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Dispute not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/admin/disputes")}
              data-testid="button-back-to-disputes"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Disputes
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate order financials
  const subtotal = dispute.orderId?.items?.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1), 
    0
  ) || 0;
  const tax = dispute.orderId?.tax || 0;
  const shipping = dispute.orderId?.shipping_fee || 0;
  const total = subtotal + tax + shipping;

  const isResolved = dispute.status?.toLowerCase() === 'resolved';

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/disputes")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Disputes
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Dispute Resolution</h2>
                <p className="text-muted-foreground">Case ID: {dispute._id}</p>
              </div>
            </div>
            <Badge variant={getStatusColor(dispute.status)} className="text-sm">
              {dispute.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Dispute Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Dispute Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason</label>
                  <p className="text-lg font-semibold mt-1">{getReasonDisplay(dispute.reason)}</p>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer's Statement</label>
                  <p className="mt-2 p-4 bg-muted rounded-lg text-foreground whitespace-pre-wrap">
                    {dispute.details || 'No details provided'}
                  </p>
                </div>

                {dispute.seller_response && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Seller's Response</label>
                      <p className="mt-2 p-4 bg-muted rounded-lg text-foreground whitespace-pre-wrap">
                        {dispute.seller_response}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted On</label>
                  <p className="mt-1">{formatDate(dispute.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Details
                </CardTitle>
                <CardDescription>Order ID: {dispute.orderId?._id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Order Items */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">Items</label>
                    <div className="space-y-3">
                      {dispute.orderId?.items?.map((item, index) => (
                        <div
                          key={item._id || index}
                          className="flex items-start gap-3 p-3 border border-border rounded-lg"
                          data-testid={`item-${item._id}`}
                        >
                          {item.productId?.images?.[0] ? (
                            <img
                              src={`https://api.iconaapp.com/${item.productId.images[0]}`}
                              alt={item.productId.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.productId?.name || 'Unknown Product'}</p>
                            <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                            <p className="text-sm font-semibold mt-1">${item.price?.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Financial Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>${shipping.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Parties & Resolution */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {dispute.userId?.userName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{dispute.userId?.userName || 'Unknown'}</p>
                    {dispute.userId?.email && (
                      <p className="text-sm text-muted-foreground">{dispute.userId.email}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resolution Panel */}
            {!isResolved && (
              <Card className="border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale className="h-4 w-4" />
                    Resolve Dispute
                  </CardTitle>
                  <CardDescription>
                    Rule in favor of one party
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Notes (Optional)</label>
                    <Textarea
                      placeholder="Add any notes about your decision..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      data-testid="textarea-admin-notes"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      variant="default"
                      size="lg"
                      onClick={() => handleResolve("buyer")}
                      disabled={resolveMutation.isPending}
                      data-testid="button-favor-buyer"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Rule in Favor of Buyer
                    </Button>

                    <Button
                      className="w-full"
                      variant="outline"
                      size="lg"
                      onClick={() => handleResolve("seller")}
                      disabled={resolveMutation.isPending}
                      data-testid="button-favor-seller"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rule in Favor of Seller
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    This action cannot be undone. The appropriate party will be refunded or compensated.
                  </p>
                </CardContent>
              </Card>
            )}

            {isResolved && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Dispute Resolved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This dispute has been resolved and closed.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Resolution</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to rule in favor of the {selectedDecision === "buyer" ? "buyer" : "seller"}?
                {selectedDecision === "buyer" && " The buyer will be refunded."}
                {selectedDecision === "seller" && " The seller will keep the payment."}
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-resolve">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmResolve}
                disabled={resolveMutation.isPending}
                data-testid="button-confirm-resolve"
              >
                {resolveMutation.isPending ? "Resolving..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
