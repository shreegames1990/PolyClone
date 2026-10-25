import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILDER_SIGN_URL, resolveBuilderAuth } from "./builder-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveBuilderAuth", () => {
  it("returns gasless remote builder signing when the server is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ enabled: true }));
    vi.stubGlobal("fetch", fetchMock);
    // ApiKeyAuthorization is opaque in the SDK's public types; read its runtime flags.
    const auth = (await resolveBuilderAuth()) as unknown as { supportGasless: boolean; isBuilderKey: boolean } | undefined;
    expect(fetchMock).toHaveBeenCalledWith(BUILDER_SIGN_URL, expect.objectContaining({ method: "GET" }));
    expect(auth?.supportGasless).toBe(true);
    expect(auth?.isBuilderKey).toBe(true);
  });

  it("returns undefined when the server is not configured", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ enabled: false })));
    expect(await resolveBuilderAuth()).toBeUndefined();
  });

  it("returns undefined and logs when the check fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await resolveBuilderAuth()).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
