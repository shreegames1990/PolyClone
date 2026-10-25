"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSwitchChain } from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTrading } from "./trading-provider";
import { useTradingApprovals } from "@/hooks/use-trading-data";
import { POLYGON_CHAIN_ID } from "@/lib/polymarket/config";

/**
 * Renders the next step the user must take before trading (connect, switch
 * network, enable trading, approve), or the submit button once ready.
 */
export function TradeActionButton({
  label,
  disabled,
  onSubmit,
  color,
}: {
  label: string;
  disabled: boolean;
  onSubmit: () => void;
  /** Team color for the final "Place order" button (polymarket.com); indigo otherwise. */
  color?: string;
}) {
  const { status, enableTrading, enabling, restoring, profileStatus } = useTrading();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { state: approvals, approve } = useTradingApprovals();

  if (status === "disconnected") {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <Button className="w-full" size="lg" onClick={openConnectModal}>
            Connect wallet to trade
          </Button>
        )}
      </ConnectButton.Custom>
    );
  }
  if (status === "wrong-chain") {
    return (
      <Button className="w-full" size="lg" disabled={switching} onClick={() => switchChain({ chainId: POLYGON_CHAIN_ID })}>
        Switch to Polygon
      </Button>
    );
  }
  if (status === "locked" && (profileStatus === "loading" || restoring)) {
    return (
      <Button className="w-full" size="lg" disabled>
        Loading your account…
      </Button>
    );
  }
  if (status === "locked") {
    const onEnable = () => enableTrading().catch((error: Error) => toast.error(error.message));
    return (
      <Button className="w-full" size="lg" disabled={enabling} onClick={onEnable}>
        {enabling ? "Check your wallet…" : "Enable trading"}
      </Button>
    );
  }
  if (approvals.data && !approvals.data.isFullyApproved) {
    return (
      <Button className="w-full" size="lg" disabled={approve.isPending} onClick={() => approve.mutate()}>
        {approve.isPending ? "Approving…" : "Approve trading (one-time)"}
      </Button>
    );
  }
  return (
    <Button
      className="w-full border-none shadow-[0_3px_0_rgb(0_0_0/0.25)]"
      size="lg"
      variant="trade"
      disabled={disabled}
      onClick={onSubmit}
      style={color ? { backgroundColor: color, color: "#fff" } : undefined}
    >
      {label}
    </Button>
  );
}
