import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package } from "lucide-react";
import type { IconaOrder } from "@shared/schema";

interface UnbundleItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: IconaOrder | null;
  onUnbundle: (itemIds: string[]) => void;
  isPending: boolean;
}

export function UnbundleItemsDialog({
  open,
  onOpenChange,
  order,
  onUnbundle,
  isPending,
}: UnbundleItemsDialogProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Reset selections when dialog opens or order changes
  useEffect(() => {
    if (open) {
      setSelectedItemIds([]);
    }
  }, [open, order]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (!order?.items) return;
    if (selectedItemIds.length === order.items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(order.items.map((item) => item._id).filter((id): id is string => !!id));
    }
  };

  const handleUnbundle = () => {
    if (selectedItemIds.length === 0) return;
    onUnbundle(selectedItemIds);
    setSelectedItemIds([]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedItemIds([]);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedItemIds([]);
    }
    onOpenChange(newOpen);
  };

  if (!order?.items) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Items to Unbundle</DialogTitle>
          <DialogDescription>
            Choose which items you want to split into separate orders. Selected
            items will be removed from this order and created as new individual orders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">
              {selectedItemIds.length} of {order.items.length} selected
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              data-testid="button-select-all-items"
            >
              {selectedItemIds.length === order.items.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {order.items.filter(item => item._id).map((item) => {
              const itemId = item._id!;
              const isSelected = selectedItemIds.includes(itemId);

              return (
                <Card
                  key={itemId}
                  className={`p-4 cursor-pointer transition-colors hover-elevate ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleToggleItem(itemId)}
                  data-testid={`item-card-${itemId}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleItem(itemId)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`checkbox-item-${itemId}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {item.productId?.name || "Item"}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground space-y-1">
                            <div>Quantity: {item.quantity || 1}</div>
                            <div>
                              Price: ${(item.price || 0).toFixed(2)} each
                            </div>
                            {item.weight && (
                              <div>
                                Weight: {item.weight}
                                {item.scale || "oz"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
            data-testid="button-cancel-unbundle"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUnbundle}
            disabled={selectedItemIds.length === 0 || isPending}
            data-testid="button-confirm-unbundle"
          >
            {isPending ? "Unbundling..." : `Unbundle ${selectedItemIds.length} Item${selectedItemIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
