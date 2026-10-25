import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InfiniteEventGrid } from "./infinite-event-grid";
import { normalizeEvent } from "@/lib/polymarket/normalize";

/** Minimal IntersectionObserver stand-in: tests call `intersect()` to simulate scrolling to the end. */
const observers: { callback: IntersectionObserverCallback; target?: Element }[] = [];
class FakeObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {
    observers.push({ callback });
  }
  observe(target: Element) {
    observers.at(-1)!.target = target;
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
const intersect = () =>
  act(() => {
    const latest = observers.at(-1)!;
    latest.callback([{ isIntersecting: true, target: latest.target! } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

const event = (id: string) => normalizeEvent({ id, slug: id, title: `Event ${id}` });
const page = (ids: string[], nextCursor: string | null) =>
  Response.json({ success: true, data: { events: ids.map(event), nextCursor }, error: null });

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const query = { group: "sports", sub: "live", sort: "trending" as const, tag: "" };

describe("InfiniteEventGrid", () => {
  it("loads and appends the next page when the end of the list scrolls into view", async () => {
    const fetchMock = vi.fn().mockResolvedValue(page(["b", "c"], "c3"));
    vi.stubGlobal("fetch", fetchMock);
    render(<InfiniteEventGrid initialEvents={[event("a"), event("b")]} initialCursor="c2" query={query} />);

    await intersect();
    await waitFor(() => expect(screen.getByText("Event c")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/events?group=sports&sub=live&cursor=c2", expect.anything());
    // "b" was already shown, so it is not duplicated.
    expect(screen.getAllByText("Event b")).toHaveLength(1);
  });

  it("stops at the last page and says so", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(page(["b"], null)));
    render(<InfiniteEventGrid initialEvents={[event("a")]} initialCursor="c2" query={query} />);
    await intersect();
    await waitFor(() => expect(screen.getByText(/seen all markets/i)).toBeInTheDocument());
  });

  it("does not fetch when there is no next page", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<InfiniteEventGrid initialEvents={[event("a")]} initialCursor={null} query={query} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows Retry after a failed page and loads it on click", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ success: false, data: null, error: "x" }, { status: 502 }))
      .mockResolvedValueOnce(page(["b"], null));
    vi.stubGlobal("fetch", fetchMock);
    render(<InfiniteEventGrid initialEvents={[event("a")]} initialCursor="c2" query={query} />);

    await intersect();
    const retry = await screen.findByRole("button", { name: /retry/i });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByText("Event b")).toBeInTheDocument());
  });

  it("shows the empty state when there are no markets", () => {
    render(<InfiniteEventGrid initialEvents={[]} initialCursor={null} query={query} />);
    expect(screen.getByText("No markets found.")).toBeInTheDocument();
  });
});

describe("InfiniteEventGrid grouped by sport", () => {
  const live = (id: string, tagIds: string[], endDate: string) =>
    normalizeEvent({ id, slug: id, title: `Event ${id}`, endDate, tags: tagIds.map((t) => ({ id: t, label: t, slug: t })) });

  it("renders one section per league, sorted by end time, latest first", () => {
    render(
      <InfiniteEventGrid
        groupBySport
        initialEvents={[
          live("liga-early", ["780"], "2026-10-26T18:00:00Z"),
          live("nfl", ["450"], "2026-10-26T21:00:00Z"),
          live("liga-late", ["780"], "2026-10-26T22:00:00Z"),
        ]}
        initialCursor={null}
        query={query}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["NFL1", "LaLiga2"]);
    const liga = screen.getByRole("region", { name: "LaLiga" });
    const titles = [...liga.querySelectorAll("h3")].map((h) => h.textContent);
    expect(titles).toEqual(["Event liga-late", "Event liga-early"]);
  });
});
