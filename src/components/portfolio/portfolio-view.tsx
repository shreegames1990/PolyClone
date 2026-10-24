"use client";

import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PositionsTable } from "./positions-table";
import { ActivityList } from "./activity-list";
import { OpenOrdersTable } from "./open-orders-table";
import { usePortfolioValue } from "@/hooks/use-portfolio";
import { formatUsd, shortAddress } from "@/lib/format";

/**
 * Portfolio for any Polymarket wallet. `isOwner` adds cash balance and open
 * orders, which need the signed-in trading client.
 */
export function PortfolioView({
  user,
  name,
  isOwner,
  cash,
  headerExtra,
}: {
  user: string;
  name?: string;
  isOwner: boolean;
  cash?: number;
  headerExtra?: React.ReactNode;
}) {
  const value = usePortfolioValue(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title">{name || shortAddress(user)}</h1>
          <p className="font-mono text-caption text-base-content/60">{user}</p>
        </div>
        {headerExtra}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Positions value" value={value.isLoading ? "…" : formatUsd(value.data)} />
        {isOwner && <StatCard label="Cash (pUSD)" value={cash === undefined ? "Enable trading to view" : formatUsd(cash)} />}
      </div>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          {isOwner && <TabsTrigger value="orders">Open orders</TabsTrigger>}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="positions">
          <PositionsTable user={user} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="orders">
            <OpenOrdersTable />
          </TabsContent>
        )}
        <TabsContent value="activity">
          <ActivityList user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <Stat label={label} value={value} />
    </Card>
  );
}
