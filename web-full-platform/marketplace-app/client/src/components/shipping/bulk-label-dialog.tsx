import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface BulkLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderCount: number;
  onConfirm: (labelFileType: string) => void;
  isPending: boolean;
}

const LABEL_FORMATS = [
  { value: "PDF_4x6", label: "4 x 6 in. (Standard Thermal)", description: "Most common thermal printer format" },
  { value: "PDF", label: "8.5 x 11 in. (Letter Size)", description: "Standard paper format" },
  { value: "PNG", label: "PNG Image (4 x 6 in.)", description: "Compatible with Dymo printers" },
  { value: "ZPLII", label: "ZPL II (Zebra Format)", description: "For Zebra thermal printers" },
];

export function BulkLabelDialog({
  open,
  onOpenChange,
  orderCount,
  onConfirm,
  isPending,
}: BulkLabelDialogProps) {
  const [labelFileType, setLabelFileType] = useState<string>("PDF_4x6");

  const handleConfirm = () => {
    onConfirm(labelFileType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Generate {orderCount} Label{orderCount !== 1 ? "s" : ""}?
          </DialogTitle>
          <DialogDescription>
            If you need to make additional changes to the shipment after creating these labels, you may be charged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label-size" className="text-sm font-medium">
              Label Size <span className="text-destructive">*</span>
            </Label>
            <Select
              value={labelFileType}
              onValueChange={setLabelFileType}
              disabled={isPending}
            >
              <SelectTrigger id="label-size" data-testid="select-label-size">
                <SelectValue placeholder="Select label size" />
              </SelectTrigger>
              <SelectContent>
                {LABEL_FORMATS.map((format) => (
                  <SelectItem 
                    key={format.value} 
                    value={format.value}
                    data-testid={`option-${format.value}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{format.label}</span>
                      <span className="text-xs text-muted-foreground">{format.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              To change label sizes after generation, please update each label individually.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel-label"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="button-confirm-label"
          >
            {isPending ? "Generating..." : `Generate Label${orderCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
