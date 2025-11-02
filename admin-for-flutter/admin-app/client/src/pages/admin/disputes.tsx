import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Eye, Search, Filter, X } from "lucide-react";

interface Dispute {
  _id: string;
  orderId: {
    _id: string;
    tax: number;
    items: Array<{
      _id: string;
      price: number;
      productId: {
        _id: string;
        name: string;
      };
    }>;
    shipping_fee: number;
  };
  seller_response: string;
  userId: {
    _id: string;
    userName: string;
  };
  status: string;
  reason: string;
  details: string;
  __v: number;
}

export default function AdminDisputes() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const limit = 10;

  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());
  if (statusFilter !== "all") {
    queryParams.append("status", statusFilter);
  }

  // Fetch disputes
  const { data: disputesData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/disputes', page, statusFilter],
    queryFn: async () => {
      const response = await fetch(`/api/admin/disputes?${queryParams.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }
      return await response.json();
    },
  });

  const allDisputes: Dispute[] = disputesData?.data?.disputes || disputesData?.data || [];
  // Filter out disputes without order ID
  const disputes = allDisputes.filter(dispute => dispute.orderId && dispute.orderId._id);
  const totalPages = disputesData?.data?.pages || 1;

  // Filter disputes locally by search term
  const filteredDisputes = disputes.filter((dispute: Dispute) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const userName = dispute.userId?.userName?.toLowerCase() || '';
    const orderId = dispute.orderId?._id?.toLowerCase() || '';
    const reason = dispute.reason?.toLowerCase() || '';
    
    return userName.includes(searchLower) || 
           orderId.includes(searchLower) || 
           reason.includes(searchLower);
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

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground">Disputes Management</h2>
            <p className="text-muted-foreground">Review and resolve order disputes</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading disputes...</p>
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">Disputes Management</h2>
              <p className="text-muted-foreground">Review and resolve order disputes</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Filters</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                {showFilters ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="User, Order ID, Reason..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-disputes"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Disputes Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Disputes ({filteredDisputes.length})
            </CardTitle>
            <CardDescription>
              Click on a dispute to view details and resolve
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDisputes.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No disputes found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisputes.map((dispute) => {
                      // Calculate order total
                      const subtotal = dispute.orderId?.items?.reduce(
                        (sum, item) => sum + (item.price || 0), 
                        0
                      ) || 0;
                      const tax = dispute.orderId?.tax || 0;
                      const shipping = dispute.orderId?.shipping_fee || 0;
                      const total = subtotal + tax + shipping;

                      return (
                        <TableRow
                          key={dispute._id}
                          className="cursor-pointer hover:bg-muted/50"
                          data-testid={`row-dispute-${dispute._id}`}
                        >
                          <TableCell className="font-mono text-sm">
                            {dispute.orderId?._id?.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {dispute.userId?.userName?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <span>{dispute.userId?.userName || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getReasonDisplay(dispute.reason)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(dispute.status)}>
                              {dispute.status?.replace(/_/g, ' ') || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/admin/disputes/${dispute.orderId?._id}`)}
                              data-testid={`button-view-dispute-${dispute._id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {filteredDisputes.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
