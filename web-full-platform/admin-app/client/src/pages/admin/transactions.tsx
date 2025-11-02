import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/components/admin-layout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CreditCard, Search, Filter, X, Printer, MoreVertical, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminTransactions() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: transactionsData, isLoading } = useQuery<any>({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const response = await fetch('/api/admin/transactions', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
  });

  const { data: refundsData, isLoading: refundsLoading } = useQuery<any>({
    queryKey: ['admin-refunds', currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/refunds?limit=10&page=${currentPage}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch refunds');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
  });

  const { data: settingsData } = useQuery<any>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
  });

  const allTransactions = transactionsData?.transactions || transactionsData?.data || [];
  const supportEmail = settingsData?.support_email || 'support@icona.com';
  const settingsStripeFee = settingsData?.stripe_fee || '0';
  const settingsExtraCharges = settingsData?.extra_charges || '0';

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'order' | 'transaction' }) => {
      return apiRequest("PUT", `/api/admin/refund/${id}`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      toast({
        title: "Success",
        description: "Refund processed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  // Filter transactions
  const filteredTransactions = allTransactions.filter((transaction: any) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const transactionId = String(transaction._id || transaction.id || '').toLowerCase();
      
      // Get from and to names
      const fromName = typeof transaction.from === 'object'
        ? `${transaction.from.firstName || ''} ${transaction.from.lastName || ''}`.trim() || transaction.from.userName || transaction.from.email || ''
        : '';
      const toName = typeof transaction.to === 'object'
        ? `${transaction.to.firstName || ''} ${transaction.to.lastName || ''}`.trim() || transaction.to.userName || transaction.to.email || ''
        : '';
      
      if (!transactionId.includes(searchLower) && 
          !fromName.toLowerCase().includes(searchLower) && 
          !toName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
  };

  const hasActiveFilters = searchTerm;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground">Transactions</h2>
            <p className="text-muted-foreground">Monitor all financial transactions</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Transactions</h2>
          <p className="text-muted-foreground">Monitor all financial transactions and refunds</p>
        </div>

        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="refunds" data-testid="tab-refunds">
              Refunds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    {filteredTransactions.length} of {allTransactions.length} transactions
                  </CardDescription>
                </div>
              </div>
              
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                    1
                  </Badge>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Transaction ID or user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-transactions"
                      />
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "No transactions match your filters" : "No transactions found"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction: any) => {
                      const transactionId = transaction._id || transaction.id;
                      
                      // Get from and to names
                      const fromName = typeof transaction.from === 'object'
                        ? `${transaction.from.firstName || ''} ${transaction.from.lastName || ''}`.trim() || transaction.from.userName || transaction.from.email || 'Unknown'
                        : 'Unknown';
                      const toName = typeof transaction.to === 'object'
                        ? `${transaction.to.firstName || ''} ${transaction.to.lastName || ''}`.trim() || transaction.to.userName || transaction.to.email || 'Unknown'
                        : 'Unknown';
                      
                      const amount = transaction.amount || 0;
                      const type = transaction.type || 'N/A';
                      const status = transaction.status || 'pending';

                      return (
                        <TableRow key={transactionId}>
                          <TableCell className="font-mono text-xs" data-testid={`text-transaction-id-${transactionId}`}>
                            {String(transactionId).slice(-8)}
                          </TableCell>
                          <TableCell data-testid={`text-from-${transactionId}`}>
                            {fromName}
                          </TableCell>
                          <TableCell data-testid={`text-to-${transactionId}`}>
                            {toName}
                          </TableCell>
                          <TableCell data-testid={`text-type-${transactionId}`}>
                            <span className="capitalize">{type}</span>
                          </TableCell>
                          <TableCell data-testid={`text-amount-${transactionId}`}>
                            ${amount.toFixed(2)}
                          </TableCell>
                          <TableCell data-testid={`text-date-${transactionId}`}>
                            {formatDate(transaction.createdAt || transaction.date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(status)} data-testid={`badge-status-${transactionId}`}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-actions-${transactionId}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (transaction.receipt) {
                                      window.open(transaction.receipt, '_blank');
                                    } else {
                                      setSelectedTransaction(transaction);
                                      setShowReceipt(true);
                                    }
                                  }}
                                  data-testid={`menu-print-receipt-${transactionId}`}
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Receipt
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    refundMutation.mutate({ id: transactionId, type: 'transaction' });
                                  }}
                                  disabled={refundMutation.isPending}
                                  data-testid={`menu-refund-transaction-${transactionId}`}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Refund Transaction
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Refunds</CardTitle>
                  <CardDescription>
                    View all processed refunds
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {refundsLoading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading refunds...</p>
                </div>
              ) : !refundsData?.data || refundsData.data.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No refunds found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Refund ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundsData.data.map((refund: any) => {
                        const refundId = refund.id;
                        const amount = (refund.amount || 0) / 100;
                        
                        return (
                          <TableRow key={refundId}>
                            <TableCell className="font-mono text-xs" data-testid={`text-refund-id-${refundId}`}>
                              {String(refundId).slice(-8)}
                            </TableCell>
                            <TableCell data-testid={`text-amount-${refundId}`}>
                              ${amount.toFixed(2)}
                            </TableCell>
                            <TableCell data-testid={`text-reason-${refundId}`}>
                              {refund.reason || 'N/A'}
                            </TableCell>
                            <TableCell data-testid={`text-date-${refundId}`}>
                              {formatDate(new Date(refund.created * 1000).toISOString())}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(refund.status)} data-testid={`badge-status-${refundId}`}>
                                {refund.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div id="receipt-content" className="space-y-4 p-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">{settings.app_name}</h2>
                <p className="text-sm text-muted-foreground">Transaction Receipt</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono">{String(selectedTransaction._id || selectedTransaction.id).slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formatDate(selectedTransaction.createdAt || selectedTransaction.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{selectedTransaction.type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={getStatusColor(selectedTransaction.status || 'pending')}>
                    {selectedTransaction.status || 'pending'}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">
                    {typeof selectedTransaction.from === 'object'
                      ? `${selectedTransaction.from.firstName || ''} ${selectedTransaction.from.lastName || ''}`.trim() || 
                        selectedTransaction.from.userName || 
                        selectedTransaction.from.email || 'Unknown'
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">
                    {typeof selectedTransaction.to === 'object'
                      ? `${selectedTransaction.to.firstName || ''} ${selectedTransaction.to.lastName || ''}`.trim() || 
                        selectedTransaction.to.userName || 
                        selectedTransaction.to.email || 'Unknown'
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span>${(parseFloat(selectedTransaction.total) || 0).toFixed(2)}</span>
                </div>
                {(() => {
                  const stripeFee = parseFloat(selectedTransaction.stripe_fee) || 0;
                  const extraCharges = parseFloat(selectedTransaction.extra_charges) || 0;
                  const combined = stripeFee + extraCharges;
                  return combined > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Charge ({settingsStripeFee}% + {settingsExtraCharges}%):</span>
                      <span className="text-destructive">-${combined.toFixed(2)}</span>
                    </div>
                  );
                })()}
                {selectedTransaction.serviceFee && parseFloat(selectedTransaction.serviceFee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee:</span>
                    <span className="text-destructive">-${parseFloat(selectedTransaction.serviceFee).toFixed(2)}</span>
                  </div>
                )}
                {selectedTransaction.shippingFee && parseFloat(selectedTransaction.shippingFee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping Fee:</span>
                    <span className="text-destructive">-${parseFloat(selectedTransaction.shippingFee).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                  <span>Amount:</span>
                  <span>${(parseFloat(selectedTransaction.amount) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground border-t pt-4">
                <p>Thank you for your business!</p>
                <p>For support, please contact {supportEmail}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowReceipt(false)} data-testid="button-close-receipt">
              Close
            </Button>
            <Button 
              onClick={() => {
                const content = document.getElementById('receipt-content');
                if (content) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Receipt</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
                            .space-y-4 > * + * { margin-top: 1rem; }
                            .space-y-2 > * + * { margin-top: 0.5rem; }
                            .flex { display: flex; }
                            .justify-between { justify-content: space-between; }
                            .items-center { align-items: center; }
                            .text-center { text-align: center; }
                            .border-b { border-bottom: 1px solid #ddd; padding-bottom: 1rem; }
                            .border-t { border-top: 1px solid #ddd; padding-top: 1rem; }
                            .text-muted-foreground { color: #666; }
                            .font-mono { font-family: monospace; }
                            .font-bold { font-weight: bold; }
                            .font-medium { font-weight: 500; }
                            .text-lg { font-size: 1.125rem; }
                            .text-2xl { font-size: 1.5rem; }
                            .text-xs { font-size: 0.75rem; }
                            .text-sm { font-size: 0.875rem; }
                            .capitalize { text-transform: capitalize; }
                          </style>
                        </head>
                        <body>
                          ${content.innerHTML}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }
                }
              }}
              data-testid="button-print-receipt-dialog"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
