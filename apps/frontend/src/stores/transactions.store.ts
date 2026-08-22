import { create } from "zustand";

export type TransactionStatus = "ALL" | "SUCCESS" | "PENDING" | "FAILED" | "EXPIRED" | "REFUNDED";

type TransactionsState = {
  status: TransactionStatus;
  search: string;
  page: number;
  limit: number;
  sortBy: "date" | "amount" | "status";
  sortDirection: "asc" | "desc";
  selectedId: string | null;
  setStatus: (status: TransactionStatus) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setSort: (sortBy: "date" | "amount" | "status", direction: "asc" | "desc") => void;
  setSelectedId: (id: string | null) => void;
};

export const useTransactionsStore = create<TransactionsState>((set) => ({
  status: "ALL",
  search: "",
  page: 1,
  limit: 10,
  sortBy: "date",
  sortDirection: "desc",
  selectedId: null,
  setStatus: (status) => set({ status, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  setSort: (sortBy, sortDirection) => set({ sortBy, sortDirection }),
  setSelectedId: (selectedId) => set({ selectedId }),
}));
