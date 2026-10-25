import { describe, expect, it } from "vitest";
import { clearSessionCredentials, loadSessionCredentials, saveSessionCredentials, sessionKeyFor } from "./session-store";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
};

const creds = { key: "11111111-2222-3333-4444-555555555555", secret: "c2VjcmV0", passphrase: "pass" };

describe("trading session store", () => {
  it("keys sessions by connected wallet and trading wallet, case-insensitively", () => {
    expect(sessionKeyFor("0xABC", "0xDEF")).toBe("pm-trading-session:0xabc:0xdef");
  });

  it("saves and loads credentials for the same wallets", () => {
    const storage = memory();
    const key = sessionKeyFor("0xabc", "0xdef");
    saveSessionCredentials(storage, key, creds);
    expect(loadSessionCredentials(storage, key)).toEqual(creds);
    expect(loadSessionCredentials(storage, sessionKeyFor("0xabc", "0x999"))).toBeNull();
  });

  it("ignores malformed stored data", () => {
    const storage = memory();
    const key = sessionKeyFor("0xabc", "0xdef");
    storage.setItem(key, "{not json");
    expect(loadSessionCredentials(storage, key)).toBeNull();
    storage.setItem(key, JSON.stringify({ key: "x" }));
    expect(loadSessionCredentials(storage, key)).toBeNull();
  });

  it("clears credentials", () => {
    const storage = memory();
    const key = sessionKeyFor("0xabc", "0xdef");
    saveSessionCredentials(storage, key, creds);
    clearSessionCredentials(storage, key);
    expect(loadSessionCredentials(storage, key)).toBeNull();
  });

  it("tolerates unavailable storage", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const key = sessionKeyFor("0xabc", "0xdef");
    expect(() => saveSessionCredentials(broken, key, creds)).not.toThrow();
    expect(loadSessionCredentials(broken, key)).toBeNull();
    expect(() => clearSessionCredentials(broken, key)).not.toThrow();
    expect(loadSessionCredentials(undefined, key)).toBeNull();
  });
});
