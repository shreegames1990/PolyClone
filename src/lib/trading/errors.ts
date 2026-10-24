import type { OrderResponse } from "@polymarket/client";

const GENERIC = "Something went wrong. Please try again.";

type Loose = Record<string, unknown>;

const asObject = (value: unknown): Loose => (typeof value === "object" && value !== null ? (value as Loose) : {});

function rawMessage(obj: Loose): string {
  for (const candidate of [obj.shortMessage, obj.message]) {
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "";
}

/** Maps wallet / SDK errors to a short user-facing message. */
export function describeTradeError(error: unknown): string {
  if (typeof error === "string") return GENERIC;
  const obj = asObject(error);
  const message = rawMessage(obj);
  const lower = message.toLowerCase();

  if (
    obj.name === "CancelledSigningError" ||
    obj.code === 4001 ||
    /user (rejected|denied)|rejected the request/.test(lower)
  ) {
    return "Signature cancelled in your wallet.";
  }
  if (obj.status === 403 || /restricted|geoblock|region/.test(lower)) {
    return "Polymarket does not allow trading from your region.";
  }
  if (obj.name === "InsufficientLiquidityError") {
    return "Not enough liquidity in the order book for this order.";
  }
  if (/balance|allowance/.test(lower)) {
    return "Not enough pUSD balance or allowance for this order.";
  }
  if (/tick size/.test(lower)) {
    return "Price does not match the market's tick size. Refresh and try again.";
  }
  if (/connect a wallet|wallet is not ready/.test(lower)) return message;
  // Unknown upstream text may carry internal detail; callers log the raw error.
  return GENERIC;
}

export interface StatusMessage {
  readonly message: string;
  readonly tone: "success" | "info" | "error";
  /** True when the order filled or is resting, so the form can be cleared. */
  readonly done: boolean;
}

export function describeOrderStatus(status: string): StatusMessage {
  switch (status.toLowerCase()) {
    case "matched":
      return { message: "Order filled.", tone: "success", done: true };
    case "live":
      return { message: "Order placed on the book.", tone: "success", done: true };
    case "delayed":
      return { message: "Order accepted and is being matched.", tone: "info", done: true };
    case "unmatched":
      return { message: "Order was not filled.", tone: "error", done: false };
    default:
      return { message: `Order status: ${status}.`, tone: "info", done: false };
  }
}

export type OrderResult = { ok: true; orderId: string; status: string } | { ok: false; error: string };

export function orderResultFromResponse(response: OrderResponse): OrderResult {
  if (response.ok) return { ok: true, orderId: response.orderId, status: String(response.status) };
  return { ok: false, error: describeTradeError({ message: response.message }) };
}
