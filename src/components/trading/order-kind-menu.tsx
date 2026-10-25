"use client";

import { PanelMenu } from "./panel-menu";
import type { OrderKind } from "@/lib/trading/ticket";

/** Order types offered by the trade panel; Limit is the default and listed first. */
export const ORDER_KINDS: readonly { value: OrderKind; label: string }[] = [
  { value: "limit", label: "Limit" },
  { value: "market", label: "Market" },
];

/** "Limit ▾" dropdown that switches between Limit and Market. */
export function OrderKindMenu({ value, onChange }: { value: OrderKind; onChange: (kind: OrderKind) => void }) {
  return <PanelMenu name="Order type" value={value} options={ORDER_KINDS} onChange={onChange} />;
}
