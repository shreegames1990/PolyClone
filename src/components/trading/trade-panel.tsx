"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
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
import { maxSpendAfterFees } from "@/lib/trading/fees";
import { defaultLimitCents } from "@/lib/trading/limit-default";
import { OrderKindMenu } from "./order-kind-menu";
import { PanelMenu } from "./panel-menu";
import { EXPIRY_OPTIONS, type ExpiryOption } from "@/lib/trading/expiry";
import type { Team } from "@/lib/polymarket/types";
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
  /** Side the form opens on (e.g. "SELL" from a position's Sell button). */
  initialSide?: OrderSide;
  /** Team behind the selection: its logo, name color and button color (polymarket.com). */
  team?: Team;
}

type Confirmed = { ticket: OrderTicket; preview: OrderPreview };

/** Keyed by token in the parent so the form resets when the outcome changes. */
export function TradePanel({
  eventTitle,
  eventImage,
  market,
  outcomeIndex,
  onOutcomeChange,
  book,
  bookLive,
  initialSide = "BUY",
  team,
}: Props) {
  const { client, status } = useTrading();
  const queryClient = useQueryClient();
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [kind, setKind] = useState<OrderKind>("limit");
  const [amount, setAmount] = useState("");
  // Limit is the default: prefill the selected outcome's current price (on the tick grid).
  const [limitPriceCents, setLimitPriceCents] = useState(() =>
    defaultLimitCents(market.outcomes[outcomeIndex]?.price, book?.tickSize ?? market.tickSize),
  );
  const [shares, setShares] = useState("");
  const [expiry, setExpiry] = useState<ExpiryOption>("never");
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
    fee: market.fee,
    expiry,
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
  // Leave room for the taker fee, priced at the best ask (the cheapest fill has the highest fee share).
  const maxMarketSpend = () => maxSpendAfterFees(collateral.data ?? 0, book?.asks[0]?.price ?? outcome.price, market.fee);
  const sharesMax = balanceKnown
    ? () =>
        isBuy ? setShares(maxBuyShares(collateral.data, limitPriceCents, market.fee)) : setShares(String(position.data ?? 0))
    : undefined;

  const heading = team ? team.alias || team.name : market.label === eventTitle ? outcome.name : market.label;

  return (
    <Card className="overflow-hidden rounded-[1.5rem]">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <MarketImage src={team?.logo || eventImage} alt="" size={48} className={team ? "object-contain" : undefined} />
        <div className="min-w-0">
          <p className="truncate text-body text-base-content/70">{eventTitle}</p>
          <p className="truncate text-heading" style={{ color: team?.color || "var(--color-accent)" }}>
            {heading}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border px-5">
        <div role="tablist" className="tabs tabs-border">
          {(["BUY", "SELL"] as const).map((s) => (
            <TabButton key={s} active={side === s} onClick={() => setSide(s)}>
              {s === "BUY" ? "Buy" : "Sell"}
            </TabButton>
          ))}
        </div>
        <OrderKindMenu value={kind} onChange={setKind} />
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 pt-5 pb-4">
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
            <span className="truncate font-medium">{o.name}</span> {formatCents(o.price)}
          </OutcomeButton>
        ))}
      </div>

      {kind === "limit" ? (
        <>
          <div className="border-b border-border px-5 pb-4">
            <FieldRow label="Limit price">
              <PriceStepper
                value={limitPriceCents}
                onChange={setLimitPriceCents}
                onStep={(dir) => setLimitPriceCents((v) => stepLimitPrice(v, tickSize, dir, fallbackCents))}
              />
            </FieldRow>
          </div>
          <div className="space-y-3 px-5 pt-4 pb-8">
            <FieldRow label="Shares" hint={balanceLabel}>
              <AmountInput label="Shares" value={shares} onChange={setShares} />
            </FieldRow>
            <QuickChips deltas={QUICK_SHARES} format={signed} onAdd={(d) => setShares((v) => adjustAmount(v, d))} onMax={sharesMax} />
          </div>
        </>
      ) : (
        <div className="space-y-3 px-5 pb-8">
          <FieldRow label={dollarAmount ? "Amount" : "Shares"} hint={balanceLabel}>
            <AmountInput
              label={dollarAmount ? "Amount in dollars" : "Shares"}
              prefix={dollarAmount ? "$" : undefined}
              value={amount}
              onChange={setAmount}
            />
          </FieldRow>
          <QuickChips
            deltas={dollarAmount ? QUICK_DOLLARS : QUICK_SHARES}
            format={dollarAmount ? (d) => `+$${d}` : signed}
            onAdd={(d) => setAmount((v) => adjustAmount(v, d))}
            onMax={balanceKnown ? () => setAmount(String(isBuy ? maxMarketSpend() : (position.data ?? 0))) : undefined}
          />
        </div>
      )}

      <div className="space-y-3 border-t border-border px-5 pt-4 pb-5">
        {kind === "limit" && (
          <div className="flex items-center justify-between text-body text-base-content/60">
            <span>Expires</span>
            <PanelMenu name="Expires" value={expiry} options={EXPIRY_OPTIONS} onChange={setExpiry} muted />
          </div>
        )}
        {isBuy && (result.estimate?.fee ?? 0) > 0 && (
          <div className="flex items-baseline justify-between text-body-sm text-base-content/60">
            <span>Est. fee</span>
            <span className="tabular-nums">{formatUsd(result.estimate!.fee)}</span>
          </div>
        )}
        <SummaryLine
          label={isBuy ? "Total" : "You'll receive"}
          value={formatUsd(isBuy ? (result.estimate?.cost ?? 0) + (result.estimate?.fee ?? 0) : (result.estimate?.payout ?? 0))}
          tone="info"
        />
        {isBuy && <SummaryLine label="To win" value={formatUsd(result.estimate?.payout ?? 0)} tone="yes" />}
        {result.error && <p className="text-body-sm text-no">{result.error}</p>}
        {staleBook && <p className="text-body-sm text-base-content/60">Reconnecting to live prices…</p>}

        <div className="pt-1">
          <TradeActionButton
            label={`Place ${isBuy ? "buy" : "sell"} order`}
            disabled={!market.tradable || !result.ticket || staleBook}
            onSubmit={openConfirm}
            color={team?.color || undefined}
          />
        </div>
        {!market.tradable && <p className="text-center text-caption text-base-content/60">This market is not accepting orders.</p>}
      </div>

      <ConfirmOrderDialog
        preview={confirmed?.preview ?? null}
        submitting={submitting}
        onConfirm={submit}
        onClose={() => setConfirmed(null)}
      />
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
      className={cn("tab h-12 px-0 pr-5 text-heading font-semibold", active ? "tab-active" : "text-base-content/60")}
    >
      {children}
    </button>
  );
}
