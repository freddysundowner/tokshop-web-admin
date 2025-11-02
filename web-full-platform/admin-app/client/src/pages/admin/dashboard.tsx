import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Users, Search, Eye, ChevronLeft, ChevronRight, Wallet, ShieldBan, CheckCircle, Ban, MoreVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Redirect if not admin (in useEffect to avoid render-phase side effects)
  useEffect(() => {
    if (!user?.admin) {
      setLocation("/");
    }
  }, [user?.admin, setLocation]);

  // Build query string with pagination and search
  const queryString = `/api/admin/users?page=${page}&limit=${limit}${searchQuery ? `&title=${encodeURIComponent(searchQuery)}` : ''}`;

  const { data: usersData, isLoading } = useQuery<{ 
    success: boolean; 
    data: {
      users: any[];
      totalDoc: number;
      limits: number;
      pages: number;
    };
  }>({
    queryKey: ['/api/admin/users', page, limit, searchQuery],
    queryFn: async () => {
      const response = await fetch(queryString, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return await response.json();
    },
  });

  const users = usersData?.data?.users || [];
  
  const pagination = usersData?.data ? {
    currentPage: page,
    totalPages: usersData.data.pages,
    totalItems: usersData.data.totalDoc,
    hasNextPage: page < usersData.data.pages,
    hasPrevPage: page > 1
  } : undefined;

  // Block/Unblock user mutation
  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/block`, { blocked });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
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

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {pagination?.totalItems || users.length}
              </div>
              <p className="text-xs text-muted-foreground">All registered users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sellers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-sellers-count">
                {users.filter((u: any) => u.seller).length}
              </div>
              <p className="text-xs text-muted-foreground">On current page</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-customers-count">
                {users.filter((u: any) => !u.seller).length}
              </div>
              <p className="text-xs text-muted-foreground">On current page</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage all registered users</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">User</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden lg:table-cell">Username</TableHead>
                        <TableHead className="hidden xl:table-cell">Country</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="text-right">Wallet</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Pending</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => (
                        <TableRow key={user._id || user.id} data-testid={`row-user-${user._id || user.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={user.profilePhoto} />
                                <AvatarFallback>
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-muted-foreground md:hidden truncate">{user.email}</div>
                                <div className="text-sm text-muted-foreground hidden md:block">{user.phone || 'No phone'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell" data-testid={`text-email-${user._id || user.id}`}>
                            <div className="max-w-[200px] truncate">{user.email}</div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell" data-testid={`text-username-${user._id || user.id}`}>{user.userName || 'N/A'}</TableCell>
                          <TableCell className="hidden xl:table-cell">{user.country || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={user.seller ? "default" : "secondary"}>
                              {user.seller ? "Seller" : "Customer"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge 
                              variant={user.system_blocked ? "destructive" : "secondary"}
                              data-testid={`badge-status-${user._id || user.id}`}
                            >
                              {user.system_blocked ? (
                                <>
                                  <ShieldBan className="h-3 w-3 mr-1" />
                                  Blocked
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-wallet-${user._id || user.id}`}>
                            <div className="flex items-center justify-end gap-1 font-medium">
                              <Wallet className="h-3 w-3 text-muted-foreground" />
                              <span>${(user.wallet || 0).toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell" data-testid={`text-wallet-pending-${user._id || user.id}`}>
                            <span className="text-muted-foreground">${(user.walletPending || 0).toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-actions-${user._id || user.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setLocation(`/admin/users/${user._id || user.id}`)}
                                  data-testid={`menu-view-user-${user._id || user.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    blockUserMutation.mutate({
                                      userId: user._id || user.id,
                                      blocked: !user.system_blocked,
                                    });
                                  }}
                                  disabled={blockUserMutation.isPending}
                                  data-testid={`menu-block-user-${user._id || user.id}`}
                                  className={user.system_blocked ? "" : "text-destructive focus:text-destructive"}
                                >
                                  {user.system_blocked ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Unblock User
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-4 w-4 mr-2" />
                                      Block User
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {pagination && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                      <span className="hidden sm:inline">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total users)</span>
                      <span className="sm:hidden">{pagination.currentPage} / {pagination.totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={!pagination.hasPrevPage}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={!pagination.hasNextPage}
                        data-testid="button-next-page"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4 sm:ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
