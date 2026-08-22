"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTransactionsStore } from "@/stores/transactions.store";
import { useTransactionDetail } from "@/hooks/use-transactions";
import { refundTransaction } from "@/lib/api/transactions";

type TransactionDetailModalProps = {
  visible: boolean;
};

export function TransactionDetailModal({ visible }: TransactionDetailModalProps) {
  const { selectedId, setSelectedId } = useTransactionsStore();
  const detailQuery = useTransactionDetail(selectedId);
  const queryClient = useQueryClient();
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  if (!visible || !selectedId) {
    return null;
  }

  const detail = detailQuery.data;

  const handleRefund = async () => {
    if (!selectedId) {
      return;
    }

    setIsRefunding(true);
    setRefundError(null);

    try {
      await refundTransaction(selectedId);
      await Promise.all([
        detailQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["merchant"] }),
      ]);
    } catch (error) {
      setRefundError(
        error instanceof Error ? error.message : "Refund gagal diproses.",
      );
    } finally {
      setIsRefunding(false);
    }
  };

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
            {detail.status === "SUCCESS" ? (
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-sky-200">Refund dana</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Refund hanya tersedia untuk transaksi dengan status SUCCESS.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefund}
                    disabled={isRefunding}
                    className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRefunding ? "Memproses refund..." : "Refund dana"}
                  </button>
                </div>
                {refundError ? <p className="mt-3 text-sm text-rose-300">{refundError}</p> : null}
              </div>
            ) : null}

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
                {detail.history.map((item: { fromStatus?: string | null; status: string; reason?: string; at: string }, index: number) => (
                  <div key={`${item.status}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
                    <div>
                      <span className="text-white">{item.fromStatus ? `${item.fromStatus} → ${item.status}` : item.status}</span>
                      {item.reason ? <p className="mt-1 text-xs text-slate-400">{item.reason}</p> : null}
                    </div>
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
