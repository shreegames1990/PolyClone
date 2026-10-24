"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TradeActionButton } from "./trade-action-button";
import { ConfirmOrderDialog, type OrderPreview } from "./confirm-order-dialog";
import { useTrading } from "./trading-provider";
import { useTokenBalance } from "@/hooks/use-trading-data";
import { buildTicket, type OrderKind } from "@/lib/trading/ticket";
import { placeOrder, type OrderTicket } from "@/lib/trading/orders";
import { describeOrderStatus } from "@/lib/trading/errors";
import type { OrderSide } from "@/lib/trading/order-math";
import type { OrderBook } from "@/lib/polymarket/orderbook";
import type { Market } from "@/lib/polymarket/types";
import { formatCents, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  market: Market;
  outcomeIndex: number;
  onOutcomeChange: (index: number) => void;
  book: OrderBook | undefined;
  /** Market orders are priced from the live book, so they need a live socket. */
  bookLive: boolean;
}

type Confirmed = { ticket: OrderTicket; preview: OrderPreview };

/** Keyed by token in the parent so the form resets when the outcome changes. */
export function TradePanel({ market, outcomeIndex, onOutcomeChange, book, bookLive }: Props) {
  const { client, status } = useTrading();
  const queryClient = useQueryClient();
  const [side, setSide] = useState<OrderSide>("BUY");
  const [kind, setKind] = useState<OrderKind>("market");
  const [amount, setAmount] = useState("");
  const [limitPriceCents, setLimitPriceCents] = useState("");
  const [shares, setShares] = useState("");
  // Frozen at click time: the order signed is exactly the order shown, even if the book moves.
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const outcome = market.outcomes[outcomeIndex];
  const collateral = useTokenBalance();
  const position = useTokenBalance(outcome?.tokenId);

  if (!outcome) return null;

  const balanceKnown = status === "ready";
  const result = buildTicket({
    tokenId: outcome.tokenId,
    outcomeName: outcome.name,
    side,
    kind,
    amount,
    limitPriceCents,
    shares,
    tickSize: book?.tickSize ?? market.tickSize,
    minSize: book?.minOrderSize ?? market.minSize,
    book,
    available: !balanceKnown ? undefined : side === "BUY" ? collateral.data : position.data,
  });
  const staleBook = kind === "market" && !bookLive;

  const openConfirm = () => {
    if (result.ticket && result.preview && !staleBook) setConfirmed({ ticket: result.ticket, preview: result.preview });
  };

  const submit = async () => {
    if (!client || !confirmed || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const response = await placeOrder(client, confirmed.ticket);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      const status = describeOrderStatus(response.status);
      toast[status.tone](status.message);
      if (status.done) {
        setAmount("");
        setShares("");
      }
      await queryClient.invalidateQueries({ queryKey: ["balance"] });
      await queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
      setConfirmed(null);
    }
  };

  const balanceLabel =
    status !== "ready"
      ? null
      : side === "BUY"
        ? `Balance: ${formatUsd(collateral.data)}`
        : `You own: ${(position.data ?? 0).toFixed(2)} shares`;

  return (
    <Card className="gap-4 p-4">
      <p className="line-clamp-2 text-sm font-medium">{market.label}</p>

      <div className="flex items-center justify-between border-b">
        <div className="flex">
          {(["BUY", "SELL"] as const).map((s) => (
            <TabButton key={s} active={side === s} onClick={() => setSide(s)}>
              {s === "BUY" ? "Buy" : "Sell"}
            </TabButton>
          ))}
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as OrderKind)}
          className="bg-transparent text-sm text-muted-foreground"
          aria-label="Order type"
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {market.outcomes.slice(0, 2).map((o, i) => (
          <button
            key={o.tokenId}
            type="button"
            onClick={() => onOutcomeChange(i)}
            className={cn(
              "rounded-md py-2.5 text-sm font-semibold",
              i === outcomeIndex
                ? i === 0
                  ? "bg-yes text-white"
                  : "bg-no text-white"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {o.name} {formatCents(o.price)}
          </button>
        ))}
      </div>

      {kind === "market" ? (
        <Field label={side === "BUY" ? "Amount ($)" : "Shares"} hint={balanceLabel}>
          <Input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      ) : (
        <>
          <Field label="Limit price (¢)">
            <Input inputMode="decimal" placeholder="50" value={limitPriceCents} onChange={(e) => setLimitPriceCents(e.target.value)} />
          </Field>
          <Field label="Shares" hint={balanceLabel}>
            <Input inputMode="decimal" placeholder="0" value={shares} onChange={(e) => setShares(e.target.value)} />
          </Field>
        </>
      )}

      {result.estimate && (
        <dl className="space-y-1 text-sm">
          <Row label="Avg. price" value={formatCents(result.estimate.avgPrice)} />
          <Row label="Shares" value={result.estimate.shares.toFixed(2)} />
          <Row label={side === "BUY" ? "Payout if it wins" : "Proceeds"} value={formatUsd(result.estimate.payout)} highlight />
        </dl>
      )}
      {result.error && <p className="text-sm text-no">{result.error}</p>}
      {staleBook && <p className="text-sm text-muted-foreground">Reconnecting to live prices…</p>}

      <TradeActionButton
        label={`${side === "BUY" ? "Buy" : "Sell"} ${outcome.name}`}
        disabled={!market.tradable || !result.ticket || staleBook}
        onSubmit={openConfirm}
      />
      {!market.tradable && <p className="text-center text-xs text-muted-foreground">This market is not accepting orders.</p>}

      <ConfirmOrderDialog
        preview={confirmed?.preview ?? null}
        submitting={submitting}
        onConfirm={submit}
        onClose={() => setConfirmed(null)}
      />
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", active ? "border-foreground" : "border-transparent text-muted-foreground")}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string | null; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {hint && <span>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", highlight && "font-semibold text-yes")}>{value}</dd>
    </div>
  );
}
