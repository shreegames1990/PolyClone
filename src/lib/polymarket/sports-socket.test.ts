import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSportsFeed, type SportsSocket } from "./sports-socket";

class FakeSocket implements SportsSocket {
  static instances: FakeSocket[] = [];
  readonly sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }
  receive(data: unknown) {
    this.onmessage?.({ data: typeof data === "string" ? data : JSON.stringify(data) });
  }
}

const frame = { gameId: 7, leagueAbbreviation: "epl", status: "InProgress", live: true, ended: false, score: "1-0", period: "1H", elapsed: "23" };
const latest = () => FakeSocket.instances.at(-1)!;

describe("createSportsFeed", () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const feed = () => createSportsFeed({ url: "wss://sports.test/ws", createSocket: (url) => new FakeSocket(url) });

  it("connects only once something subscribes", () => {
    const f = feed();
    expect(FakeSocket.instances).toHaveLength(0);
    f.subscribe(() => {});
    f.subscribe(() => {});
    expect(FakeSocket.instances).toHaveLength(1);
    expect(latest().url).toBe("wss://sports.test/ws");
  });

  it("stores each game's latest state and notifies listeners", () => {
    const f = feed();
    const listener = vi.fn();
    f.subscribe(listener);
    latest().receive(frame);
    expect(f.get(7)).toEqual({ live: true, ended: false, score: "1-0", period: "1H", elapsed: "23" });
    expect(listener).toHaveBeenCalledTimes(1);

    const before = f.get(7);
    latest().receive({ ...frame, score: "1-1" });
    expect(f.get(7)?.score).toBe("1-1");
    expect(before?.score).toBe("1-0");
  });

  it("answers server pings and ignores frames it cannot read", () => {
    const f = feed();
    const listener = vi.fn();
    f.subscribe(listener);
    latest().receive("ping");
    latest().receive("not json");
    latest().receive({ hello: "world" });
    expect(latest().sent).toEqual(["pong"]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("reads frames batched in an array", () => {
    const f = feed();
    f.subscribe(() => {});
    latest().receive([frame, { ...frame, gameId: 8, score: "0-2" }]);
    expect(f.get(8)?.score).toBe("0-2");
    expect(f.get(7)?.score).toBe("1-0");
  });

  it("reconnects with backoff after the socket drops", () => {
    const f = feed();
    f.subscribe(() => {});
    latest().onclose?.();
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(2);
    latest().onerror?.();
    vi.advanceTimersByTime(1999);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it("resets the backoff once a connection opens", () => {
    const f = feed();
    f.subscribe(() => {});
    latest().onclose?.();
    vi.advanceTimersByTime(1000);
    latest().onopen?.();
    latest().onclose?.();
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it("closes after the last listener leaves, but survives a quick remount", () => {
    const f = feed();
    const off = f.subscribe(() => {});
    off();
    const offAgain = f.subscribe(() => {});
    vi.advanceTimersByTime(10_000);
    expect(latest().closed).toBe(false);

    offAgain();
    vi.advanceTimersByTime(10_000);
    expect(latest().closed).toBe(true);
    expect(FakeSocket.instances).toHaveLength(1);

    f.subscribe(() => {});
    expect(FakeSocket.instances).toHaveLength(2);
  });
});
