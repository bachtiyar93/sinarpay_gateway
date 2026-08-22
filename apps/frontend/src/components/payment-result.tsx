"use client";

import { useState } from "react";
import type { PaymentResult as PaymentResultType } from "@/lib/api/payments";

export function PaymentResult({ result }: { result: PaymentResultType | null }) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.qrisString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">Result</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Payment generated</h3>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
        >
          {copied ? "Copied!" : "Copy QRIS"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-sm text-slate-400">Transaction ID</p>
          <p className="mt-2 break-all font-mono text-sm text-white">{result.transactionId}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-sm text-slate-400">Amount</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {result.currency} {result.amount.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <p className="text-sm text-slate-400">QRIS string</p>
        <p className="mt-2 break-all font-mono text-xs text-slate-200">{result.qrisString}</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-sm text-slate-400">Status</p>
          <p className="mt-2 text-white">{result.status}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-sm text-slate-400">Expires at</p>
          <p className="mt-2 text-white">
            {new Date(result.expiresAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
      </div>

      {result.paymentLink ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="text-sm text-slate-400">Payment link</p>
          <a href={result.paymentLink} className="mt-2 block break-all text-sm text-indigo-300 hover:text-indigo-200">
            {result.paymentLink}
          </a>
        </div>
      ) : null}
    </div>
  );
}
