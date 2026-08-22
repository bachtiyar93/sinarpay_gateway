import { useQuery } from "@tanstack/react-query";
import {
  getMerchantAnalytics,
  getRecentTransactions,
  getTransactionTrend,
} from "@/lib/api/merchant";

export function useMerchantAnalytics() {
  return useQuery({
    queryKey: ["merchant", "analytics"],
    queryFn: getMerchantAnalytics,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

export function useTransactionTrend(days: number) {
  return useQuery({
    queryKey: ["merchant", "trend", days],
    queryFn: () => getTransactionTrend(days),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: ["merchant", "recent-transactions", limit],
    queryFn: () => getRecentTransactions(limit),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
