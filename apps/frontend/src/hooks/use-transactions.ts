import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/lib/api/transactions";
import { useTransactionsStore } from "@/stores/transactions.store";

export function useTransactions() {
  const { status, search, page, limit, sortBy, sortDirection } = useTransactionsStore();

  return useQuery({
    queryKey: ["transactions", { status, search, page, limit, sortBy, sortDirection }],
    queryFn: () =>
      getTransactions({
        status,
        search,
        page,
        limit,
      }),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000, // Auto-refresh every 15 seconds
    refetchOnWindowFocus: true, // Refresh when tab becomes active
  });
}

export function useTransactionDetail(id: string | null) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: () => {
      if (!id) {
        return null;
      }
      return import("@/lib/api/transactions").then((mod) => mod.getTransactionDetail(id));
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
