"use client";

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pmGet } from "@/lib/polymarket/client-fetch";
import { INTERVALS, mergeSeries, parsePriceHistory, type IntervalKey } from "@/lib/polymarket/price-history";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ChartSeries {
  readonly key: string;
  readonly label: string;
  readonly tokenId: string;
}

const COLORS = ["#2e5cff", "#27ae60", "#f2994a", "#bb6bd9"];

const timeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const tooltipFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function PriceChart({ series }: { series: readonly ChartSeries[] }) {
  const [interval, setInterval] = useState<IntervalKey>("1w");
  const fidelity = INTERVALS.find((i) => i.key === interval)?.fidelity ?? 60;

  const results = useQueries({
    queries: series.map((s) => ({
      queryKey: ["prices-history", s.tokenId, interval],
      queryFn: () =>
        pmGet("clob", "prices-history", { market: s.tokenId, interval, fidelity: String(fidelity) }).then(
          parsePriceHistory,
        ),
      refetchInterval: 60_000,
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const failed = results.length > 0 && results.every((r) => r.isError);
  const rows = mergeSeries(series.map((s, i) => ({ key: s.key, points: results[i]?.data ?? [] })));

  return (
    <div className="space-y-3">
      <div className="h-72">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : failed || rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {failed ? "Could not load price history." : "No price history yet."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) => timeFormatter.format(t)}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(p: number) => `${Math.round(p * 100)}%`}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                labelFormatter={(t) => tooltipFormatter.format(Number(t))}
                formatter={(p) => `${(Number(p) * 100).toFixed(1)}%`}
              />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex gap-1">
        {INTERVALS.map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => setInterval(i.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent",
              interval === i.key && "bg-accent text-foreground",
            )}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}
