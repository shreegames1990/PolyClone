import { z } from "zod";
import type { EventFilter } from "./queries";

/**
 * Top-level groups (header categories) and their sidebar subgroups, modelled on
 * polymarket.com. Sports uses a curated hierarchy with Gamma league icons
 * (`GET /sports`); other groups list Gamma related tags at runtime.
 */
export interface Group {
  readonly slug: string;
  readonly label: string;
  /** Gamma tag id for the group's "All" view. */
  readonly tagId: string;
  readonly sidebar: "sports" | "related";
}

export const GROUPS: readonly Group[] = [
  { slug: "politics", label: "Politics", tagId: "2", sidebar: "related" },
  { slug: "sports", label: "Sports", tagId: "1", sidebar: "sports" },
  { slug: "crypto", label: "Crypto", tagId: "21", sidebar: "related" },
  { slug: "finance", label: "Finance", tagId: "120", sidebar: "related" },
  { slug: "geopolitics", label: "Geopolitics", tagId: "100265", sidebar: "related" },
  { slug: "tech", label: "Tech", tagId: "1401", sidebar: "related" },
  { slug: "culture", label: "Culture", tagId: "596", sidebar: "related" },
  { slug: "world", label: "World", tagId: "101970", sidebar: "related" },
  { slug: "economy", label: "Economy", tagId: "100328", sidebar: "related" },
];

/** Generic icons for entries without a league image (mapped to lucide icons in the UI). */
export type SidebarGlyph = "live" | "futures" | "soccer" | "tennis" | "esports" | "cricket";

export interface SidebarNode {
  /** URL segment under /sports; parents with children are not links themselves. */
  readonly slug: string;
  readonly label: string;
  readonly tagId?: string;
  readonly filter?: "live" | "futures";
  readonly icon?: string;
  readonly glyph?: SidebarGlyph;
  readonly children?: readonly SidebarNode[];
}

const ICONS = "https://polymarket-upload.s3.us-east-2.amazonaws.com";

const league = (slug: string, label: string, tagId: string, icon: string): SidebarNode => ({
  slug,
  label,
  tagId,
  // Most icons live under league-icons/; a leading "/" means the bucket root.
  icon: icon.startsWith("/") ? `${ICONS}${icon}` : `${ICONS}/league-icons/${icon}`,
});

export const SPORTS_SIDEBAR: { readonly top: readonly SidebarNode[]; readonly sports: readonly SidebarNode[] } = {
  top: [
    { slug: "live", label: "Live", filter: "live", glyph: "live" },
    { slug: "futures", label: "Futures", filter: "futures", glyph: "futures" },
  ],
  sports: [
    league("nfl", "NFL", "450", "nfl-helmet-blue-a1188621.png"),
    league("nba", "NBA", "745", "nba-7a8bf611.png"),
    league("mlb", "MLB", "100381", "mlb-f4060398.png"),
    league("nhl", "NHL", "899", "hockey-stick-ce1126-9167ab07a881.png"),
    league("college-football", "College Football", "636", "cbb-3ddd4bb7.png"),
    league("college-basketball", "College Basketball", "101178", "cbb-3ddd4bb7.png"),
    league("ufc", "UFC", "279", "ufc-40ea1d2a.png"),
    league("ucl", "UEFA Champions League", "1234", "ucl-a369c3d8.png"),
    league("unl", "UNL", "100816", "unl.png"),
    {
      slug: "soccer-group",
      label: "Soccer",
      glyph: "soccer",
      children: [
        { slug: "soccer", label: "All", tagId: "100350", glyph: "soccer" },
        league("epl", "Premier League", "306", "epl-24885021.png"),
        league("la-liga", "LaLiga", "780", "lal-33aa3578.png"),
        league("bundesliga", "Bundesliga", "1494", "bun.png"),
        league("serie-a", "Serie A", "100618", "sea.png"),
        league("ligue-1", "Ligue 1", "102070", "fl1-1ddf3796.png"),
        league("uel", "UEFA Europa League", "101787", "uel-710651e1.png"),
        league("mls", "MLS", "100100", "mls.png"),
      ],
    },
    {
      slug: "tennis-group",
      label: "Tennis",
      glyph: "tennis",
      children: [
        { slug: "tennis", label: "All", tagId: "864", glyph: "tennis" },
        league("atp", "ATP Tour", "101232", "atp-b3819f2f.png"),
        league("wta", "WTA Tour", "102123", "wta-a0555a41.png"),
      ],
    },
    {
      slug: "esports-group",
      label: "Esports",
      glyph: "esports",
      children: [
        { slug: "esports", label: "All", tagId: "64", glyph: "esports" },
        league("lol", "LoL", "65", "lol-cf27b4a0.png"),
        league("cs2", "CS2", "100780", "cs2.png"),
        league("dota-2", "Dota 2", "102366", "/dota2-1d288592aa.png"),
        league("valorant", "Valorant", "101672", "val-41c5e64a.png"),
      ],
    },
    {
      slug: "cricket-group",
      label: "Cricket",
      glyph: "cricket",
      children: [
        { slug: "cricket", label: "All", tagId: "517", glyph: "cricket" },
        league("ipl", "IPL", "101977", "ipl.png"),
      ],
    },
    league("f1", "Formula 1", "435", "f1-9ffc2002.png"),
    league("boxing", "Boxing", "683", "boxing-cba26879.png"),
    league("wnba", "WNBA", "100254", "wnba.png"),
  ],
};

