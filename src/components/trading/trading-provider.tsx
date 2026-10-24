"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAccount, useAccountEffect, useSwitchChain } from "wagmi";
import { getWalletClient } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";
import { useQuery } from "@tanstack/react-query";
import { createSecureClient, type SecureClient } from "@polymarket/client";
import { signerFrom } from "@polymarket/client/viem";
import type { Address } from "viem";
import { POLYGON_CHAIN_ID } from "@/lib/polymarket/config";
import { fetchProfile, type PolymarketProfile } from "@/lib/trading/profile";
import { describeTradeError } from "@/lib/trading/errors";

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

export function TradingProvider({ children }: { children: ReactNode }) {
  const { address: eoa, chainId, isConnected, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // The SDK derives API credentials (one wallet signature) and keeps them in memory only.
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [preferredMode, setPreferredMode] = useState<WalletMode | null>(readStoredMode);
  const [enabling, setEnabling] = useState(false);

  // Drop the signed-in client (and its in-memory API credentials) when the wallet disconnects.
  useAccountEffect({ onDisconnect: () => setSession(null) });

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
      // Read the wallet client fresh: one captured before a chain switch would be stale.
      const walletClient = await getWalletClient(wagmiConfig, { chainId: POLYGON_CHAIN_ID });
      // Always pass `wallet`: omitting it makes the SDK use (and deploy) a new Deposit Wallet.
      const secure = await createSecureClient({ signer: signerFrom(walletClient), wallet: tradingAddress });
      setSession({ key: sessionKey, client: secure });
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
    () => ({ eoa, profile, profileStatus, mode, setMode, tradingAddress, status, client, enabling, enableTrading }),
    [eoa, profile, profileStatus, mode, setMode, tradingAddress, status, client, enabling, enableTrading],
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading(): TradingContextValue {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used inside <TradingProvider>");
  return ctx;
}
