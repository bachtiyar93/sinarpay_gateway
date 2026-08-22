"use client";

import { useTransactionsStore } from "@/stores/transactions.store";
import type { TransactionRecord } from "@/lib/api/transactions";

type TransactionTableProps = {
  rows: TransactionRecord[];
};

const statusStyles: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  FAILED: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
  EXPIRED: "bg-slate-500/10 text-slate-300 border border-slate-500/30",
};

export function TransactionTable({ rows }: TransactionTableProps) {
  const { setSelectedId, setSort, sortBy, sortDirection } = useTransactionsStore();

  const columns: Array<{ key: "date" | "amount" | "status"; label: string }> = [
    { key: "date", label: "Date" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">ID</th>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() =>
                      setSort(column.key, sortBy === column.key && sortDirection === "asc" ? "desc" : "asc")
                    }
                    className="flex items-center gap-1 text-left"
                  >
                    {column.label}
                    {sortBy === column.key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                  </button>
                </th>
              ))}
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                <td className="px-5 py-3 font-mono text-xs">{row.id}</td>
                <td className="px-5 py-3 text-slate-400">
                  {new Date(row.date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-5 py-3">Rp {row.amount.toLocaleString("id-ID")}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] uppercase ${statusStyles[row.status] ?? "bg-slate-700/30 text-slate-300"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
                  >
                    View detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
