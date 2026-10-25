import { activeSportsPath, SPORTS_SIDEBAR, type SidebarNode } from "./groups";
import type { PolyEvent } from "./types";

export interface LiveEventGroup {
  /** Sidebar slug ("la-liga"), or "other". */
  readonly key: string;
  /** Header text: league name, the sport for its generic entry ("Soccer"), or "Other". */
  readonly label: string;
  /** Sidebar entry for the icon; null for "Other". */
  readonly node: SidebarNode | null;
  readonly events: readonly PolyEvent[];
}

const OTHER_KEY = "other";

/** Sports entries in sidebar order; a sport's "All" entry is labelled with the sport's name. */
const ENTRIES: readonly { node: SidebarNode; label: string }[] = SPORTS_SIDEBAR.sports.flatMap((sport) =>
  sport.children
    ? sport.children.map((child) => ({ node: child, label: child.label === "All" ? sport.label : child.label }))
    : [{ node: sport, label: sport.label }],
);

const endTime = (event: PolyEvent): number => {
  const t = Date.parse(event.endDate);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/** Latest end time first; events without an end date go last. */
const byEndDesc = (a: PolyEvent, b: PolyEvent) => endTime(b) - endTime(a);

/**
 * Live events grouped by league / sport (sidebar order, "Other" last), each group sorted
 * by end time, latest first. Pure: re-run over all loaded pages as more arrive.
 */
export function groupLiveEvents(events: readonly PolyEvent[]): LiveEventGroup[] {
  const buckets = new Map<string, PolyEvent[]>();
  for (const event of events) {
    const key = activeSportsPath(event.tags.map((t) => t.id)) ?? OTHER_KEY;
    buckets.set(key, [...(buckets.get(key) ?? []), event]);
  }

  const known = ENTRIES.flatMap(({ node, label }) => {
    const bucket = buckets.get(node.slug);
    return bucket ? [{ key: node.slug, label, node, events: bucket.toSorted(byEndDesc) }] : [];
  });
  const other = buckets.get(OTHER_KEY);
  return other ? [...known, { key: OTHER_KEY, label: "Other", node: null, events: other.toSorted(byEndDesc) }] : known;
}
