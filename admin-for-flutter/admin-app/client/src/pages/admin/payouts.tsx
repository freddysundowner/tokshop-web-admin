import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { Banknote, Search, DollarSign, TrendingUp, Calendar, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

export default function AdminPayouts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [startingAfter, setStartingAfter] = useState<string>("");
  const itemsPerPage = 10;

  // Build query params for filters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    if (dateFrom) params.append('from', dateFrom);
    if (dateTo) params.append('to', dateTo);
    params.append('limit', itemsPerPage.toString());
    if (startingAfter && currentPage > 1) params.append('starting_after', startingAfter);
    return params.toString();
  };

  const queryParams = buildQueryParams();

  const { data: payoutsData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/stripe-payouts', statusFilter, dateFrom, dateTo, startingAfter, currentPage],
    queryFn: async () => {
      const url = `/api/admin/stripe-payouts${queryParams ? '?' + queryParams : ''}`;
      console.log('Fetching payouts from:', url);
      const response = await fetch(url, { credentials: 'include' });
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const payouts = payoutsData?.data || [];
  const hasMore = payoutsData?.has_more || false;

  // Filter payouts by bank name or payout ID
  const filteredPayouts = payouts.filter((payout: any) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const bankName = (payout.destination?.bank_name || '').toLowerCase();
      const payoutId = (payout.id || '').toLowerCase();
      if (!bankName.includes(searchLower) && !payoutId.includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  // Calculate totals
  const totalPayouts = filteredPayouts.reduce((sum: number, p: any) => sum + ((p.amount || 0) / 100), 0);
  const itemCount = filteredPayouts.length;
  const avgPayout = itemCount > 0 ? totalPayouts / itemCount : 0;

  // Pagination
  const totalPages = hasMore ? currentPage + 1 : currentPage; // If has_more, there's at least one more page
  const startIndex = 0; // Always start from 0 since we fetch only the current page from API
  const endIndex = filteredPayouts.length;
  const paginatedPayouts = filteredPayouts; // Show all items from API response
  const displayedStart = (currentPage - 1) * itemsPerPage + 1;
  const displayedEnd = (currentPage - 1) * itemsPerPage + filteredPayouts.length;
  const totalCount = hasMore ? `${displayedEnd}+` : displayedEnd;

  // Reset to page 1 when search term changes
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    setStartingAfter("");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setCurrentPage(1);
    setStartingAfter("");
  };

  // Handle next page
  const handleNextPage = () => {
    if (hasMore && payouts.length > 0) {
      const lastPayout = payouts[payouts.length - 1];
      setStartingAfter(lastPayout.id);
      setCurrentPage(prev => prev + 1);
    }
  };

  // Handle previous page (reset to page 1 for now - true cursor pagination would need ending_before)
  const handlePrevPage = () => {
    setCurrentPage(1);
    setStartingAfter("");
  };

  const hasActiveFilters = statusFilter || dateFrom || dateTo;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Stripe Payouts</h2>
          <p className="text-muted-foreground">View Stripe payout transactions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-amount">
                ${totalPayouts.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Across all payouts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-count">
                {itemCount}
              </div>
              <p className="text-xs text-muted-foreground">Payout transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Payout</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-payout">
                ${avgPayout.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  data-testid="button-reset-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payouts Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle>Payout Transactions</CardTitle>
                <CardDescription>Stripe payout history</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by bank or ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-payouts"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading payouts...</p>
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No payouts found matching your search' : 'No payouts found'}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Bank</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Currency</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="hidden lg:table-cell">Arrival Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayouts.map((payout: any) => {
                      const payoutId = payout.id;
                      const amount = (payout.amount || 0) / 100;
                      const createdDate = payout.created ? new Date(payout.created * 1000) : null;
                      const arrivalDate = payout.arrival_date ? new Date(payout.arrival_date * 1000) : null;
                      const bankName = payout.destination?.bank_name || 'Bank Account';
                      const last4 = payout.destination?.last4 || '';
                      
                      return (
                        <TableRow key={payoutId} data-testid={`row-payout-${payoutId}`}>
                          <TableCell data-testid={`text-bank-${payoutId}`}>
                            <div className="max-w-[180px]">
                              <div className="font-medium truncate">{bankName}</div>
                              {last4 && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  ****{last4}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold" data-testid={`text-amount-${payoutId}`}>
                            ${amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell uppercase">
                            {payout.currency || 'USD'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {createdDate ? createdDate.toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {arrivalDate ? arrivalDate.toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={payout.automatic ? "default" : "outline"}>
                              {payout.automatic ? "Automatic" : "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">
                              {payout.status || 'Completed'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {filteredPayouts.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {displayedStart} to {displayedEnd} of {totalCount} payouts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage}{hasMore ? '+' : ''}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasMore}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
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
