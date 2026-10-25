import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OrderKindMenu, ORDER_KINDS } from "./order-kind-menu";

describe("OrderKindMenu", () => {
  it("lists Limit first", () => {
    expect(ORDER_KINDS.map((k) => k.value)).toEqual(["limit", "market"]);
  });

  it("shows the current kind and switches when an option is clicked", () => {
    const onChange = vi.fn();
    render(<OrderKindMenu value="limit" onChange={onChange} />);
    expect(screen.getByRole("button", { name: /Order type: Limit/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Market" }));
    expect(onChange).toHaveBeenCalledWith("market");
  });

  it("marks the selected option", () => {
    render(<OrderKindMenu value="market" onChange={vi.fn()} />);
    expect(screen.getByRole("menuitemradio", { name: "Market" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Limit" })).toHaveAttribute("aria-checked", "false");
  });
});
