"use client";

import Link from "next/link";
import { erc20Abi, type Address } from "viem";
import { useReadContract } from "wagmi";
import { Wallet } from "lucide-react";
import { useTrading } from "@/components/trading/trading-provider";
import { usePortfolioValue } from "@/hooks/use-portfolio";
import { toTokenAmount } from "@/lib/trading/orders";
import { formatUsd } from "@/lib/format";
import { POLYGON_CHAIN_ID, PUSD_ADDRESS } from "@/lib/polymarket/config";

const REFRESH_MS = 30_000;
const PLACEHOLDER = "—";

/** pUSD balance of the trading wallet, read on-chain so it shows before trading is enabled. */
function useCash(wallet: Address | undefined): number | undefined {
  const { data } = useReadContract({
    address: PUSD_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: wallet ? [wallet] : undefined,
    chainId: POLYGON_CHAIN_ID,
    query: { enabled: Boolean(wallet), refetchInterval: REFRESH_MS },
  });
  return data === undefined ? undefined : toTokenAmount(data);
}

/**
 * Navbar Portfolio / Cash (polymarket.com layout). Portfolio is positions value plus cash.
 * Without a connected wallet it falls back to a plain Portfolio link.
 */
export function WalletSummary() {
  const { tradingAddress } = useTrading();
  const positions = usePortfolioValue(tradingAddress ?? undefined).data;
  const cash = useCash(tradingAddress ?? undefined);

  if (!tradingAddress) {
    return (
      <Link href="/portfolio" className="btn btn-ghost btn-sm gap-1.5 text-label font-medium text-base-content/70 hover:text-base-content">
        <Wallet className="size-4" />
        Portfolio
      </Link>
    );
  }

  const portfolio = positions !== undefined && cash !== undefined ? formatUsd(positions + cash) : PLACEHOLDER;
  return (
    <Link href="/portfolio" className="flex items-center gap-4 rounded-field px-2 py-1 hover:bg-base-200">
      <Figure label="Portfolio" value={portfolio} />
      <Figure label="Cash" value={cash !== undefined ? formatUsd(cash) : PLACEHOLDER} />
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col items-center leading-tight">
      <span className="text-caption text-base-content/60">{label}</span>
      <span className="text-body-sm font-semibold text-yes tabular-nums">{value}</span>
    </span>
  );
}
