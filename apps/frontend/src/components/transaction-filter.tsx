"use client";

import { useTransactionsStore, type TransactionStatus } from "@/stores/transactions.store";

type TransactionFilterProps = {
  onSearch: (value: string) => void;
};

const statusOptions: TransactionStatus[] = ["ALL", "SUCCESS", "PENDING", "FAILED", "EXPIRED"];

export function TransactionFilter({ onSearch }: TransactionFilterProps) {
  const { status, search, setStatus, setSearch } = useTransactionsStore();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Search</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              onSearch(event.target.value);
            }}
            placeholder="Search based on ID or description"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TransactionStatus)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
