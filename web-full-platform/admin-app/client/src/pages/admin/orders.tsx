import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ShoppingCart, Eye, Search, Filter, X, MoreVertical, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all orders
  const { data: ordersData, isLoading } = useQuery<any>({
    queryKey: [`admin-all-orders`],
    queryFn: async () => {
      const response = await fetch(`/api/orders`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return await response.json();
    },
  });

  const allOrders = ordersData?.orders || ordersData?.data || [];

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'order' | 'transaction' }) => {
      return apiRequest("PUT", `/api/admin/refund/${id}`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
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

  // Filter orders
  const filteredOrders = allOrders.filter((order: any) => {
    // Search filter
    if (searchTerm) {
      const invoice = String(order.invoice || order._id || '').toLowerCase();
      const customerName = typeof order.customer === 'object'
        ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.userName || order.customer.email || ''
        : '';
      const searchLower = searchTerm.toLowerCase();
      
      if (!invoice.includes(searchLower) && !customerName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all" && order.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
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
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'default';
      case 'pending':
      case 'processing':
        return 'secondary';
      case 'shipped':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all";
  const activeFilterCount = [searchTerm, statusFilter !== "all"].filter(Boolean).length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground">Orders Management</h2>
            <p className="text-muted-foreground">Track and manage all platform orders</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading orders...</p>
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
          <h2 className="text-3xl font-bold text-foreground">Orders Management</h2>
          <p className="text-muted-foreground">Track and manage all platform orders</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>All Orders</CardTitle>
                  <CardDescription>
                    {filteredOrders.length} of {allOrders.length} orders
                  </CardDescription>
                </div>
              </div>
              
              {/* Filter Toggle Button */}
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filters Section */}
            {showFilters && (
              <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Invoice or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-orders"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="select-status-filter">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters */}
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
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "No orders match your filters" : "No orders found"}
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
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order: any) => {
                      const orderId = order._id || order.id;
                      const invoiceNumber = order.invoice || orderId;
                      const customerName = typeof order.customer === 'object' && order.customer !== null
                        ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.userName || order.customer.email
                        : 'Unknown';
                      const itemsCount = order.items?.length || 0;
                      
                      // Calculate total from items if not provided
                      const calculateTotal = () => {
                        if (order.totalAmount || order.total) {
                          return order.totalAmount || order.total;
                        }
                        if (!order.items || order.items.length === 0) return 0;
                        const subtotal = order.items.reduce((sum: number, item: any) => {
                          const price = item.price || 0;
                          const quantity = item.quantity || 1;
                          return sum + (price * quantity);
                        }, 0);
                        const shippingFee = order.shipping_fee || order.shippingFee || order.shipping || 0;
                        const tax = order.tax || 0;
                        return subtotal + shippingFee + tax;
                      };
                      
                      const total = calculateTotal();

                      return (
                        <TableRow key={orderId}>
                          <TableCell className="font-mono text-xs" data-testid={`text-order-id-${orderId}`}>
                            {invoiceNumber}
                          </TableCell>
                          <TableCell data-testid={`text-customer-${orderId}`}>
                            {customerName}
                          </TableCell>
                          <TableCell data-testid={`text-date-${orderId}`}>
                            {formatDate(order.createdAt || order.orderDate)}
                          </TableCell>
                          <TableCell data-testid={`text-items-${orderId}`}>
                            {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                          </TableCell>
                          <TableCell data-testid={`text-total-${orderId}`}>
                            ${total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(order.status)} data-testid={`badge-status-${orderId}`}>
                              {order.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-actions-${orderId}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setLocation(`/admin/orders/${orderId}`)}
                                  data-testid={`menu-view-order-${orderId}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    refundMutation.mutate({ id: orderId, type: 'order' });
                                  }}
                                  disabled={refundMutation.isPending}
                                  data-testid={`menu-refund-order-${orderId}`}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Refund Order
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
      </div>
    </AdminLayout>
  );
}
