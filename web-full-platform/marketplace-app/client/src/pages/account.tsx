import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { 
  CheckCircle, 
  Receipt, 
  Mail, 
  Lock, 
  Trash2,
  ChevronRight
} from 'lucide-react';

export default function Account() {
  const { user } = useAuth();
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Account</h1>
        </div>

        {/* Buyer Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buyer settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verified Buyer Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm sm:text-base">Verified Buyer Status</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Once verified, you'll be able to bid in any stream.</p>
                </div>
              </div>
              <div className="text-xs sm:text-sm font-medium text-foreground pl-13 sm:pl-0">
                You're a verified buyer
              </div>
            </div>

            <Separator />

            {/* Sales Tax Exemption Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm sm:text-base">Sales tax exemption status</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Avoid paying tax on your purchases from {settings.app_name}.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" data-testid="button-setup-tax" className="ml-13 sm:ml-0 w-fit">
                Set up
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Change Email */}
            <button 
              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-accent transition-colors text-left"
              data-testid="button-change-email"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground text-sm sm:text-base">Change Email</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>

            <Separator />

            {/* Change Password */}
            <button 
              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-accent transition-colors text-left"
              data-testid="button-change-password"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground text-sm sm:text-base">Change password</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>

            <Separator />

            {/* Delete Account */}
            <button 
              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-accent transition-colors text-left"
              data-testid="button-delete-account"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground text-sm sm:text-base">Delete Account</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
