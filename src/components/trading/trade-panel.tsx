"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardBody } from "@/components/ui/card";
import { MarketImage } from "@/components/markets/market-image";
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
import { OutcomeButton, toneForIndex } from "@/components/ui/outcome-button";
import { AmountInput, FieldRow, PriceStepper, QuickChips, SummaryLine } from "./trade-panel-parts";
import { adjustAmount, maxBuyShares, QUICK_DOLLARS, QUICK_SHARES, stepLimitPrice } from "@/lib/trading/quick-amount";
import { formatCents, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  eventTitle: string;
  eventImage: string;
  market: Market;
  outcomeIndex: number;
  onOutcomeChange: (index: number) => void;
  book: OrderBook | undefined;
  /** Market orders are priced from the live book, so they need a live socket. */
  bookLive: boolean;
}

type Confirmed = { ticket: OrderTicket; preview: OrderPreview };

/** Keyed by token in the parent so the form resets when the outcome changes. */
export function TradePanel({ eventTitle, eventImage, market, outcomeIndex, onOutcomeChange, book, bookLive }: Props) {
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
        ? `${formatUsd(collateral.data)} cash`
        : `${(position.data ?? 0).toFixed(2)} shares owned`;

  const isBuy = side === "BUY";
  const dollarAmount = kind === "market" && isBuy;
  const tickSize = book?.tickSize ?? market.tickSize;
  const fallbackCents = Math.round(outcome.price * 100) || undefined;
  const sharesMax = balanceKnown
    ? () => (isBuy ? setShares(maxBuyShares(collateral.data, limitPriceCents)) : setShares(String(position.data ?? 0)))
    : undefined;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <MarketImage src={eventImage} alt="" size={44} />
          <div className="min-w-0">
            <p className="truncate text-body-sm text-base-content/70">{eventTitle}</p>
            <p className="truncate text-heading text-accent">{market.label === eventTitle ? outcome.name : market.label}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border">
          <div role="tablist" className="tabs tabs-border">
            {(["BUY", "SELL"] as const).map((s) => (
              <TabButton key={s} active={side === s} onClick={() => setSide(s)}>
                {s === "BUY" ? "Buy" : "Sell"}
              </TabButton>
            ))}
          </div>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as OrderKind)}
            className="select select-ghost select-sm w-auto text-body-sm font-semibold"
            aria-label="Order type"
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {market.outcomes.slice(0, 2).map((o, i) => (
            <OutcomeButton
              key={o.tokenId}
              look="solid"
              size="lg"
              tone={toneForIndex(i)}
              selected={i === outcomeIndex}
              onClick={() => onOutcomeChange(i)}
              title={o.name}
            >
              <span className="truncate">{o.name}</span> {formatCents(o.price)}
            </OutcomeButton>
          ))}
        </div>

        {kind === "limit" ? (
          <>
            <FieldRow label="Limit price">
              <PriceStepper
                value={limitPriceCents}
                onChange={setLimitPriceCents}
                onStep={(dir) => setLimitPriceCents((v) => stepLimitPrice(v, tickSize, dir, fallbackCents))}
              />
            </FieldRow>
            <FieldRow label="Shares" hint={balanceLabel}>
              <AmountInput label="Shares" value={shares} onChange={setShares} />
            </FieldRow>
            <QuickChips deltas={QUICK_SHARES} format={signed} onAdd={(d) => setShares((v) => adjustAmount(v, d))} onMax={sharesMax} />
          </>
        ) : (
          <>
            <FieldRow label={dollarAmount ? "Amount" : "Shares"} hint={balanceLabel}>
              <AmountInput label={dollarAmount ? "Amount in dollars" : "Shares"} prefix={dollarAmount ? "$" : undefined} value={amount} onChange={setAmount} />
            </FieldRow>
            <QuickChips
              deltas={dollarAmount ? QUICK_DOLLARS : QUICK_SHARES}
              format={dollarAmount ? (d) => `+$${d}` : signed}
              onAdd={(d) => setAmount((v) => adjustAmount(v, d))}
              onMax={balanceKnown ? () => setAmount(String((isBuy ? collateral.data : position.data) ?? 0)) : undefined}
            />
          </>
        )}

        <div className="space-y-1 border-t border-border pt-4">
          <SummaryLine label={isBuy ? "Total" : "You'll receive"} value={formatUsd(isBuy ? (result.estimate?.cost ?? 0) : (result.estimate?.payout ?? 0))} tone="info" />
          {isBuy && <SummaryLine label="To win" value={formatUsd(result.estimate?.payout ?? 0)} tone="yes" />}
        </div>
        {result.error && <p className="text-body-sm text-no">{result.error}</p>}
        {staleBook && <p className="text-body-sm text-base-content/60">Reconnecting to live prices…</p>}

        <TradeActionButton
          label={`Place ${isBuy ? "buy" : "sell"} order`}
          disabled={!market.tradable || !result.ticket || staleBook}
          onSubmit={openConfirm}
        />
        {!market.tradable && <p className="text-center text-caption text-base-content/60">This market is not accepting orders.</p>}

        <ConfirmOrderDialog
          preview={confirmed?.preview ?? null}
          submitting={submitting}
          onConfirm={submit}
          onClose={() => setConfirmed(null)}
        />
      </CardBody>
    </Card>
  );
}

const signed = (d: number) => (d > 0 ? `+${d}` : String(d));

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("tab px-1 text-body font-semibold", active ? "tab-active" : "text-base-content/60")}
    >
      {children}
    </button>
  );
}
