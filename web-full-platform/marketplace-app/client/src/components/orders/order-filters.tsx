import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";

interface OrderFiltersProps {
  onStatusFilter: (status: string) => void;
  onDateFilter: (date: string) => void;
  onPrintLabels: () => void;
}

export function OrderFilters({ onStatusFilter, onDateFilter, onPrintLabels }: OrderFiltersProps) {
  return (
    <div className="sm:flex sm:items-center sm:justify-between">
      <h3 className="text-lg font-medium text-foreground">Order Management</h3>
      <div className="mt-3 sm:mt-0 sm:ml-4 flex space-x-3">
        <Select onValueChange={onStatusFilter} data-testid="select-order-status">
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          type="date"
          className="w-auto"
          onChange={(e) => onDateFilter(e.target.value)}
          data-testid="input-date-filter"
        />
        
        <Button onClick={onPrintLabels} data-testid="button-print-labels">
          <Printer className="mr-2" size={16} />
          Print Labels
        </Button>
      </div>
    </div>
  );
}
