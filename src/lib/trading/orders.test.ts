import { describe, expect, it, vi } from "vitest";
import { OrderSide, OrderType, type SecureClient } from "@polymarket/client";
import { cancelOrder, placeOrder, toTokenAmount } from "./orders";

const accepted = { ok: true, orderId: "0xid", status: "live" };

function fakeClient(response: unknown = accepted) {
  const fns = {
    placeLimitOrder: vi.fn().mockResolvedValue(response),
    placeMarketOrder: vi.fn().mockResolvedValue(response),
    cancelOrder: vi.fn().mockResolvedValue({ canceled: ["0xid"] }),
  };
  return { client: fns as unknown as SecureClient, fns };
}

describe("placeOrder", () => {
  it("places a limit order", async () => {
    const { client, fns } = fakeClient();
    const result = await placeOrder(client, { kind: "limit", tokenId: "T", side: "BUY", price: 0.42, shares: 10 });
    expect(result).toEqual({ ok: true, orderId: "0xid", status: "live" });
    expect(fns.placeLimitOrder).toHaveBeenCalledWith({ tokenId: "T", side: OrderSide.BUY, price: 0.42, size: 10 });
  });

  it("sends a GTD expiration for limit orders that expire", async () => {
    const { client, fns } = fakeClient();
    const before = Math.floor(Date.now() / 1000);
    await placeOrder(client, { kind: "limit", tokenId: "T", side: "BUY", price: 0.42, shares: 10, expiry: "1h" });
    const request = fns.placeLimitOrder.mock.calls[0]![0] as { expiration: number };
    expect(request.expiration).toBeGreaterThanOrEqual(before + 3600);
    expect(request.expiration).toBeLessThanOrEqual(before + 3602);
  });

  it("omits the expiration for good-till-cancelled limit orders", async () => {
    const { client, fns } = fakeClient();
    await placeOrder(client, { kind: "limit", tokenId: "T", side: "BUY", price: 0.42, shares: 10, expiry: "never" });
    expect(fns.placeLimitOrder.mock.calls[0]![0]).not.toHaveProperty("expiration");
  });

  it("places a FOK market buy capped at the worst price", async () => {
    const { client, fns } = fakeClient();
    await placeOrder(client, { kind: "market", tokenId: "T", side: "BUY", amount: 25, worstPrice: 0.6 });
    expect(fns.placeMarketOrder).toHaveBeenCalledWith({
      tokenId: "T",
      side: OrderSide.BUY,
      amount: 25,
      maxSpend: 25,
      maxPrice: 0.6,
      orderType: OrderType.FOK,
    });
  });

  it("places a FOK market sell with a floor price", async () => {
    const { client, fns } = fakeClient();
    await placeOrder(client, { kind: "market", tokenId: "T", side: "SELL", amount: 12, worstPrice: 0.3 });
    expect(fns.placeMarketOrder).toHaveBeenCalledWith({
      tokenId: "T",
      side: OrderSide.SELL,
      shares: 12,
      minPrice: 0.3,
      orderType: OrderType.FOK,
    });
  });

  it("returns a friendly error when the API rejects", async () => {
    const { client } = fakeClient({ ok: false, code: "X", message: "not enough balance / allowance" });
    const result = await placeOrder(client, { kind: "limit", tokenId: "T", side: "BUY", price: 0.5, shares: 5 });
    expect(result).toEqual({ ok: false, error: "Not enough pUSD balance or allowance for this order." });
  });

  it("returns a friendly error when the SDK throws", async () => {
    const { client, fns } = fakeClient();
    fns.placeLimitOrder.mockRejectedValue({ code: 4001 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await placeOrder(client, { kind: "limit", tokenId: "T", side: "BUY", price: 0.5, shares: 5 });
    expect(result).toEqual({ ok: false, error: "Signature cancelled in your wallet." });
  });
});

describe("cancelOrder", () => {
  it("cancels by id", async () => {
    const { client, fns } = fakeClient();
    await cancelOrder(client, "0xid");
    expect(fns.cancelOrder).toHaveBeenCalledWith({ orderId: "0xid" });
  });
});

describe("toTokenAmount", () => {
  it("converts 6-decimal base units", () => {
    expect(toTokenAmount(12_345_678n)).toBeCloseTo(12.345678);
    expect(toTokenAmount("5000000")).toBe(5);
    expect(toTokenAmount(undefined)).toBe(0);
    expect(toTokenAmount("abc")).toBe(0);
  });
});
