"use client";

import { useMemo } from "react";
import { TransactionDetailModal } from "@/components/transaction-detail-modal";
import { TransactionFilter } from "@/components/transaction-filter";
import { TransactionTable } from "@/components/transaction-table";
import { buildCsv } from "@/lib/api/transactions";
import { useTransactions } from "@/hooks/use-transactions";
import { useTransactionsStore } from "@/stores/transactions.store";

export default function TransactionsPage() {
  const { page, limit, selectedId, setPage, setSearch } = useTransactionsStore();
  const { data, isLoading, error } = useTransactions();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const summary = useMemo(() => {
    if (!data?.items.length) {
      return { total: 0, volume: 0, success: 0 };
    }

    return {
      total: data.total,
      volume: data.items.reduce((sum, item) => sum + item.amount, 0),
      success: data.items.filter((item) => item.status === "SUCCESS").length,
    };
  }, [data]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleExport = () => {
    if (!data?.items.length) {
      return;
    }

    const csv = buildCsv(data.items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Transactions</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Payment activity</h1>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={!data?.items.length}
          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-slate-400">Total records</p>
          <p className="mt-4 text-3xl font-semibold text-white">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-slate-400">Volume</p>
          <p className="mt-4 text-3xl font-semibold text-white">Rp {summary.volume.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-slate-400">Successful</p>
          <p className="mt-4 text-3xl font-semibold text-white">{summary.success}</p>
        </div>
      </div>

      <TransactionFilter onSearch={handleSearch} />

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error.message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-slate-400">Loading transactions...</div>
      ) : data?.items.length ? (
        <>
          <TransactionTable rows={data.items} />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-slate-400">
          No transactions found.
        </div>
      )}

      <TransactionDetailModal visible={Boolean(selectedId)} />
    </div>
  );
}
