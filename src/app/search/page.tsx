import { Suspense } from "react";
import { z } from "zod";
import { EventGrid, EventGridSkeleton } from "@/components/markets/event-grid";
import { ErrorState } from "@/components/layout/error-state";
import { searchEvents } from "@/lib/polymarket/gamma";

export const metadata = { title: "Search" };

const querySchema = z.string().trim().min(1).max(100).catch("");

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<EventGridSkeleton />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const raw = (await searchParams).q;
  const query = querySchema.parse(Array.isArray(raw) ? raw[0] : raw);
  if (!query) return <p className="py-16 text-center text-body-sm text-base-content/60">Type something to search.</p>;

  const result = await searchEvents(query).then(
    (events) => ({ ok: true as const, events }),
    (error: unknown) => {
      console.error("[search] failed", error);
      return { ok: false as const };
    },
  );

  return (
    <div className="space-y-5">
      <h1 className="text-title">Results for “{query}”</h1>
      {result.ok ? <EventGrid events={result.events} /> : <ErrorState />}
    </div>
  );
}
