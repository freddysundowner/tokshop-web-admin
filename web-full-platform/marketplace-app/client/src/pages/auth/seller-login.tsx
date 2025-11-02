import { Link } from 'wouter';
import Login from './login';
import { useSettings } from '@/lib/settings-context';

export default function SellerLogin() {
  const { settings } = useSettings();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple header */}
      <header className="border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" data-testid="link-home">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-foreground rounded-full flex items-center justify-center">
                  <span className="text-background text-sm font-bold">{settings.app_name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-xl font-bold">{settings.app_name}</span>
              </div>
            </Link>
            <Link href="/">
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                Back to Marketplace
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Login component */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Seller Login</h1>
            <p className="text-muted-foreground">Access your seller dashboard to manage inventory, orders, and live shows</p>
          </div>
          <Login />
        </div>
      </div>
    </div>
  );
}
