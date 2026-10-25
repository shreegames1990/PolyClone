import { describe, expect, it } from "vitest";
import { isSameOrigin, parseSignRequest, readBuilderCreds } from "./builder-signing";

describe("readBuilderCreds", () => {
  it("returns credentials only when all three variables are set", () => {
    expect(readBuilderCreds({ POLY_BUILDER_API_KEY: "k", POLY_BUILDER_SECRET: "s", POLY_BUILDER_PASSPHRASE: "p" })).toEqual({
      key: "k",
      secret: "s",
      passphrase: "p",
    });
    expect(readBuilderCreds({ POLY_BUILDER_API_KEY: "k", POLY_BUILDER_SECRET: "", POLY_BUILDER_PASSPHRASE: "p" })).toBeNull();
    expect(readBuilderCreds({})).toBeNull();
  });
});

describe("parseSignRequest", () => {
  it("accepts the SDK's order and relayer requests", () => {
    expect(parseSignRequest({ method: "POST", path: "/order", body: '{"a":1}' })).toEqual({
      ok: true,
      value: { method: "POST", path: "/order", body: '{"a":1}' },
    });
    expect(parseSignRequest({ method: "DELETE", path: "/cancel-all" }).ok).toBe(true);
    expect(parseSignRequest({ method: "POST", path: "/submit", body: "{}" }).ok).toBe(true);
    expect(parseSignRequest({ method: "GET", path: "/v1/account/transactions/0x12ab-cd" }).ok).toBe(true);
    expect(parseSignRequest({ method: "GET", path: "/v1/account/transactions/params" }).ok).toBe(true);
  });

  it("accepts API key setup and batch price requests made while enabling trading", () => {
    expect(parseSignRequest({ method: "POST", path: "/auth/api-key" }).ok).toBe(true);
    expect(parseSignRequest({ method: "DELETE", path: "/auth/api-key" }).ok).toBe(true);
    expect(parseSignRequest({ method: "POST", path: "/books", body: "[]" }).ok).toBe(true);
    expect(parseSignRequest({ method: "POST", path: "prices", body: "[]" }).ok).toBe(true);
    expect(parseSignRequest({ method: "POST", path: "/last-trades-prices", body: "[]" }).ok).toBe(true);
    expect(parseSignRequest({ method: "DELETE", path: "/notifications" }).ok).toBe(true);
  });

  it("accepts CLOB reads, which the SDK also builder-signs", () => {
    for (const path of ["/auth/derive-api-key", "/book", "/tick-size", "/balance-allowance", "/data/order/0xabc", "markets-by-token/12345", "rewards/markets/0xdef"]) {
      expect(parseSignRequest({ method: "GET", path }).ok, path).toBe(true);
    }
  });

  it("rejects paths and methods the app never signs", () => {
    expect(parseSignRequest({ method: "POST", path: "/auth/builder-api-key" }).ok).toBe(false);
    expect(parseSignRequest({ method: "DELETE", path: "/auth/builder-api-key" }).ok).toBe(false);
    expect(parseSignRequest({ method: "POST", path: "/v1/session-signers/authorizations" }).ok).toBe(false);
    expect(parseSignRequest({ method: "GET", path: "/auth/builder-api-key" }).ok).toBe(false);
    expect(parseSignRequest({ method: "GET", path: "/v1/user/session-signers" }).ok).toBe(false);
    expect(parseSignRequest({ method: "GET", path: "/book?token_id=1" }).ok).toBe(false);
    expect(parseSignRequest({ method: "GET", path: "/a/../auth/builder-api-key" }).ok).toBe(false);
    expect(parseSignRequest({ method: "PUT", path: "/order" }).ok).toBe(false);
    expect(parseSignRequest({ method: "POST", path: "/order/../auth/api-key" }).ok).toBe(false);
    expect(parseSignRequest({ method: "POST", path: "https://evil.test/order" }).ok).toBe(false);
  });

  it("rejects malformed bodies and oversized payloads", () => {
    expect(parseSignRequest(null).ok).toBe(false);
    expect(parseSignRequest({ method: "POST", path: "/order", body: 42 }).ok).toBe(false);
    expect(parseSignRequest({ method: "POST", path: "/order", body: "x".repeat(70_000) }).ok).toBe(false);
  });
});

describe("isSameOrigin", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("accepts requests whose Origin matches the host", () => {
    expect(isSameOrigin(headers({ origin: "https://polyclone.up.railway.app", host: "polyclone.up.railway.app" }))).toBe(true);
    expect(isSameOrigin(headers({ origin: "http://localhost:3001", host: "localhost:3001" }))).toBe(true);
  });

  it("prefers the proxy's forwarded host", () => {
    expect(
      isSameOrigin(headers({ origin: "https://polyclone.up.railway.app", host: "10.0.0.5:8080", "x-forwarded-host": "polyclone.up.railway.app" })),
    ).toBe(true);
  });

  it("rejects missing or foreign origins", () => {
    expect(isSameOrigin(headers({ host: "polyclone.up.railway.app" }))).toBe(false);
    expect(isSameOrigin(headers({ origin: "https://evil.test", host: "polyclone.up.railway.app" }))).toBe(false);
    expect(isSameOrigin(headers({ origin: "not a url", host: "polyclone.up.railway.app" }))).toBe(false);
  });
});
