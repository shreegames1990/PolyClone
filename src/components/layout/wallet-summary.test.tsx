import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletSummary } from "./wallet-summary";

const state = vi.hoisted(() => ({
  tradingAddress: undefined as string | undefined,
  positionsValue: undefined as number | undefined,
  cashRaw: undefined as bigint | undefined,
  readArgs: undefined as unknown,
}));

vi.mock("@/components/trading/trading-provider", () => ({ useTrading: () => ({ tradingAddress: state.tradingAddress }) }));
vi.mock("@/hooks/use-portfolio", () => ({ usePortfolioValue: () => ({ data: state.positionsValue }) }));
vi.mock("wagmi", () => ({
  useReadContract: (args: unknown) => {
    state.readArgs = args;
    return { data: state.cashRaw };
  },
}));

beforeEach(() => {
  state.tradingAddress = undefined;
  state.positionsValue = undefined;
  state.cashRaw = undefined;
});

describe("WalletSummary", () => {
  it("shows a Portfolio link when no wallet is connected", () => {
    render(<WalletSummary />);
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.queryByText("Cash")).not.toBeInTheDocument();
  });

  it("shows portfolio (positions + cash) and cash for the trading wallet", () => {
    state.tradingAddress = "0x56687bf447db6ffa42ffe2204a05edaa20f55839";
    state.positionsValue = 67_311.5;
    state.cashRaw = 156_740_000n; // 156.74 pUSD (6 decimals)
    render(<WalletSummary />);
    expect(screen.getByText("$67,468.24")).toBeInTheDocument();
    expect(screen.getByText("$156.74")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Portfolio.*Cash/ })).toHaveAttribute("href", "/portfolio");
  });

  it("reads the pUSD balance of the trading wallet on Polygon", () => {
    state.tradingAddress = "0x56687bf447db6ffa42ffe2204a05edaa20f55839";
    render(<WalletSummary />);
    expect(state.readArgs).toMatchObject({
      address: "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB",
      functionName: "balanceOf",
      args: ["0x56687bf447db6ffa42ffe2204a05edaa20f55839"],
      chainId: 137,
    });
  });

  it("shows placeholders while balances load", () => {
    state.tradingAddress = "0x56687bf447db6ffa42ffe2204a05edaa20f55839";
    render(<WalletSummary />);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
