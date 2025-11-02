import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";
import type { LiveShow } from "@shared/schema";
import { format } from "date-fns";

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  live: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ended: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function UpcomingShows() {
  const { data: shows, isLoading } = useQuery<LiveShow[]>({
    queryKey: ["/api/shows"],
  });

  if (isLoading) {
    return (
      <Card className="shadow border border-border">
        <CardHeader className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">Upcoming Shows</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const upcomingShows = shows?.slice(0, 3) || [];

  return (
    <Card className="shadow border border-border">
      <CardHeader className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Upcoming Shows</h3>
          <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 font-medium" data-testid="button-schedule-new">
            Schedule New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {upcomingShows.map((show) => (
            <div key={show.id} className="flex items-center space-x-4" data-testid={`show-${show.id}`}>
              <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Video className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{show.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(show.scheduledAt), "MMM d 'at' h:mm a")}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Badge 
                  className={statusColors[show.status as keyof typeof statusColors]}
                  data-testid={`show-status-${show.status}`}
                >
                  {show.status.charAt(0).toUpperCase() + show.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
