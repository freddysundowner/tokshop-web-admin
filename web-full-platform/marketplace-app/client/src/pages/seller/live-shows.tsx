import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Video, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Show {
  _id: string;
  title: string;
  description?: string;
  date: number;
  status: boolean;
  started?: boolean;
  ended?: boolean;
  category?: {
    _id: string;
    name: string;
  };
  thumbnail?: string;
  roomType: string;
  activeTime: number;
}

interface ShowsResponse {
  rooms: Show[];
  totalDoc: number;
  limits: number;
  pages: number;
}

export default function LiveShows() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  // Determine status based on active tab
  const statusFilter = activeTab === "upcoming" ? "active" : "inactive";

  const { data: showsData, isLoading } = useQuery<ShowsResponse>({
    queryKey: ["/api/rooms", user?.id, currentPage, statusFilter],
    queryFn: async () => {
      if (!user?.id) return { rooms: [], totalDoc: 0, limits: 15, pages: 0 };
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "15",
        userid: user.id,
        currentUserId: user.id,
        category: "",
        title: "",
        status: statusFilter
      });
      
      const response = await fetch(`/api/rooms?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch shows");
      }
      
      return await response.json();
    },
    enabled: !!user?.id,
  });

  const shows = showsData?.rooms || [];
  const totalPages = Math.ceil((showsData?.totalDoc || 0) / (showsData?.limits || 15));

  // Mutation to toggle room type
  const toggleRoomTypeMutation = useMutation({
    mutationFn: async ({ showId, newRoomType }: { showId: string; newRoomType: string }) => {
      return await apiRequest("PUT", `/api/rooms/${showId}`, { roomType: newRoomType });
    },
    onMutate: async ({ showId, newRoomType }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/rooms"] });
      
      // Snapshot the previous value
      const previousShows = queryClient.getQueryData(["/api/rooms", user?.id, currentPage, statusFilter]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/rooms", user?.id, currentPage, statusFilter], (old: ShowsResponse | undefined) => {
        if (!old) return old;
        
        return {
          ...old,
          rooms: old.rooms.map(show => 
            show._id === showId 
              ? { ...show, roomType: newRoomType }
              : show
          )
        };
      });
      
      // Return context with the previous value
      return { previousShows };
    },
    onSuccess: () => {
      // Refetch to ensure we have the latest data from server
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ 
        title: "Room type updated", 
        description: "Show privacy settings have been updated successfully." 
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousShows) {
        queryClient.setQueryData(["/api/rooms", user?.id, currentPage, statusFilter], context.previousShows);
      }
      toast({ 
        title: "Failed to update room type", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mutation to cancel show
  const cancelShowMutation = useMutation({
    mutationFn: async (showId: string) => {
      return await apiRequest("PUT", `/api/rooms/${showId}`, { ended: true });
    },
    onMutate: async (showId) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/rooms"] });
      
      // Snapshot the previous value
      const previousShows = queryClient.getQueryData(["/api/rooms", user?.id, currentPage, statusFilter]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/rooms", user?.id, currentPage, statusFilter], (old: ShowsResponse | undefined) => {
        if (!old) return old;
        
        return {
          ...old,
          rooms: old.rooms.map(show => 
            show._id === showId 
              ? { ...show, ended: true }
              : show
          )
        };
      });
      
      // Return context with the previous value
      return { previousShows };
    },
    onSuccess: () => {
      // Refetch to ensure we have the latest data from server
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ 
        title: "Show cancelled", 
        description: "The show has been cancelled successfully." 
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousShows) {
        queryClient.setQueryData(["/api/rooms", user?.id, currentPage, statusFilter], context.previousShows);
      }
      toast({ 
        title: "Failed to cancel show", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleRoomType = (show: Show) => {
    const newRoomType = show.roomType === "private" ? "public" : "private";
    toggleRoomTypeMutation.mutate({ showId: show._id, newRoomType });
  };

  const cancelShow = (showId: string) => {
    cancelShowMutation.mutate(showId);
  };

  const copyShowLink = (showId: string) => {
    const link = `${window.location.origin}/show/${showId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Show link copied to clipboard" });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset to page 1 when switching tabs
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setCurrentPage(1);
  };

  const renderShowCard = (show: Show) => {
    const now = Date.now();
    const isPastShow = show.date <= now;
    const showHasStartedOrEnded = show.started || show.ended;
    const shouldHideCancelButton = isPastShow && showHasStartedOrEnded;

    return (
      <div 
        key={show._id}
        className="border border-border rounded-lg p-4 mb-3 bg-card"
        data-testid={`show-card-${show._id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-start gap-2">
              <h3 className="text-base font-medium text-foreground" data-testid={`show-title-${show._id}`}>
                {show.title} — {format(new Date(show.date), "M/d/yyyy · h:mm a")}
              </h3>
              <button
                onClick={() => copyShowLink(show._id)}
                className="p-1 hover-elevate active-elevate-2 rounded"
                data-testid={`button-copy-link-${show._id}`}
                title="Copy show link"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {show.category && (
              <p className="text-sm text-muted-foreground mt-1">
                {show.category.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setLocation(`/show/${show._id}`)}
            data-testid={`button-open-show-${show._id}`}
          >
            Open show
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation(`/schedule-show?edit=${show._id}`)}
            data-testid={`button-edit-show-${show._id}`}
          >
            Edit show
          </Button>
          {!shouldHideCancelButton && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => cancelShow(show._id)}
              disabled={cancelShowMutation.isPending}
              data-testid={`button-cancel-show-${show._id}`}
            >
              Cancel Show
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => toggleRoomType(show)}
            disabled={toggleRoomTypeMutation.isPending}
            data-testid={`button-private-mode-${show._id}`}
          >
            {show.roomType === "private" ? "Disable" : "Enable"} Private Mode
          </Button>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages} ({showsData?.totalDoc || 0} total shows)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            data-testid="button-previous-page"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-shows-title">
            Shows
          </h1>
          <div className="flex items-center gap-2">
            <Button 
              className="bg-yellow-400 hover:bg-yellow-500 text-black dark:bg-yellow-500 dark:hover:bg-yellow-600"
              size="sm"
              onClick={() => setLocation("/schedule-show")}
              data-testid="button-schedule-show"
            >
              <Plus className="h-4 w-4 mr-1" />
              Schedule a Show
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-4" data-testid="tabs-shows">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" data-testid="content-upcoming">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : shows.length > 0 ? (
              <div>
                {shows.map(renderShowCard)}
                {renderPagination()}
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No upcoming shows</p>
                <Button 
                  onClick={() => setLocation("/schedule-show")}
                  data-testid="button-create-first-show"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Your First Show
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" data-testid="content-past">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : shows.length > 0 ? (
              <div>
                {shows.map(renderShowCard)}
                {renderPagination()}
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No past shows</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
