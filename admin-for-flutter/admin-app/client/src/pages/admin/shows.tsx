import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminLayout } from "@/components/admin-layout";
import { Video, Search, ChevronLeft, ChevronRight, Eye, Calendar, User } from "lucide-react";

export default function AdminShows() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchType, setSearchType] = useState("");

  const { data: showsData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/shows', page, limit, searchTitle, searchType],
  });

  const shows = showsData?.data || [];
  
  const pagination = showsData ? {
    currentPage: page,
    totalPages: showsData.pages || 1,
    totalItems: showsData.totalDoc || 0,
    hasNextPage: page < (showsData.pages || 1),
    hasPrevPage: page > 1
  } : null;

  // Stats
  const liveShows = shows.filter((show: any) => show.status === 'live').length;
  const scheduledShows = shows.filter((show: any) => show.status === 'scheduled').length;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Live Shows</h2>
          <p className="text-muted-foreground">Manage all live shopping shows and rooms</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shows</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-shows">
                {pagination?.totalItems || shows.length}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Now</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-live-shows">
                {liveShows}
              </div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-scheduled-shows">
                {scheduledShows}
              </div>
              <p className="text-xs text-muted-foreground">Upcoming shows</p>
            </CardContent>
          </Card>
        </div>

        {/* Shows Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Live Shows & Rooms</CardTitle>
                  <CardDescription>View and manage all live shows</CardDescription>
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title..."
                    value={searchTitle}
                    onChange={(e) => {
                      setSearchTitle(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                    data-testid="input-search-title"
                  />
                </div>
                <Select value={searchType} onValueChange={(value) => {
                  setSearchType(value === "all" ? "" : value);
                  setPage(1);
                }}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading shows...</p>
              </div>
            ) : shows.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTitle || searchType ? 'No shows found matching your filters' : 'No shows found'}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Show Details</TableHead>
                        <TableHead className="hidden md:table-cell">Host</TableHead>
                        <TableHead className="hidden lg:table-cell">Viewers</TableHead>
                        <TableHead className="hidden sm:table-cell">Created</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shows.map((show: any) => {
                        const showId = show._id || show.id;
                        const createdDate = show.createdAt ? new Date(show.createdAt) : null;
                        
                        // Extract owner/host info as simple strings
                        const ownerFirstName = show.owner?.firstName ? String(show.owner.firstName) : '';
                        const ownerLastName = show.owner?.lastName ? String(show.owner.lastName) : '';
                        const ownerUserName = show.owner?.userName ? String(show.owner.userName) : '';
                        const ownerEmail = show.owner?.email ? String(show.owner.email) : '';
                        const ownerPhoto = show.owner?.profilePhoto ? String(show.owner.profilePhoto) : '';
                        const hasOwner = Boolean(show.owner);
                        
                        return (
                          <TableRow 
                            key={showId} 
                            data-testid={`row-show-${showId}`}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setLocation(`/admin/shows/${showId}`)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-start gap-3">
                                {show.thumbnail && (
                                  <img
                                    src={show.thumbnail}
                                    alt={show.title || 'Show'}
                                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium truncate" data-testid={`text-title-${showId}`}>
                                    {String(show.title || show.name || 'Untitled Show')}
                                  </div>
                                  {show.category?.name && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        {String(show.category.name)}
                                      </Badge>
                                    </div>
                                  )}
                                  {show.description && typeof show.description === 'string' && (
                                    <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                      {show.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 md:hidden">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground truncate">
                                      {hasOwner ? (ownerFirstName || ownerUserName || 'Unknown Host') : 'Unknown Host'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {hasOwner ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={ownerPhoto} />
                                    <AvatarFallback>
                                      {(ownerFirstName || 'U')[0]}{(ownerLastName || 'H')[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {ownerFirstName} {ownerLastName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {ownerEmail}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No host</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell" data-testid={`text-viewers-${showId}`}>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                {Array.isArray(show.viewers) ? show.viewers.length : 0}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {createdDate ? createdDate.toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                // Determine status based on started, ended, and date
                                let status = 'unknown';
                                
                                if (show.ended === true) {
                                  status = 'ended';
                                } else if (show.started === true && show.ended === false) {
                                  status = 'live';
                                } else if (show.started === false && show.ended === false) {
                                  // Check if date is in the future
                                  const showDate = show.startDate || show.date || show.createdAt;
                                  if (showDate) {
                                    const futureDate = new Date(showDate);
                                    const now = new Date();
                                    if (futureDate > now) {
                                      status = 'active';
                                    }
                                  }
                                }
                                
                                const isLive = status === 'live';
                                const displayStatus = status === 'active' ? 'scheduled' : status;
                                return (
                                  <Badge 
                                    variant={
                                      isLive ? 'default' :
                                      status === 'active' ? 'secondary' :
                                      'outline'
                                    }
                                    className={isLive ? 'bg-green-600' : ''}
                                  >
                                    {isLive && (
                                      <span className="relative flex h-2 w-2 mr-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                      </span>
                                    )}
                                    {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {pagination && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground text-center sm:text-left">
                        <span className="hidden sm:inline">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total shows)</span>
                        <span className="sm:hidden">{pagination.currentPage} / {pagination.totalPages}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
                        <Select 
                          value={String(limit)} 
                          onValueChange={(value) => {
                            setLimit(Number(value));
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[70px] h-8" data-testid="select-limit">
                            <SelectValue />
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
