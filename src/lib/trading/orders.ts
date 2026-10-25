import { OrderSide, OrderType, type SecureClient } from "@polymarket/client";
import { describeTradeError, orderResultFromResponse, type OrderResult } from "./errors";
import type { OrderSide as Side } from "./order-math";
import { expirationFor, type ExpiryOption } from "./expiry";

/** pUSD and outcome tokens both use 6 decimals. */
const TOKEN_DECIMALS = 6;

export type OrderTicket =
  /** expiry other than "never" becomes a GTD order; the timestamp is computed at submit time. */
  | { kind: "limit"; tokenId: string; side: Side; price: number; shares: number; expiry?: ExpiryOption }
  /** amount is pUSD for BUY and shares for SELL; worstPrice bounds slippage. */
  | { kind: "market"; tokenId: string; side: Side; amount: number; worstPrice: number };

function submit(client: SecureClient, ticket: OrderTicket) {
  if (ticket.kind === "limit") {
    const expiration = expirationFor(ticket.expiry ?? "never");
    return client.placeLimitOrder({
      tokenId: ticket.tokenId,
      side: ticket.side === "BUY" ? OrderSide.BUY : OrderSide.SELL,
      price: ticket.price,
      size: ticket.shares,
      ...(expiration !== undefined ? { expiration } : {}),
    });
  }
  if (ticket.side === "BUY") {
    return client.placeMarketOrder({
      tokenId: ticket.tokenId,
      side: OrderSide.BUY,
      amount: ticket.amount,
      // Fees are charged on top of `amount` unless capped; keep the all-in spend at what the user confirmed.
      maxSpend: ticket.amount,
      maxPrice: ticket.worstPrice,
      orderType: OrderType.FOK,
    });
  }
  return client.placeMarketOrder({
    tokenId: ticket.tokenId,
    side: OrderSide.SELL,
    shares: ticket.amount,
    minPrice: ticket.worstPrice,
    orderType: OrderType.FOK,
  });
}

export async function placeOrder(client: SecureClient, ticket: OrderTicket): Promise<OrderResult> {
  try {
    return orderResultFromResponse(await submit(client, ticket));
  } catch (error) {
    console.error("[orders] placeOrder failed", error);
    return { ok: false, error: describeTradeError(error) };
  }
}

export async function cancelOrder(client: SecureClient, orderId: string): Promise<void> {
  await client.cancelOrder({ orderId });
}

export function toTokenAmount(raw: bigint | string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value / 10 ** TOKEN_DECIMALS : 0;
}
