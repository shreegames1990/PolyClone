import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MasonryGrid, MasonryItem } from "./masonry-grid";

let resize: ((entries: { target: Element; contentRect: { height: number } }[]) => void) | undefined;
class FakeResizeObserver {
  constructor(callback: typeof resize) {
    resize = callback;
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => vi.stubGlobal("ResizeObserver", FakeResizeObserver));
afterEach(() => {
  vi.unstubAllGlobals();
  resize = undefined;
});

describe("MasonryGrid", () => {
  it("starts items at an estimated span and resizes them to their measured height", () => {
    render(
      <MasonryGrid>
        <MasonryItem>
          <div>card</div>
        </MasonryItem>
      </MasonryGrid>,
    );
    const item = screen.getByText("card").parentElement!;
    expect(item.style.gridRowEnd).toMatch(/^span \d+$/);

    act(() => resize?.([{ target: item.firstElementChild!, contentRect: { height: 200 } }]));
    expect(item.style.gridRowEnd).toBe("span 27");
  });

  it("lets wide items span two columns from the small breakpoint up", () => {
    render(
      <MasonryGrid>
        <MasonryItem wide>
          <div>wide card</div>
        </MasonryItem>
      </MasonryGrid>,
    );
    expect(screen.getByText("wide card").parentElement).toHaveClass("sm:col-span-2");
  });

  it("works without ResizeObserver (keeps the estimate)", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(
      <MasonryGrid>
        <MasonryItem>
          <div>static</div>
        </MasonryItem>
      </MasonryGrid>,
    );
    expect(screen.getByText("static").parentElement!.style.gridRowEnd).toMatch(/^span \d+$/);
  });
});
