import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, MessageCircle, Users, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";

interface Following {
  _id: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  profilePhoto?: string;
  email?: string;
  followerCount?: number;
  followingCount?: number;
}

export default function Friends() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const userId = (user as any)?._id || user?.id;
  
  // Fetch friends list from API
  const { data: friendsData, isLoading } = useQuery<Following[]>({
    queryKey: [`/api/users/friends/${userId}`],
    enabled: !!userId,
  });

  const following = friendsData || [];
  
  // Filter following based on search query
  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;
    const query = searchQuery.toLowerCase();
    return following.filter(
      person => {
        const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
        const username = person.userName || '';
        const email = person.email || '';
        return fullName.toLowerCase().includes(query) ||
               username.toLowerCase().includes(query) ||
               email.toLowerCase().includes(query);
      }
    );
  }, [following, searchQuery]);

  const handleSendMessage = (person: Following) => {
    setLocation(`/inbox/${person._id}`);
    const displayName = person.userName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email;
    toast({
      title: "Opening Messages",
      description: `Starting conversation with ${displayName}`,
    });
  };
  
  const getDisplayName = (person: Following) => {
    if (person.userName) return person.userName;
    if (person.firstName || person.lastName) {
      return `${person.firstName || ''} ${person.lastName || ''}`.trim();
    }
    return person.email || 'Unknown User';
  };
  
  const getUserInitials = (person: Following) => {
    if (person.firstName || person.lastName) {
      return `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase();
    }
    if (person.userName) return person.userName[0].toUpperCase();
    if (person.email) return person.email[0].toUpperCase();
    return 'U';
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-friends">
      <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="heading-friends">
              People I Follow
            </h1>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-description">
              Users you're following • {following.length} total
            </p>
          </div>
          <Badge variant="secondary" className="text-base px-3 py-1" data-testid="badge-count-total">
            <Users className="h-4 w-4 mr-1.5" />
            {following.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people you follow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-following"
          />
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Following List */}
        {!isLoading && (
          <div className="space-y-3">
            {filteredFollowing.length > 0 ? (
              <>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground" data-testid="text-search-results">
                    Found {filteredFollowing.length} {filteredFollowing.length !== 1 ? 'people' : 'person'}
                  </p>
                )}
                <div className="space-y-3">
                  {filteredFollowing.map(person => (
                    <Card key={person._id} className="p-4 hover-elevate" data-testid={`card-following-${person._id}`}>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14" data-testid={`avatar-${person._id}`}>
                          <AvatarImage src={person.profilePhoto} alt={getDisplayName(person)} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {getUserInitials(person)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-base" data-testid={`text-name-${person._id}`}>
                            {getDisplayName(person)}
                          </p>
                          {person.userName && (
                            <p className="text-sm text-muted-foreground" data-testid={`text-username-${person._id}`}>
                              @{person.userName}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {person.followerCount !== undefined && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-followers-${person._id}`}>
                                {person.followerCount.toLocaleString()} followers
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          size="default"
                          variant="default"
                          onClick={() => handleSendMessage(person)}
                          data-testid={`button-message-${person._id}`}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : searchQuery ? (
              <Card className="p-12" data-testid="card-no-results">
                <div className="text-center">
                  <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground font-medium text-lg" data-testid="text-no-results">
                    No one found
                  </p>
                  <p className="text-sm text-muted-foreground mt-2" data-testid="text-no-results-description">
                    Try searching with a different name or username
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="p-12" data-testid="card-empty-following">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground font-medium text-lg" data-testid="text-empty-following">
                    Not following anyone yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2" data-testid="text-empty-following-description">
                    Start following people to see them here
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
