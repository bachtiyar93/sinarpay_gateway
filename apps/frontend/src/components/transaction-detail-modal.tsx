"use client";

import { useTransactionsStore } from "@/stores/transactions.store";
import { useTransactionDetail } from "@/hooks/use-transactions";

type TransactionDetailModalProps = {
  visible: boolean;
};

export function TransactionDetailModal({ visible }: TransactionDetailModalProps) {
  const { selectedId, setSelectedId } = useTransactionsStore();
  const detailQuery = useTransactionDetail(selectedId);

  if (!visible || !selectedId) {
    return null;
  }

  const detail = detailQuery.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Transaction detail</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{selectedId}</h3>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300"
          >
            Close
          </button>
        </div>

        {detailQuery.isLoading ? (
          <div className="mt-6 text-slate-400">Loading transaction detail...</div>
        ) : detail ? (
          <div className="mt-6 space-y-4 text-sm text-slate-300">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">Amount</p>
                <p className="mt-2 text-lg font-semibold text-white">Rp {detail.amount.toLocaleString("id-ID")}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">{detail.status}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-slate-400">Reference</p>
              <p className="mt-2 text-white">{detail.reference ?? "-"}</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-slate-400">History</p>
              <div className="mt-3 space-y-2">
                {detail.history.map((item: { status: string; at: string }, index: number) => (
                  <div key={`${item.status}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
                    <span className="text-white">{item.status}</span>
                    <span className="text-slate-400">
                      {new Date(item.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