/** Every linkable sports entry (leaves). Generic "All" entries carry a glyph; leagues do not. */
const SPORTS_LEAVES: readonly SidebarNode[] = [
  ...SPORTS_SIDEBAR.top,
  ...SPORTS_SIDEBAR.sports.flatMap((n) => n.children ?? [n]),
];

export interface RelatedTag {
  readonly id: string;
  readonly slug: string;
  readonly label: string;
}

export interface ResolvedSubgroup {
  readonly label: string;
  readonly filter: EventFilter;
}

const SUBGROUP_SLUG = /^[a-z0-9-]{1,64}$/;

export function findGroup(slug: string): Group | null {
  return GROUPS.find((g) => g.slug === slug) ?? null;
}

const titleCase = (slug: string) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function sportsFilter(node: SidebarNode): EventFilter | null {
  if (node.filter) return { kind: node.filter };
  return node.tagId ? { kind: "tag", tagId: node.tagId } : null;
}

/** The label and event filter for /<group>/<sub>, or null for an unknown subgroup. */
export function resolveSubgroup(
  group: Group,
  sub: string | undefined,
  related: readonly RelatedTag[] = [],
): ResolvedSubgroup | null {
  if (sub === undefined) return { label: group.label, filter: { kind: "tag", tagId: group.tagId } };
  if (!SUBGROUP_SLUG.test(sub)) return null;
  if (group.sidebar === "sports") {
    const node = SPORTS_LEAVES.find((n) => n.slug === sub);
    const filter = node && sportsFilter(node);
    return node && filter ? { label: node.label, filter } : null;
  }
  const tag = related.find((t) => t.slug === sub);
  return { label: tag?.label ?? titleCase(sub), filter: { kind: "slug", slug: sub } };
}

export function subgroupHref(groupSlug: string, sub?: string): string {
  return sub ? `/${groupSlug}/${sub}` : `/${groupSlug}`;
}

/** Sidebar entry to highlight for an event, from its tag ids (most specific match wins). */
export function activeSportsPath(eventTagIds: readonly string[]): string | null {
  const ids = new Set(eventTagIds);
  const matches = SPORTS_LEAVES.filter((n) => n.tagId && ids.has(n.tagId));
  // A league (no glyph) is more specific than a sport's generic "All" entry.
  return (matches.find((n) => !n.glyph) ?? matches[0])?.slug ?? null;
}

const relatedTagSchema = z.object({ id: z.coerce.string(), slug: z.string().min(1), label: z.string().min(1) });

/** Parses Gamma `GET /tags/{id}/related-tags/tags`, dropping malformed entries. */
export function parseRelatedTags(raw: unknown): RelatedTag[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((t) => {
    const parsed = relatedTagSchema.safeParse(t);
    return parsed.success ? [parsed.data] : [];
  });
}
