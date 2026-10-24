"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface OrderPreview {
  readonly title: string;
  readonly rows: readonly { label: string; value: string }[];
}

export function ConfirmOrderDialog({
  preview,
  submitting,
  onConfirm,
  onClose,
}: {
  preview: OrderPreview | null;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={preview !== null} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{preview?.title}</DialogTitle>
          <DialogDescription>
            This places a real order on Polymarket with your funds. Your wallet will ask you to sign it.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          {preview?.rows.map((row) => (
            <div key={row.label} className="flex justify-between">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "Signing…" : "Confirm order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
