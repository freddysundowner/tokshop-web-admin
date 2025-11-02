import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag, Search, X, Ban, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ReportedCase {
  _id: string;
  reported?: {
    _id: string;
    userName?: string;
    email?: string;
    system_blocked?: boolean;
  } | null;
  reported_by?: {
    _id: string;
    userName?: string;
    email?: string;
  } | null;
  reason?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  __v?: number;
}

export default function AdminReportedCases() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  const limit = 10;

  // Fetch reported cases
  const { data: casesData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/reported-cases', page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/reported-cases?page=${page}&limit=${limit}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reported cases');
      }
      return await response.json();
    },
  });

  const allCases: ReportedCase[] = Array.isArray(casesData?.data?.data) 
    ? casesData.data.data 
    : Array.isArray(casesData?.data) 
    ? casesData.data 
    : [];
  const totalPages = casesData?.data?.totalPages || 1;

  // Block/Unblock user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/block`, { blocked });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reported-cases'] });
      toast({
        title: "Success",
        description: `User ${variables.blocked ? 'blocked' : 'unblocked'} successfully`,
      });
    },
    onError: (error: any, variables) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${variables.blocked ? 'block' : 'unblock'} user`,
        variant: "destructive",
      });
    },
  });

  // Filter cases locally by search term
  const filteredCases = allCases.filter((caseItem: ReportedCase) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const reportedUser = caseItem.reported?.userName?.toLowerCase() || '';
    const reporter = caseItem.reported_by?.userName?.toLowerCase() || '';
    const reason = caseItem.reason?.toLowerCase() || '';
    const description = caseItem.description?.toLowerCase() || '';
    
    return reportedUser.includes(searchLower) || 
           reporter.includes(searchLower) || 
           reason.includes(searchLower) ||
           description.includes(searchLower);
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
      case 'pending':
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
    setPage(1);
  };

  const hasActiveFilters = searchTerm;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading reported cases...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Flag className="h-8 w-8" />
              Reported Cases
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-page-description">
              Review and manage user-reported cases
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>All Reported Cases</CardTitle>
                <CardDescription>
                  {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'} found
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    data-testid="input-search"
                  />
                </div>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="gap-2"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCases.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-cases">
                  {searchTerm ? "No cases match your search criteria" : "No reported cases found"}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case ID</TableHead>
                        <TableHead>Reported User</TableHead>
                        <TableHead className="hidden md:table-cell">Reporter</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="hidden lg:table-cell">Status</TableHead>
                        <TableHead className="hidden xl:table-cell">Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCases.map((caseItem) => (
                        <TableRow 
                          key={caseItem._id}
                          data-testid={`row-case-${caseItem._id}`}
                        >
                          <TableCell className="font-mono text-xs" data-testid={`text-case-id-${caseItem._id}`}>
                            {caseItem._id.slice(-8)}
                          </TableCell>
                          <TableCell data-testid={`text-reported-user-${caseItem._id}`}>
                            {caseItem.reported?.userName || 'Unknown'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell" data-testid={`text-reporter-${caseItem._id}`}>
                            {caseItem.reported_by?.userName || 'Anonymous'}
                          </TableCell>
                          <TableCell data-testid={`text-reason-${caseItem._id}`}>
                            {getReasonDisplay(caseItem.reason || '')}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant={getStatusColor(caseItem.status || 'pending')} data-testid={`badge-status-${caseItem._id}`}>
                              {caseItem.status || 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell" data-testid={`text-date-${caseItem._id}`}>
                            {formatDate(caseItem.createdAt || '')}
                          </TableCell>
                          <TableCell className="text-right">
                            {caseItem.reported && (
                              <Button
                                variant={caseItem.reported.system_blocked ? "outline" : "destructive"}
                                size="sm"
                                onClick={() => {
                                  if (caseItem.reported?._id) {
                                    blockUserMutation.mutate({
                                      userId: caseItem.reported._id,
                                      blocked: !caseItem.reported.system_blocked,
                                    });
                                  }
                                }}
                                disabled={blockUserMutation.isPending}
                                data-testid={`button-block-${caseItem._id}`}
                              >
                                {caseItem.reported.system_blocked ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Unblock
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Block
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-previous-page"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      data-testid="button-next-page"
                    >
                      Next
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
