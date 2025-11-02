import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Video, User, Eye, DollarSign, Gavel, Pin, ShoppingCart, Gift, Package } from "lucide-react";

export default function AdminShowDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/shows/:showId");
  const showId = params?.showId;
  const [activeTab, setActiveTab] = useState("overview");

  const { data: showData, isLoading } = useQuery<any>({
    queryKey: [`admin-show-${showId}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/shows/${showId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch show');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!showId,
  });

  // Fetch auctions
  const { data: auctionsData, isLoading: auctionsLoading } = useQuery<any>({
    queryKey: [`admin-show-${showId}-auctions`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/shows/${showId}/auctions?page=1&limit=15`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch auctions');
      const result = await response.json();
      return result;
    },
    enabled: !!showId && activeTab === "auctions",
  });

  // Fetch giveaways
  const { data: giveawaysData, isLoading: giveawaysLoading } = useQuery<any>({
    queryKey: [`admin-show-${showId}-giveaways`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/shows/${showId}/giveaways?page=1&limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch giveaways');
      const result = await response.json();
      return result;
    },
    enabled: !!showId && activeTab === "giveaways",
  });

  // Fetch buy now items
  const { data: buyNowData, isLoading: buyNowLoading } = useQuery<any>({
    queryKey: [`admin-show-${showId}-buy-now`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/shows/${showId}/buy-now?page=1&limit=15`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch buy now items');
      const result = await response.json();
      return result;
    },
    enabled: !!showId && activeTab === "buy-now",
  });

  // Fetch sold items
  const { data: soldData, isLoading: soldLoading } = useQuery<any>({
    queryKey: [`admin-show-${showId}-sold`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/shows/${showId}/sold?page=1&limit=15`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sold items');
      const result = await response.json();
      return result;
    },
    enabled: !!showId && activeTab === "sold",
  });

  const show = showData?.data || showData;

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading show details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!show) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Show not found</p>
            <Button onClick={() => setLocation('/admin/shows')} className="mt-4" data-testid="button-back-to-shows">
              Back to Shows
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const ownerFirstName = show.owner?.firstName ? String(show.owner.firstName) : '';
  const ownerLastName = show.owner?.lastName ? String(show.owner.lastName) : '';
  const ownerUserName = show.owner?.userName ? String(show.owner.userName) : '';
  const ownerEmail = show.owner?.email ? String(show.owner.email) : '';
  const ownerPhoto = show.owner?.profilePhoto ? String(show.owner.profilePhoto) : '';
  const hasOwner = Boolean(show.owner);

  // Determine status
  let status = 'unknown';
  if (show.ended === true) {
    status = 'ended';
  } else if (show.started === true && show.ended === false) {
    status = 'live';
  } else if (show.started === false && show.ended === false) {
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
  const activeAuction = show.activeauction;
  const pinnedObject = show.pinnedobject;
  const bids = activeAuction?.bids || [];

  const auctions = auctionsData?.data || [];
  const giveaways = giveawaysData?.data || [];
  const buyNowItems = buyNowData?.data || [];
  const soldOrders = soldData?.data || [];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin/shows')}
            className="mb-4"
            data-testid="button-back-to-shows"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shows
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground" data-testid="text-show-title">
                {String(show.title || show.name || 'Untitled Show')}
              </h2>
              <p className="text-muted-foreground">Show Details</p>
            </div>
            <div className="flex items-center gap-2">
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
                {status === 'active' ? 'Scheduled' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-full min-w-max sm:w-full sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-5">
              <TabsTrigger value="overview" data-testid="tab-overview" className="flex-shrink-0 sm:flex-shrink">Overview</TabsTrigger>
              <TabsTrigger value="auctions" data-testid="tab-auctions" className="flex-shrink-0 sm:flex-shrink">
                <Gavel className="h-4 w-4 mr-2 hidden sm:inline" />
                Auctions
              </TabsTrigger>
              <TabsTrigger value="giveaways" data-testid="tab-giveaways" className="flex-shrink-0 sm:flex-shrink">
                <Gift className="h-4 w-4 mr-2 hidden sm:inline" />
                Giveaways
              </TabsTrigger>
              <TabsTrigger value="buy-now" data-testid="tab-buy-now" className="flex-shrink-0 sm:flex-shrink">
                <ShoppingCart className="h-4 w-4 mr-2 hidden sm:inline" />
                Buy Now
              </TabsTrigger>
              <TabsTrigger value="sold" data-testid="tab-sold" className="flex-shrink-0 sm:flex-shrink">
                <Package className="h-4 w-4 mr-2 hidden sm:inline" />
                Sold
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Show Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Show Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Show Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {show.thumbnail && (
                      <img
                        src={show.thumbnail}
                        alt={show.title || 'Show'}
                        className="w-full h-64 rounded object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">Description</h3>
                      <p className="text-foreground" data-testid="text-show-description">
                        {show.description || 'No description provided'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground mb-1">Category</h3>
                        <p className="text-foreground">
                          {show.category?.name ? String(show.category.name) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground mb-1">Viewers</h3>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground" data-testid="text-viewer-count">
                            {Array.isArray(show.viewers) ? show.viewers.length : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground mb-1">Created</h3>
                        <p className="text-foreground">{formatDate(show.createdAt)}</p>
                      </div>
                      {show.date && (
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground mb-1">Scheduled Date</h3>
                          <p className="text-foreground">{formatDate(show.date)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Auction Card */}
                {activeAuction && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gavel className="h-5 w-5" />
                        Active Auction
                      </CardTitle>
                      <CardDescription>Current auction in progress</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeAuction.product && (
                        <div className="flex items-start gap-4">
                          {activeAuction.product.images && activeAuction.product.images[0] && (
                            <img
                              src={activeAuction.product.images[0]}
                              alt={activeAuction.product.name}
                              className="w-20 h-20 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium" data-testid="text-auction-product-name">
                              {activeAuction.product.name}
                            </h3>
                            {activeAuction.product.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {activeAuction.product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground mb-1">Starting Price</h3>
                          <p className="text-lg font-bold text-foreground" data-testid="text-auction-starting-price">
                            ${activeAuction.startingprice || 0}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground mb-1">Current Bid</h3>
                          <p className="text-lg font-bold text-green-600" data-testid="text-auction-current-bid">
                            ${activeAuction.currentbid || activeAuction.startingprice || 0}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground mb-1">Status</h3>
                        <Badge variant={activeAuction.won ? 'default' : 'secondary'}>
                          {activeAuction.won ? 'Won' : 'In Progress'}
                        </Badge>
                      </div>
                      {activeAuction.winner && (
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground mb-1">Winner</h3>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={activeAuction.winner.profilePhoto} />
                              <AvatarFallback>
                                {(activeAuction.winner.firstName || 'W')[0]}
                                {(activeAuction.winner.lastName || 'N')[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {activeAuction.winner.firstName} {activeAuction.winner.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {activeAuction.winner.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Bids Card */}
                {bids.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Bids ({bids.length})
                      </CardTitle>
                      <CardDescription>All bids for the active auction</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Bidder</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bids.map((bid: any, index: number) => (
                              <TableRow key={bid._id || index} data-testid={`row-bid-${index}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={bid.user?.profilePhoto} />
                                      <AvatarFallback>
                                        {(bid.user?.firstName || 'B')[0]}
                                        {(bid.user?.lastName || 'D')[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {bid.user?.firstName} {bid.user?.lastName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {bid.user?.email}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-bold text-green-600" data-testid={`text-bid-amount-${index}`}>
                                    ${bid.amount || 0}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(bid.createdAt)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pinned Object Card */}
                {pinnedObject && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Pin className="h-5 w-5" />
                        Pinned Object
                      </CardTitle>
                      <CardDescription>Currently pinned item in the show</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        {pinnedObject.images && pinnedObject.images[0] && (
                          <img
                            src={pinnedObject.images[0]}
                            alt={pinnedObject.name}
                            className="w-24 h-24 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-lg" data-testid="text-pinned-name">
                            {pinnedObject.name}
                          </h3>
                          {pinnedObject.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {pinnedObject.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <span className="text-xs text-muted-foreground">Price: </span>
                              <span className="font-bold text-foreground" data-testid="text-pinned-price">
                                ${pinnedObject.price || 0}
                              </span>
                            </div>
                            {pinnedObject.quantity && (
                              <div>
                                <span className="text-xs text-muted-foreground">Qty: </span>
                                <span className="font-medium text-foreground">
                                  {pinnedObject.quantity}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Host Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Host Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasOwner ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={ownerPhoto} />
                            <AvatarFallback>
                              {(ownerFirstName || 'U')[0]}{(ownerLastName || 'H')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium" data-testid="text-host-name">
                              {ownerFirstName} {ownerLastName}
                            </h3>
                            <p className="text-sm text-muted-foreground">@{ownerUserName}</p>
                          </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t">
                          <div>
                            <h4 className="text-xs text-muted-foreground mb-1">Email</h4>
                            <p className="text-sm" data-testid="text-host-email">{ownerEmail}</p>
                          </div>
                          {show.owner.country && (
                            <div>
                              <h4 className="text-xs text-muted-foreground mb-1">Country</h4>
                              <p className="text-sm">{show.owner.country}</p>
                            </div>
                          )}
                          {show.owner.accountType && (
                            <div>
                              <h4 className="text-xs text-muted-foreground mb-1">Account Type</h4>
                              <Badge variant="secondary">{show.owner.accountType}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No host information available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Show ID</span>
                      <span className="text-xs font-mono">{show._id || show.id || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Viewers</span>
                      <span className="font-bold">{Array.isArray(show.viewers) ? show.viewers.length : 0}</span>
                    </div>
                    {activeAuction && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Bids</span>
                        <span className="font-bold">{bids.length}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Auctions Tab */}
          <TabsContent value="auctions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Auction Items ({auctions.length})
                </CardTitle>
                <CardDescription>All auction products in this show</CardDescription>
              </CardHeader>
              <CardContent>
                {auctionsLoading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading auctions...</p>
                  </div>
                ) : auctions.length === 0 ? (
                  <div className="text-center py-8">
                    <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No auction items found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {auctions.map((product: any) => (
                      <Card key={product._id} className="overflow-hidden" data-testid={`card-auction-${product._id}`}>
                        <div className="aspect-video relative">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm truncate" data-testid={`text-auction-name-${product._id}`}>
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-muted-foreground">Price</span>
                            <span className="font-bold text-sm text-foreground" data-testid={`text-auction-price-${product._id}`}>
                              ${product.price || 0}
                            </span>
                          </div>
                          {product.status && (
                            <Badge variant="secondary" className="mt-1.5 text-xs">{product.status}</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Giveaways Tab */}
          <TabsContent value="giveaways" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Giveaway Items ({giveaways.length})
                </CardTitle>
                <CardDescription>All giveaway items in this show</CardDescription>
              </CardHeader>
              <CardContent>
                {giveawaysLoading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading giveaways...</p>
                  </div>
                ) : giveaways.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No giveaway items found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {giveaways.map((giveaway: any) => (
                      <Card key={giveaway._id} className="overflow-hidden" data-testid={`card-giveaway-${giveaway._id}`}>
                        <div className="aspect-video relative">
                          {giveaway.images && giveaway.images[0] ? (
                            <img
                              src={giveaway.images[0]}
                              alt={giveaway.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Gift className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm truncate" data-testid={`text-giveaway-name-${giveaway._id}`}>
                            {giveaway.name}
                          </h3>
                          {giveaway.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {giveaway.description}
                            </p>
                          )}
                          {giveaway.quantity && (
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-xs text-muted-foreground">Quantity</span>
                              <span className="font-medium text-sm">{giveaway.quantity}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buy Now Tab */}
          <TabsContent value="buy-now" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Buy Now Items ({buyNowItems.length})
                </CardTitle>
                <CardDescription>All buy now products in this show</CardDescription>
              </CardHeader>
              <CardContent>
                {buyNowLoading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading buy now items...</p>
                  </div>
                ) : buyNowItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No buy now items found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {buyNowItems.map((product: any) => (
                      <Card key={product._id} className="overflow-hidden" data-testid={`card-buy-now-${product._id}`}>
                        <div className="aspect-video relative">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm truncate" data-testid={`text-buy-now-name-${product._id}`}>
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-muted-foreground">Price</span>
                            <span className="font-bold text-sm text-foreground" data-testid={`text-buy-now-price-${product._id}`}>
                              ${product.price || 0}
                            </span>
                          </div>
                          {product.quantity !== undefined && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">Stock</span>
                              <span className="font-medium text-sm">{product.quantity}</span>
                            </div>
                          )}
                          {product.status && (
                            <Badge variant="secondary" className="mt-1.5 text-xs">{product.status}</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sold Tab */}
          <TabsContent value="sold" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sold Orders ({soldOrders.length})
                </CardTitle>
                <CardDescription>All orders from this show</CardDescription>
              </CardHeader>
              <CardContent>
                {soldLoading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading sold orders...</p>
                  </div>
                ) : soldOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No sold orders found</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {soldOrders.map((order: any) => (
                          <TableRow key={order._id} data-testid={`row-sold-${order._id}`}>
                            <TableCell className="font-mono text-sm">
                              {order._id?.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {order.customer?.firstName} {order.customer?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.customer?.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{order.status || 'pending'}</Badge>
                            </TableCell>
                            <TableCell className="font-bold">
                              ${order.invoice || order.total || 0}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
