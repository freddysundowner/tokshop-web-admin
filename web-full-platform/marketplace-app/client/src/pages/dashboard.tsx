import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { UpcomingShows } from "@/components/dashboard/upcoming-shows";
import { AccountHealth } from "@/components/dashboard/account-health";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function Dashboard() {
  return (
    <div className="py-6">
      <div className="px-4 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back! Here's what's happening with your store.
          </p>
        </div>

        {/* Account Health */}
        <AccountHealth />

        {/* Metrics Grid */}
        <MetricsGrid />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SalesChart />
          <RevenueChart />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Recent Orders and Upcoming Shows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentOrders />
          <UpcomingShows />
        </div>
      </div>
    </div>
  );
}
