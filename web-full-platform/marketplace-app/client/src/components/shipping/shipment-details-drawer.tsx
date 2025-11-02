import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, MapPin, Download, ExternalLink } from "lucide-react";
import type { IconaOrder } from "@shared/schema";

interface ShipmentDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: IconaOrder | null;
}

export function ShipmentDetailsDrawer({ open, onOpenChange, order }: ShipmentDetailsDrawerProps) {
  if (!order) return null;

  const trackingNumber = order.tracking_number || (order as any).tracking_url?.split('=')[1];
  const labelUrl = order.label || (order as any).shipping_label_url;
  const carrier = (order as any).carrier || 'USPS';
  const service = order.servicelevel || (order as any).service || 'Standard';
  const shippingCost = order.shipping_fee || (order as any).total_shipping_cost || 0;
  const sellerCost = (order as any).seller_shipping_fee_pay || 0;

  // Get package details
  const weight = order.giveaway?.shipping_profile?.weight || order.items?.[0]?.weight;
  const scale = order.giveaway?.shipping_profile?.scale || order.items?.[0]?.scale || 'oz';
  const length = order.giveaway?.length || order.items?.[0]?.length;
  const width = order.giveaway?.width || order.items?.[0]?.width;
  const height = order.giveaway?.height || order.items?.[0]?.height;

  // Get shipping address
  const address = order.customer?.address;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipment Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tracking Information */}
          {trackingNumber && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Tracking Information</h3>
              </div>
              <div className="bg-muted/50 rounded-md p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tracking Number</p>
                  <p className="font-mono text-sm font-medium">{trackingNumber}</p>
                </div>
                {(order as any).tracking_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open((order as any).tracking_url, '_blank')}
                    data-testid="button-track-package"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Track Package
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Shipping Label */}
          {labelUrl && (
            <div className="space-y-3">
              <h3 className="font-medium">Shipping Label</h3>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(labelUrl, '_blank')}
                data-testid="button-download-label"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Label
              </Button>
            </div>
          )}

          <Separator />

          {/* Carrier & Service */}
          <div className="space-y-3">
            <h3 className="font-medium">Service Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Carrier</p>
                <Badge variant="secondary">{carrier}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Service</p>
                <p className="text-sm">{service}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Costs */}
          <div className="space-y-3">
            <h3 className="font-medium">Shipping Costs</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Buyer Paid</p>
                <p className="text-sm font-medium">${shippingCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Your Cost</p>
                <p className="text-sm font-medium">${sellerCost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Package Details */}
          {(weight || (length && width && height)) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-medium">Package Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  {weight && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Weight</p>
                      <p className="text-sm">{weight} {scale}</p>
                    </div>
                  )}
                  {length && width && height && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Dimensions</p>
                      <p className="text-sm">{length} × {width} × {height}"</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Shipping Address */}
          {address && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Shipping Address</h3>
                </div>
                <div className="bg-muted/50 rounded-md p-4 space-y-1 text-sm">
                  {(address.firstName || address.lastName) && (
                    <p className="font-medium">
                      {address.firstName} {address.lastName}
                    </p>
                  )}
                  {address.addrress1 && <p>{address.addrress1}</p>}
                  {address.addrress2 && <p>{address.addrress2}</p>}
                  <p>
                    {address.city}, {address.state} {address.zipcode}
                  </p>
                  {address.country && <p>{address.country}</p>}
                </div>
              </div>
            </>
          )}

          {/* Order Information */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-medium">Order Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                <p className="font-mono">#{order.invoice || order._id.slice(-8)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant="outline">{order.status}</Badge>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
