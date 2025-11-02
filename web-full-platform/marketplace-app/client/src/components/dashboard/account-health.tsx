import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccountHealth() {
  return (
    <div className="mb-8">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircle className="text-green-400 text-xl" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Account Health: Excellent
            </h3>
            <div className="mt-1 text-sm text-green-700 dark:text-green-300">
              <p>Your seller performance meets all standards. Keep up the great work!</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button 
              variant="ghost" 
              className="text-green-600 hover:text-green-700 text-sm font-medium"
              data-testid="button-view-health-details"
            >
              View Details 
              <ArrowRight className="ml-1" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
