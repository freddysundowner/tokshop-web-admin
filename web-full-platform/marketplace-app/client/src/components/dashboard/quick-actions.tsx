import { Button } from "@/components/ui/button";
import { Plus, Truck, Package, FileDown } from "lucide-react";
import { useLocation } from "wouter";

export function QuickActions() {
  const [, setLocation] = useLocation();

  const actions = [
    {
      label: "Create Show",
      icon: Plus,
      action: () => {},  // TODO: Implement create show functionality
      testId: "button-create-show",
    },
    {
      label: "Ship Orders",
      icon: Truck,
      action: () => setLocation("/shipping"),
      testId: "button-ship-orders",
    },
    {
      label: "Manage Inventory",
      icon: Package,
      action: () => setLocation("/inventory"),
      testId: "button-manage-inventory",
    },
    {
      label: "Export Report",
      icon: FileDown,
      action: () => {},  // TODO: Implement export report functionality
      testId: "button-export-report",
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-foreground mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="bg-card hover:bg-accent border border-border rounded-lg p-4 h-auto flex-col text-center transition-colors"
            onClick={action.action}
            data-testid={action.testId}
          >
            <action.icon className="text-primary text-2xl mb-2" />
            <div className="text-sm font-medium text-foreground">{action.label}</div>
          </Button>
        ))}
      </div>
    </div>
  );
}
