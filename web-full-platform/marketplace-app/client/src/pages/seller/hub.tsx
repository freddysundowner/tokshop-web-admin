import { Link, useLocation } from 'wouter';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  Calendar,
  Radio,
  Truck,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';

export default function SellerHub() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const userId = (user as any)?._id || user?.id;

  // Fetch fresh user data to check current seller status
  const { data: freshUserData, isLoading: userLoading } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId,
  });

  // Use fresh user data instead of cached auth context
  const currentUser = freshUserData || user;

  // Redirect based on seller status (using fresh data)
  useEffect(() => {
    if (freshUserData && !freshUserData.seller) {
      console.log('Seller hub: User is not a seller, redirecting to /seller/setup');
      // If user has applied but not approved, still go to setup page (which will show review status)
      setLocation('/seller/setup');
    }
  }, [freshUserData, setLocation]);

  // Show loading while fetching fresh user data
  if (userLoading || !freshUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not a seller
  if (!currentUser?.seller) {
    return null;
  }

  // Quick actions
  const quickActions = [
    { label: 'List an Item', icon: Plus, href: '/inventory/add', variant: 'default' as const },
    { label: 'Schedule Show', icon: Calendar, href: '/schedule-show', variant: 'outline' as const },
    { label: 'Go Live', icon: Radio, href: '/live-shows', variant: 'outline' as const },
    { label: 'Ship Orders', icon: Truck, href: '/orders', variant: 'outline' as const },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" data-testid="page-seller-hub">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-seller-hub-title">
          Seller Hub
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome back, {currentUser?.userName || currentUser?.firstName || 'Seller'}! Here's your store overview.
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Button
                  variant={action.variant}
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-xs sm:text-sm">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
