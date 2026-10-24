"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { useTrading, type WalletMode } from "@/components/trading/trading-provider";
import { useTokenBalance } from "@/hooks/use-trading-data";
import { shortAddress } from "@/lib/format";

export function PortfolioClient() {
  const { tradingAddress, profile, profileStatus, status, enableTrading, enabling } = useTrading();
  const cash = useTokenBalance();

  if (status !== "disconnected" && !tradingAddress) {
    return (
      <p className="py-24 text-center text-base-content/60">
        {profileStatus === "error" ? "Could not look up your Polymarket account. Refresh to try again." : "Loading your account…"}
      </p>
    );
  }
  if (status === "disconnected" || !tradingAddress) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Your portfolio</h1>
        <p className="text-base-content/60">Connect your wallet to see positions, open orders and activity.</p>
        <ConnectButton />
      </div>
    );
  }

  const unlock =
    status === "locked" ? (
      <Button disabled={enabling} onClick={() => enableTrading().catch((e: Error) => toast.error(e.message))}>
        {enabling ? "Check your wallet…" : "Enable trading"}
      </Button>
    ) : null;

  return (
    <PortfolioView
      user={tradingAddress}
      name={profile?.name}
      isOwner
      cash={status === "ready" ? cash.data : undefined}
      headerExtra={
        <div className="flex items-center gap-3">
          <WalletModeSwitch />
          {unlock}
        </div>
      }
    />
  );
}

function WalletModeSwitch() {
  const { profile, eoa, mode, setMode } = useTrading();
  if (!profile?.proxyWallet || !eoa) return null;

  const options: { value: WalletMode; label: string }[] = [
    { value: "proxy", label: `Polymarket wallet ${shortAddress(profile.proxyWallet)}` },
    { value: "eoa", label: `This wallet ${shortAddress(eoa)}` },
  ];
  return (
    <select
      value={mode}
      onChange={(e) => setMode(e.target.value as WalletMode)}
      className="rounded-md border bg-background px-2 py-2 text-sm"
      aria-label="Trading wallet"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
