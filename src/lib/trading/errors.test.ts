import { describe, expect, it } from "vitest";
import type { OrderResponse } from "@polymarket/client";
import { describeOrderStatus, describeTradeError, orderResultFromResponse } from "./errors";

const response = (value: object) => value as unknown as OrderResponse;

const named = (name: string, message = "x", extra: object = {}) => Object.assign(new Error(message), { name, ...extra });

describe("describeTradeError", () => {
  it("explains when gasless approvals need a relayer or builder key", () => {
    const error = Object.assign(new Error("Gasless transactions require a Relayer API Key or Builder API Key in the client configuration."), {
      name: "InvariantError",
    });
    expect(describeTradeError(error)).toBe(
      "Gasless approvals are not set up on this site yet: the server needs POLY_BUILDER_* credentials.",
    );
  });

  it("detects user rejection", () => {
    expect(describeTradeError({ code: 4001, message: "x" })).toMatch(/cancelled/);
    expect(describeTradeError(new Error("User rejected the request."))).toMatch(/cancelled/);
    expect(describeTradeError(named("CancelledSigningError"))).toMatch(/cancelled/);
  });

  it("detects region restrictions", () => {
    expect(describeTradeError(new Error("Trading restricted in your region"))).toMatch(/region/);
    expect(describeTradeError(named("RequestRejectedError", "Forbidden", { status: 403 }))).toMatch(/region/);
  });

  it("detects balance problems", () => {
    expect(describeTradeError(new Error("not enough balance / allowance"))).toMatch(/balance/);
  });

  it("detects missing liquidity", () => {
    expect(describeTradeError(named("InsufficientLiquidityError"))).toMatch(/liquidity/);
  });

  it("falls back to a generic message", () => {
    expect(describeTradeError("boom")).toBe("Something went wrong. Please try again.");
    expect(describeTradeError({})).toBe("Something went wrong. Please try again.");
  });

  it("detects tick size errors", () => {
    expect(describeTradeError(new Error("invalid tick size"))).toMatch(/tick size/);
  });

  it("does not leak unknown upstream messages", () => {
    expect(describeTradeError(new Error("internal req-123 failure"))).toBe("Something went wrong. Please try again.");
  });
});

describe("describeOrderStatus", () => {
  it("maps statuses to messages and fill state", () => {
    expect(describeOrderStatus("matched")).toEqual({ message: "Order filled.", tone: "success", done: true });
    expect(describeOrderStatus("live")).toEqual({ message: "Order placed on the book.", tone: "success", done: true });
    expect(describeOrderStatus("delayed").tone).toBe("info");
    expect(describeOrderStatus("unmatched")).toEqual({ message: "Order was not filled.", tone: "error", done: false });
    expect(describeOrderStatus("weird").done).toBe(false);
  });
});

describe("orderResultFromResponse", () => {
  it("returns the order id on success", () => {
    expect(orderResultFromResponse(response({ ok: true, orderId: "0x1", status: "matched" }))).toEqual({
      ok: true,
      orderId: "0x1",
      status: "matched",
    });
  });

  it("returns an error on rejection", () => {
    expect(orderResultFromResponse(response({ ok: false, code: "X", message: "not enough balance" }))).toEqual({
      ok: false,
      error: "Not enough pUSD balance or allowance for this order.",
    });
    expect(orderResultFromResponse(response({ ok: false, code: "X", message: "bad" }))).toEqual({
      ok: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
