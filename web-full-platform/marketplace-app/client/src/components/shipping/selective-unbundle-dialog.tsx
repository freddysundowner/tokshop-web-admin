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
import { Package2 } from "lucide-react";
import type { IconaOrder } from "@shared/schema";

interface SelectiveUnbundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundleOrders: IconaOrder[];
  onUnbundle: (itemsByOrder: Record<string, string[]>) => void;
  isPending: boolean;
}

const statusColors = {
  unfulfilled:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  shipping: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delivered:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pickup:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

interface ItemRow {
  itemId: string;
  orderId: string;
  orderInvoice: string;
  productName: string;
  productImage?: string;
  description: string;
  quantity: number;
  weight: string;
  price: number;
  shipping: number;
  orderType: string;
  date: string;
  status: string;
}

export function SelectiveUnbundleDialog({
  open,
  onOpenChange,
  bundleOrders,
  onUnbundle,
  isPending,
}: SelectiveUnbundleDialogProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Flatten all items from all orders into a single array
  const allItems: ItemRow[] = bundleOrders.flatMap((order) => {
    if (order.giveaway) {
      return [{
        itemId: order._id, // Use order ID as item ID for giveaways
        orderId: order._id,
        orderInvoice: order.invoice?.toString() || order._id.slice(-8),
        productName: order.giveaway.name,
        productImage: order.giveaway.images?.[0],
        description: order.giveaway.description || '-',
        quantity: order.giveaway.quantity || 1,
        weight: order.giveaway.shipping_profile?.weight 
          ? `${order.giveaway.shipping_profile.weight} ${order.giveaway.shipping_profile.scale || ''}`
          : '-',
        price: 0,
        shipping: order.shipping_fee || 0,
        orderType: 'Giveaway',
        date: order.date ? new Date(order.date).toLocaleDateString() : '-',
        status: order.status || 'unfulfilled',
      }];
    } else if (order.items && order.items.length > 0) {
      return order.items.map((item, idx) => ({
        itemId: item._id || `${order._id}-${idx}`,
        orderId: order._id,
        orderInvoice: order.invoice?.toString() || order._id.slice(-8),
        productName: item.productId?.name || 'Item',
        productImage: item.productId?.images?.[0],
        description: item.productId?.category?.name || '-',
        quantity: item.quantity || 1,
        weight: item.weight ? `${item.weight} ${item.scale || ''}` : '-',
        price: item.price || 0,
        shipping: item.shipping_fee || 0,
        orderType: order.ordertype || 'Buy Now',
        date: order.date ? new Date(order.date).toLocaleDateString() : '-',
        status: order.status || 'unfulfilled',
      }));
    }
    return [];
  });

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedItemIds([]);
    }
  }, [open]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === allItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allItems.map((item) => item.itemId));
    }
  };

  const handleUnbundle = () => {
    if (selectedItemIds.length === 0) return;
    
    // Group selected items by their orderId
    const itemsByOrder = allItems
      .filter((item) => selectedItemIds.includes(item.itemId))
      .reduce((acc, item) => {
        if (!acc[item.orderId]) {
          acc[item.orderId] = [];
        }
        acc[item.orderId].push(item.itemId);
        return acc;
      }, {} as Record<string, string[]>);
    
    // Pass the grouped data to parent component
    onUnbundle(itemsByOrder);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Items to Unbundle</DialogTitle>
          <DialogDescription>
            Choose which items you want to unbundle from this bundle. Selected items will be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">
              {selectedItemIds.length} of {allItems.length} items selected
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              data-testid="button-select-all-items"
            >
              {selectedItemIds.length === allItems.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">
                    <Checkbox
                      checked={selectedItemIds.length === allItems.length && allItems.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all-header"
                    />
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Listing</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Weight</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Sale Price</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Shipping</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Order Type</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.itemId);
                  return (
                    <tr
                      key={item.itemId}
                      className={`border-b cursor-pointer hover:bg-muted/30 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                      onClick={() => handleToggleItem(item.itemId)}
                      data-testid={`row-item-${item.itemId}`}
                    >
                      <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleItem(item.itemId)}
                          data-testid={`checkbox-item-${item.itemId}`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          {item.productImage ? (
                            <img 
                              src={item.productImage} 
                              alt={item.productName}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <Package2 size={16} className="text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">#{item.orderInvoice}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{item.description}</td>
                      <td className="py-2 px-2">{item.quantity}</td>
                      <td className="py-2 px-2">{item.weight}</td>
                      <td className="py-2 px-2">${item.price.toFixed(2)}</td>
                      <td className="py-2 px-2">${item.shipping.toFixed(2)}</td>
                      <td className="py-2 px-2">{item.orderType}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{item.date}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded-md text-xs ${statusColors[item.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
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
            {isPending
              ? "Unbundling..."
              : `Unbundle ${selectedItemIds.length} Item${selectedItemIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
