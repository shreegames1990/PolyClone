import type { OrderBook } from "@/lib/polymarket/orderbook";
import { feeShareOfSpend, takerFeeUsd, type FeeSchedule } from "./fees";
import { expiryLabel, type ExpiryOption } from "./expiry";
import type { TickSize } from "@/lib/polymarket/types";
import { formatCents, formatUsd } from "@/lib/format";
import {
  estimateMarketBuy,
  estimateMarketSell,
  limitOrderSummary,
  validateLimitOrder,
  validateMarketOrder,
  type OrderSide,
} from "./order-math";
import type { OrderTicket } from "./orders";

export type OrderKind = "market" | "limit";

export interface TicketInput {
  readonly tokenId: string;
  readonly outcomeName: string;
  readonly side: OrderSide;
  readonly kind: OrderKind;
  /** Market orders: dollars to spend (BUY) or shares to sell (SELL). */
  readonly amount: string;
  readonly limitPriceCents: string;
  readonly shares: string;
  readonly tickSize: TickSize;
  readonly minSize: number;
  readonly book: OrderBook | undefined;
  /** pUSD balance (BUY) or shares held (SELL); undefined when unknown. */
  readonly available: number | undefined;
  /** Market taker fee schedule; buys must cover amount + fee. */
  readonly fee?: FeeSchedule | null;
  /** Limit order expiry (default good-till-cancelled). */
  readonly expiry?: ExpiryOption;
}

export interface TicketEstimate {
  readonly shares: number;
  readonly cost: number;
  /** BUY: payout if the outcome wins. SELL: proceeds. */
  readonly payout: number;
  readonly avgPrice: number;
  /** Estimated taker fee in dollars (buys); 0 when the market has no fees. */
  readonly fee: number;
}

export interface TicketResult {
  readonly ticket: OrderTicket | null;
  readonly error: string | null;
  readonly estimate: TicketEstimate | null;
  readonly preview: { title: string; rows: { label: string; value: string }[] } | null;
}

const EMPTY: TicketResult = { ticket: null, error: null, estimate: null, preview: null };

/** Polymarket rejects marketable BUY orders under $1. */
const MIN_MARKET_BUY_USD = 1;
const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;
const INVALID_NUMBER = "Enter a valid number.";

/** null = empty field, NaN = not a plain decimal. */
function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return DECIMAL.test(trimmed) ? Number(trimmed) : Number.NaN;
}

function balanceError(input: TicketInput, needed: number): string | null {
  if (input.available === undefined || needed <= input.available + 1e-9) return null;
  return input.side === "BUY"
    ? "Not enough pUSD for this order."
    : `You only own ${input.available.toFixed(2)} shares.`;
}

function marketTicket(input: TicketInput): TicketResult {
  const amount = parseDecimal(input.amount);
  if (amount === null) return EMPTY;
  if (Number.isNaN(amount)) return { ...EMPTY, error: INVALID_NUMBER };
  if (input.side === "BUY" && amount > 0 && amount < MIN_MARKET_BUY_USD) {
    return { ...EMPTY, error: `Minimum market buy is $${MIN_MARKET_BUY_USD}.` };
  }
  if (!input.book) return { ...EMPTY, error: "Waiting for the order book…" };

  const isBuy = input.side === "BUY";
  const buy = isBuy ? estimateMarketBuy(input.book.asks, amount) : null;
  const sell = isBuy ? null : estimateMarketSell(input.book.bids, amount);
  const est = buy ?? sell!;
  // Fee share is highest at the cheapest fill, so budget at the best ask.
  const fee = isBuy ? amount * feeShareOfSpend(input.book.asks[0]?.price ?? est.avgPrice, input.fee ?? null) : 0;
  const estimate: TicketEstimate = {
    shares: buy ? buy.shares : amount,
    cost: isBuy ? amount : 0,
    payout: buy ? buy.shares : sell!.proceeds,
    avgPrice: est.avgPrice,
    fee,
  };
  const error = validateMarketOrder({ amount, filled: est.filled }) ?? balanceError(input, isBuy ? amount + fee : amount);
  if (error) return { ...EMPTY, error, estimate };

  return {
    ticket: { kind: "market", tokenId: input.tokenId, side: input.side, amount, worstPrice: est.worstPrice },
    error: null,
    estimate,
    preview: {
      title: `${isBuy ? "Buy" : "Sell"} ${input.outcomeName}`,
      rows: [
        { label: "Order type", value: "Market (fill or kill)" },
        { label: isBuy ? "Spend" : "Shares", value: isBuy ? formatUsd(amount) : amount.toFixed(2) },
        { label: "Avg. price", value: formatCents(est.avgPrice) },
        { label: isBuy ? "Max price" : "Min price", value: formatCents(est.worstPrice) },
        { label: isBuy ? "Payout if it wins" : "Est. proceeds", value: formatUsd(estimate.payout) },
      ],
    },
  };
}

function limitTicket(input: TicketInput): TicketResult {
  const cents = parseDecimal(input.limitPriceCents);
  const rawShares = parseDecimal(input.shares);
  // The limit price is prefilled, so an order only starts once shares are entered.
  if (rawShares === null) return EMPTY;
  if (Number.isNaN(cents) || Number.isNaN(rawShares)) return { ...EMPTY, error: INVALID_NUMBER };
  const price = (cents ?? Number.NaN) / 100;
  const shares = rawShares ?? Number.NaN;

  const summary = limitOrderSummary({ side: input.side, price, shares });
  // Budget the taker fee for buys: a marketable limit order fills as a taker.
  const fee = input.side === "BUY" ? takerFeeUsd(shares, price, input.fee ?? null) : 0;
  const error =
    validateLimitOrder({ price, shares, tickSize: input.tickSize, minSize: input.minSize }) ??
    balanceError(input, input.side === "BUY" ? summary.total + fee : shares);
  if (error) return { ...EMPTY, error };

  const estimate: TicketEstimate = { shares, cost: summary.total, payout: summary.payout, avgPrice: price, fee };
  const isBuy = input.side === "BUY";
  return {
    ticket: { kind: "limit", tokenId: input.tokenId, side: input.side, price, shares, expiry: input.expiry ?? "never" },
    error: null,
    estimate,
    preview: {
      title: `${isBuy ? "Buy" : "Sell"} ${input.outcomeName}`,
      rows: [
        { label: "Order type", value: (input.expiry ?? "never") === "never" ? "Limit (good till cancelled)" : "Limit (good till date)" },
        { label: "Expires", value: expiryLabel(input.expiry ?? "never") },
        { label: "Limit price", value: formatCents(price) },
        { label: "Shares", value: shares.toFixed(2) },
        { label: isBuy ? "Total cost" : "Total proceeds", value: formatUsd(summary.total) },
        ...(isBuy ? [{ label: "Payout if it wins", value: formatUsd(summary.payout) }] : []),
      ],
    },
  };
}

/** Turns raw form input into a validated order ticket plus a preview. */
/** Adds the estimated taker fee to the confirmation preview when there is one. */
function withFeeRow(result: TicketResult): TicketResult {
  const fee = result.estimate?.fee ?? 0;
  if (!result.preview || fee <= 0) return result;
  return { ...result, preview: { ...result.preview, rows: [...result.preview.rows, { label: "Est. fee", value: formatUsd(fee) }] } };
}

export function buildTicket(input: TicketInput): TicketResult {
  return withFeeRow(input.kind === "market" ? marketTicket(input) : limitTicket(input));
}
