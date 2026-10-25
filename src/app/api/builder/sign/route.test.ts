import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildHmacSignature } from "@polymarket/client";
import { GET, POST } from "./route";

const SECRET = Buffer.from("test-secret").toString("base64");
const HOST = "polyclone.test";
const NOW = new Date("2026-10-26T12:00:00Z");

const signRequest = (payload: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://${HOST}/api/builder/sign`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: `https://${HOST}`, host: HOST, "x-forwarded-for": "1.2.3.4", ...headers },
    body: JSON.stringify(payload),
  });

const configure = () => {
  vi.stubEnv("POLY_BUILDER_API_KEY", "builder-key");
  vi.stubEnv("POLY_BUILDER_SECRET", SECRET);
  vi.stubEnv("POLY_BUILDER_PASSPHRASE", "builder-pass");
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("GET /api/builder/sign", () => {
  it("reports whether builder signing is configured", async () => {
    expect(await (await GET()).json()).toEqual({ enabled: false });
    configure();
    expect(await (await GET()).json()).toEqual({ enabled: true });
  });
});

describe("POST /api/builder/sign", () => {
  it("returns 503 when credentials are not configured", async () => {
    const res = await POST(signRequest({ method: "POST", path: "/order", body: "{}" }));
    expect(res.status).toBe(503);
  });

  it("signs allowlisted requests with the builder credentials", async () => {
    configure();
    const body = '{"order":1}';
    const res = await POST(signRequest({ method: "POST", path: "/order", body }));
    expect(res.status).toBe(200);
    const timestamp = Math.floor(NOW.getTime() / 1000);
    expect(await res.json()).toEqual({
      POLY_BUILDER_API_KEY: "builder-key",
      POLY_BUILDER_PASSPHRASE: "builder-pass",
      POLY_BUILDER_SIGNATURE: await buildHmacSignature(SECRET, timestamp, "POST", "/order", body),
      POLY_BUILDER_TIMESTAMP: String(timestamp),
    });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects cross-origin callers", async () => {
    configure();
    const res = await POST(signRequest({ method: "POST", path: "/order" }, { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
  });

  it("rejects requests the app never signs", async () => {
    configure();
    const res = await POST(signRequest({ method: "POST", path: "/auth/builder-api-key" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    configure();
    const res = await POST(
      new Request(`https://${HOST}/api/builder/sign`, { method: "POST", headers: { origin: `https://${HOST}`, host: HOST }, body: "{" }),
    );
    expect(res.status).toBe(400);
  });

  it("rate limits each client", async () => {
    configure();
    const statuses: number[] = [];
    for (let i = 0; i < 125; i++) {
      statuses.push((await POST(signRequest({ method: "DELETE", path: "/order" }, { "x-forwarded-for": "9.9.9.9" }))).status);
    }
    expect(statuses.filter((s) => s === 200).length).toBeGreaterThan(0);
    expect(statuses.at(-1)).toBe(429);
  });
});
