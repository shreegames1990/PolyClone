"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAccount, useAccountEffect, useSwitchChain } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";
import { useQuery } from "@tanstack/react-query";
import { AssetType, createSecureClient, type SecureClient } from "@polymarket/client";
import { fetchBalanceAllowance } from "@polymarket/client/actions";
import { signerFrom } from "@polymarket/client/viem";
import type { Address } from "viem";
import { POLYGON_CHAIN_ID } from "@/lib/polymarket/config";
import { fetchProfile, type PolymarketProfile } from "@/lib/trading/profile";
import { describeTradeError } from "@/lib/trading/errors";
import { resolveBuilderAuth } from "@/lib/trading/builder-client";
import {
  clearSessionCredentials,
  loadSessionCredentials,
  saveSessionCredentials,
  sessionKeyFor,
  type StoredCredentials,
} from "@/lib/trading/session-store";

export type WalletMode = "proxy" | "eoa";

export type TradingStatus = "disconnected" | "wrong-chain" | "locked" | "ready";

/** Proxy-wallet lookup state; trading waits for "ready" so it never picks the wrong wallet. */
export type ProfileStatus = "loading" | "error" | "ready";

interface TradingContextValue {
  readonly eoa: Address | undefined;
  readonly profile: PolymarketProfile | undefined;
  readonly profileStatus: ProfileStatus;
  readonly mode: WalletMode;
  readonly setMode: (mode: WalletMode) => void;
  /** Address that holds funds and positions (Polymarket proxy wallet or the EOA). */
  readonly tradingAddress: Address | undefined;
  readonly status: TradingStatus;
  readonly client: SecureClient | null;
  readonly enabling: boolean;
  /** True while a saved session from this tab is being restored after a refresh. */
  readonly restoring: boolean;
  readonly enableTrading: () => Promise<void>;
}

const TradingContext = createContext<TradingContextValue | null>(null);

const MODE_STORAGE_KEY = "pm-clone:wallet-mode";

function readStoredMode(): WalletMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(MODE_STORAGE_KEY);
    return value === "proxy" || value === "eoa" ? value : null;
  } catch {
    return null;
  }
}

interface ActiveSession {
  readonly key: string;
  readonly client: SecureClient;
}

/** Tab-scoped storage for trading credentials; undefined during SSR or when blocked. */
function tabStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * Creates the signed trading client. With saved credentials it skips the wallet signature
 * that derives API keys. Always passes `wallet`: omitting it makes the SDK use (and deploy)
 * a new Deposit Wallet.
 */
async function openSecureClient(tradingAddress: Address, credentials?: StoredCredentials): Promise<SecureClient> {
  // Read the wallet client fresh: one captured before a chain switch would be stale.
  const walletClient = await getWalletClient(wagmiConfig, { chainId: POLYGON_CHAIN_ID });
  // Builder signing enables gasless approvals for Polymarket proxy wallets (see /api/builder/sign).
  const apiKey = await resolveBuilderAuth();
  return createSecureClient({
    signer: signerFrom(walletClient),
    wallet: tradingAddress,
    ...(apiKey ? { apiKey } : {}),
    ...(credentials ? { credentials: credentials as unknown as SecureClient["credentials"] } : {}),
  });
}

export function TradingProvider({ children }: { children: ReactNode }) {
  const { address: eoa, chainId, isConnected, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // The SDK derives API credentials (one wallet signature); they are also saved for this tab.
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [preferredMode, setPreferredMode] = useState<WalletMode | null>(readStoredMode);
  const [enabling, setEnabling] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const storageKeyRef = useRef<string | null>(null);
  const restoreAttemptRef = useRef<string | null>(null);

  // Drop the signed-in client and the tab's saved credentials when the wallet disconnects.
  useAccountEffect({
    onDisconnect: () => {
      setSession(null);
      if (storageKeyRef.current) clearSessionCredentials(tabStorage(), storageKeyRef.current);
    },
  });

  const profileQuery = useQuery({
    queryKey: ["profile", eoa],
    queryFn: () => fetchProfile(eoa as Address),
    enabled: Boolean(eoa),
    staleTime: 5 * 60_000,
    retry: 3,
  });
  const profile = profileQuery.data;
  const profileStatus: ProfileStatus = profileQuery.isSuccess ? "ready" : profileQuery.isError ? "error" : "loading";

  const mode: WalletMode = profile?.proxyWallet ? (preferredMode ?? "proxy") : "eoa";
  const tradingAddress = profileStatus !== "ready" ? undefined : mode === "proxy" ? (profile?.proxyWallet ?? undefined) : eoa;
  const sessionKey = `${connector?.uid}:${eoa}:${tradingAddress}`;
  const client = isConnected && session?.key === sessionKey ? session.client : null;
  const storageKey = eoa && tradingAddress ? sessionKeyFor(eoa, tradingAddress) : null;

  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  // After a refresh, restore this tab's session from saved credentials (no wallet signature).
  useEffect(() => {
    if (!isConnected || chainId !== POLYGON_CHAIN_ID || !tradingAddress || !storageKey || client) return;
    if (restoreAttemptRef.current === sessionKey) return;
    const saved = loadSessionCredentials(tabStorage(), storageKey);
    if (!saved) return;
    restoreAttemptRef.current = sessionKey;
    let cancelled = false;
    void (async () => {
      setRestoring(true);
      try {
        const secure = await openSecureClient(tradingAddress, saved);
        // Cheap authenticated call: fails fast if the saved credentials were revoked.
        await fetchBalanceAllowance(secure, { assetType: AssetType.COLLATERAL });
        if (!cancelled) setSession({ key: sessionKey, client: secure });
      } catch (error) {
        console.warn("[trading] could not restore saved session; enable trading again", error);
        clearSessionCredentials(tabStorage(), storageKey);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, chainId, tradingAddress, storageKey, client, sessionKey]);

  const setMode = useCallback((next: WalletMode) => {
    setPreferredMode(next);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode); keep the in-memory choice.
    }
  }, []);

  const enableTrading = useCallback(async () => {
    if (!eoa) throw new Error("Connect a wallet first.");
    if (profileStatus === "error") {
      void profileQuery.refetch();
      throw new Error("Could not look up your Polymarket account. Try again in a moment.");
    }
    if (profileStatus !== "ready" || !tradingAddress) throw new Error("Still loading your Polymarket account…");
    setEnabling(true);
    try {
      if (chainId !== POLYGON_CHAIN_ID) await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
      const secure = await openSecureClient(tradingAddress);
      setSession({ key: sessionKey, client: secure });
      // Remember the session for this tab so a refresh does not ask for another signature.
      saveSessionCredentials(tabStorage(), sessionKeyFor(eoa, tradingAddress), secure.credentials);
    } catch (error) {
      console.error("[trading] enable failed", error);
      throw new Error(describeTradeError(error));
    } finally {
      setEnabling(false);
    }
  }, [eoa, profileStatus, profileQuery, tradingAddress, chainId, switchChainAsync, sessionKey]);

  const status: TradingStatus = !isConnected
    ? "disconnected"
    : chainId !== POLYGON_CHAIN_ID
      ? "wrong-chain"
      : client
        ? "ready"
        : "locked";

  const value = useMemo<TradingContextValue>(
    () => ({ eoa, profile, profileStatus, mode, setMode, tradingAddress, status, client, enabling, restoring, enableTrading }),
    [eoa, profile, profileStatus, mode, setMode, tradingAddress, status, client, enabling, restoring, enableTrading],
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading(): TradingContextValue {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used inside <TradingProvider>");
  return ctx;
}
