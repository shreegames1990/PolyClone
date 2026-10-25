"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AssetType, type OpenOrder } from "@polymarket/client";
import { fetchBalanceAllowance } from "@polymarket/client/actions";
import { toast } from "sonner";
import { useTrading } from "@/components/trading/trading-provider";
import { cancelOrder, toTokenAmount } from "@/lib/trading/orders";
import { describeTradeError } from "@/lib/trading/errors";

const MAX_ORDER_PAGES = 5;

/** pUSD (collateral) balance, or shares of one outcome token when tokenId is given. */
export function useTokenBalance(tokenId?: string) {
  const { client, tradingAddress } = useTrading();
  return useQuery({
    queryKey: ["balance", tradingAddress, tokenId ?? "collateral"],
    enabled: Boolean(client),
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!client) return 0;
      const response = await fetchBalanceAllowance(
        client,
        tokenId ? { assetType: AssetType.CONDITIONAL, tokenId } : { assetType: AssetType.COLLATERAL },
      );
      return toTokenAmount(response.balance);
    },
  });
}

export function useTradingApprovals() {
  const { client, tradingAddress } = useTrading();
  const queryClient = useQueryClient();
  const state = useQuery({
    queryKey: ["approvals", tradingAddress],
    enabled: Boolean(client),
    staleTime: 60_000,
    queryFn: () => client!.fetchTradingApprovalsState(),
  });
  const approve = useMutation({
    mutationFn: () => client!.setupTradingApprovals(),
    onSuccess: () => {
      toast.success("Trading approvals confirmed.");
      return queryClient.invalidateQueries({ queryKey: ["approvals", tradingAddress] });
    },
    onError: (error) => {
      console.error("[trading] approvals failed", error);
      toast.error(describeTradeError(error));
    },
  });
  return { state, approve };
}

export function useOpenOrders() {
  const { client, tradingAddress } = useTrading();
  return useQuery({
    queryKey: ["open-orders", tradingAddress],
    enabled: Boolean(client),
    refetchInterval: 15_000,
    queryFn: async () => {
      const orders: OpenOrder[] = [];
      let pages = 0;
      try {
        for await (const page of client!.listOpenOrders()) {
          orders.push(...page.items);
          if (++pages >= MAX_ORDER_PAGES) break;
        }
      } catch (error) {
        console.error("[trading] open orders failed", error);
        throw error;
      }
      return orders;
    },
  });
}

/** Cancels several orders in one request (e.g. "Cancel all" on an event page). */
export function useCancelOrders() {
  const { client, tradingAddress } = useTrading();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) => client!.cancelOrders({ orderIds }),
    onSuccess: (_result, orderIds) => {
      toast.success(orderIds.length === 1 ? "Order cancelled." : `${orderIds.length} orders cancelled.`);
      return queryClient.invalidateQueries({ queryKey: ["open-orders", tradingAddress] });
    },
    onError: (error) => {
      console.error("[trading] cancel orders failed", error);
      toast.error(describeTradeError(error));
    },
  });
}

export function useCancelOrder() {
  const { client, tradingAddress } = useTrading();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(client!, orderId),
    onSuccess: () => {
      toast.success("Order cancelled.");
      return queryClient.invalidateQueries({ queryKey: ["open-orders", tradingAddress] });
    },
    onError: (error) => toast.error(describeTradeError(error)),
  });
}
