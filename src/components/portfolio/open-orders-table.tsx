"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelOrder, useOpenOrders } from "@/hooks/use-trading-data";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OpenOrdersTable() {
  const { data, isLoading, isError } = useOpenOrders();
  const cancel = useCancelOrder();

  if (isLoading) return <Skeleton className="h-32" />;
  if (isError) return <p className="py-8 text-center text-sm text-no">Could not load open orders.</p>;
  if (!data?.length) return <p className="py-8 text-center text-sm text-base-content/60">No open orders.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-base-content/60">
          <tr>
            <th className="py-2 font-normal">Side</th>
            <th className="py-2 font-normal">Outcome</th>
            <th className="py-2 text-right font-normal">Price</th>
            <th className="py-2 text-right font-normal">Filled</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((o) => (
            <tr key={o.id}>
              <td className={cn("py-3 font-medium", o.side === "BUY" ? "text-yes" : "text-no")}>{o.side}</td>
              <td className="py-3">{o.outcome}</td>
              <td className="py-3 text-right tabular-nums">{formatCents(Number(o.price))}</td>
              <td className="py-3 text-right tabular-nums">
                {Number(o.sizeMatched).toFixed(2)} / {Number(o.originalSize).toFixed(2)}
              </td>
              <td className="py-3 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cancel.isPending && cancel.variables === o.id}
                  onClick={() => cancel.mutate(o.id)}
                >
                  Cancel
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
