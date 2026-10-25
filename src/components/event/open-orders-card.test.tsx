import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OpenOrdersCard } from "./open-orders-card";
import { normalizeEvent } from "@/lib/polymarket/normalize";
import type { OpenOrderLike } from "@/lib/polymarket/event-orders";

const state = vi.hoisted(() => ({
  orders: undefined as OpenOrderLike[] | undefined,
  isError: false,
  status: "ready" as string,
  refetch: vi.fn(),
  cancelOne: vi.fn(),
  cancelMany: vi.fn(),
}));

vi.mock("@/components/trading/trading-provider", () => ({ useTrading: () => ({ status: state.status }) }));
vi.mock("@/hooks/use-trading-data", () => ({
  useOpenOrders: () => ({ data: state.orders, isError: state.isError, refetch: state.refetch }),
  useCancelOrder: () => ({ mutate: state.cancelOne, isPending: false, variables: undefined }),
  useCancelOrders: () => ({ mutate: state.cancelMany, isPending: false }),
}));

const event = normalizeEvent({
  id: "1",
  teams: [{ name: "FC Barcelona", abbreviation: "bar", color: "#004d98" }],
  markets: [
    { id: "h", groupItemTitle: "FC Barcelona", sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["h-yes","h-no"]' },
    { id: "d", groupItemTitle: "Draw (FC Barcelona vs. Real Madrid CF)", sportsMarketType: "moneyline", outcomes: '["Yes","No"]', clobTokenIds: '["d-yes","d-no"]' },
  ],
});

const order = (id: string, tokenId = "h-yes"): OpenOrderLike => ({
  id,
  tokenId,
  side: "BUY",
  price: "0.61",
  originalSize: "30",
  sizeMatched: "0",
  orderType: "GTC",
});

beforeEach(() => {
  state.orders = undefined;
  state.isError = false;
  state.status = "ready";
  state.refetch.mockReset();
  state.cancelOne.mockReset();
  state.cancelMany.mockReset();
});

describe("OpenOrdersCard", () => {
  it("renders nothing without open orders in this event", () => {
    state.orders = [order("x", "elsewhere")];
    const { container } = render(<OpenOrdersCard event={event} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("asks to enable trading when the wallet is connected but trading is locked", () => {
    state.status = "locked";
    render(<OpenOrdersCard event={event} />);
    expect(screen.getByText("Enable trading to load your open orders.")).toBeInTheDocument();
  });

  it("renders nothing when no wallet is connected", () => {
    state.status = "disconnected";
    const { container } = render(<OpenOrdersCard event={event} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a retryable error when open orders fail to load", () => {
    state.isError = true;
    render(<OpenOrdersCard event={event} />);
    expect(screen.getByText("Could not load your open orders.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.refetch).toHaveBeenCalled();
  });

  it("shows resting orders like polymarket.com", () => {
    state.orders = [order("o1")];
    render(<OpenOrdersCard event={event} />);
    expect(screen.getByText("Open Orders")).toBeInTheDocument();
    expect(screen.getByText("Moneyline")).toBeInTheDocument();
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText("BAR YES")).toBeInTheDocument();
    expect(screen.getByText("61¢")).toBeInTheDocument();
    expect(screen.getByText("0 / 30")).toBeInTheDocument();
    expect(screen.getByText("$18.30")).toBeInTheDocument();
    expect(screen.getByText("Until cancelled")).toBeInTheDocument();
  });

  it("cancels one order, or all of this event's orders", () => {
    state.orders = [order("o1"), order("o2", "d-yes"), order("other", "elsewhere")];
    render(<OpenOrdersCard event={event} />);
    fireEvent.click(screen.getAllByRole("button", { name: /cancel order/i })[0]!);
    expect(state.cancelOne).toHaveBeenCalledWith("o1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel all" }));
    expect(state.cancelMany).toHaveBeenCalledWith(["o1", "o2"]);
  });
});
