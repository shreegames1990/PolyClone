import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProfile, parseProfile } from "./profile";

const PROXY = "0x1111111111111111111111111111111111111111";

afterEach(() => vi.unstubAllGlobals());

describe("parseProfile", () => {
  it("reads proxy wallet and name", () => {
    expect(parseProfile({ proxyWallet: PROXY, name: "alice", profileImage: "x.png" })).toEqual({
      proxyWallet: PROXY,
      name: "alice",
      image: "x.png",
    });
  });

  it("falls back to pseudonym and rejects bad addresses", () => {
    expect(parseProfile({ proxyWallet: "0xnope", pseudonym: "Happy-Fox" })).toEqual({
      proxyWallet: null,
      name: "Happy-Fox",
      image: "",
    });
  });

  it("handles garbage", () => {
    expect(parseProfile("nope").proxyWallet).toBeNull();
  });
});

describe("fetchProfile", () => {
  it("returns an empty profile when no profile exists (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await fetchProfile(PROXY)).toEqual({ proxyWallet: null, name: "", image: "" });
  });

  it("throws on other failures so the lookup is retried", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    await expect(fetchProfile(PROXY)).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(fetchProfile(PROXY)).rejects.toThrow();
  });

  it("parses a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ proxyWallet: PROXY }) }),
    );
    expect((await fetchProfile("0xabc")).proxyWallet).toBe(PROXY);
  });
});
