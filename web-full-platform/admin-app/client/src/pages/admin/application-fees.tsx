import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, TrendingUp, CalendarIcon, CreditCard, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminApplicationFees() {
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    limit: '50',
  });
  const [pagination, setPagination] = useState({
    starting_after: '',
    ending_before: '',
  });

  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (pagination.starting_after) params.append('starting_after', pagination.starting_after);
    if (pagination.ending_before) params.append('ending_before', pagination.ending_before);
    return params.toString();
  };

  const queryString = buildQueryString();
  const { data: feesData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/application-fees', queryString],
    queryFn: async () => {
      const response = await fetch(`/api/admin/application-fees?${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch fees');
      return response.json();
    },
  });

  const fees = feesData?.data || [];
  const hasMore = feesData?.has_more || false;

  // Calculate total fees from current results
  const totalFees = fees.reduce((sum: number, fee: any) => {
    return sum + (fee.amount || 0);
  }, 0);

  // Calculate this month's fees from current results
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyFees = fees.filter((fee: any) => {
    const feeDate = new Date(fee.created * 1000);
    return feeDate.getMonth() === currentMonth && feeDate.getFullYear() === currentYear;
  }).reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApplyFilters = () => {
    setFilters({
      ...filters,
      from: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
      to: toDate ? format(toDate, 'yyyy-MM-dd') : '',
    });
    setPagination({ starting_after: '', ending_before: '' });
  };

  const handleClearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setFilters({
      from: '',
      to: '',
      limit: '50',
    });
    setPagination({ starting_after: '', ending_before: '' });
  };

  const handleNextPage = () => {
    if (fees.length > 0) {
      setPagination({ starting_after: fees[fees.length - 1].id, ending_before: '' });
    }
  };

  const handlePrevPage = () => {
    if (fees.length > 0) {
      setPagination({ starting_after: '', ending_before: fees[0].id });
    }
  };

  const activeFiltersCount = [filters.from, filters.to].filter(f => f).length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading revenue...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Revenue</h2>
          <p className="text-muted-foreground">Platform revenue from client transactions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fees (Current View)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-fees">
                {formatCurrency(totalFees)}
              </div>
              <p className="text-xs text-muted-foreground">From current filter results</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month (Current View)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-monthly-fees">
                {formatCurrency(monthlyFees)}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-transactions">
                {fees.length}
              </div>
              <p className="text-xs text-muted-foreground">Fee transactions in current view</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filters</CardTitle>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount} active</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date From */}
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fromDate && "text-muted-foreground"
                        )}
                        data-testid="button-from-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !toDate && "text-muted-foreground"
                        )}
                        data-testid="button-to-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Limit */}
                <div className="space-y-2">
                  <Label htmlFor="limit-filter">Results per page</Label>
                  <Select
                    value={filters.limit}
                    onValueChange={(value) => setFilters({ ...filters, limit: value })}
                  >
                    <SelectTrigger id="limit-filter" data-testid="select-limit-filter">
                      <SelectValue placeholder="50" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleApplyFilters} data-testid="button-apply-filters">
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Fees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>List of platform fees collected from transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No revenue found</p>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="mt-4"
                    data-testid="button-clear-filters-empty"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fee: any) => (
                        <tr 
                          key={fee.id} 
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                          data-testid={`row-fee-${fee.id}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{formatDate(fee.created)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(fee.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={fee.refunded ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {fee.refunded ? 'Refunded' : 'Collected'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {fees.length} {fees.length === 1 ? 'fee' : 'fees'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={!pagination.starting_after && !pagination.ending_before}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!hasMore}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
