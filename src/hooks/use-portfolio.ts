"use client";

import { useQuery } from "@tanstack/react-query";
import { pmGet } from "@/lib/polymarket/client-fetch";
import { parseActivity, parsePortfolioValue, parsePositions } from "@/lib/polymarket/data-api";

const PAGE_LIMIT = "100";

export function usePositions(user: string | undefined) {
  return useQuery({
    queryKey: ["positions", user],
    enabled: Boolean(user),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { items } = parsePositions(await pmGet("data", "v2/positions", { user: user!, limit: PAGE_LIMIT }));
      return items.toSorted((a, b) => b.value - a.value);
    },
  });
}

export function useActivity(user: string | undefined) {
  return useQuery({
    queryKey: ["activity", user],
    enabled: Boolean(user),
    queryFn: async () => parseActivity(await pmGet("data", "v2/activity", { user: user!, limit: PAGE_LIMIT })).items,
  });
}

export function usePortfolioValue(user: string | undefined) {
  return useQuery({
    queryKey: ["portfolio-value", user],
    enabled: Boolean(user),
    refetchInterval: 30_000,
    queryFn: async () => parsePortfolioValue(await pmGet("data", "v2/value", { user: user! })),
  });
}
