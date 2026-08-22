"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { simulatePaymentStatus, type PaymentResult as PaymentResultType, type PaymentSimulationStatus } from "@/lib/api/payments";
import { usePaymentGeneratorStore } from "@/stores/payment-generator.store";

export function PaymentResult({ result }: { result: PaymentResultType | null }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PaymentSimulationStatus>("SUCCESS");
  const [simulationState, setSimulationState] = useState<{ success: boolean; status: string; message: string } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [bypassExecuted, setBypassExecuted] = useState(false);
  const { setResult } = usePaymentGeneratorStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!result?.qrisString) {
      setQrDataUrl(null);
      return;
    }

    let active = true;

    QRCode.toDataURL(result.qrisString, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQrDataUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [result?.qrisString]);

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

  const handleSimulateStatus = async () => {
    setSimulating(true);
    const response = await simulatePaymentStatus(result.transactionId, selectedStatus);
    setSimulationState({
      success: response.success,
      status: response.status,
      message: response.message ?? `Status simulated to ${selectedStatus}.`,
    });
    setSimulating(false);
    
    // Hide bypass panel after successful simulation
    if (response.success) {
      setBypassExecuted(true);
      
      // Invalidate transactions cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      // Clear result after 3 seconds
      setTimeout(() => {
        setResult(null);
        setBypassExecuted(false);
        setSimulationState(null);
      }, 3000);
    }
  };

  const handleClearResult = () => {
    setResult(null);
    setBypassExecuted(false);
    setSimulationState(null);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">Result</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Payment generated</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            {copied ? "Copied!" : "Copy QRIS"}
          </button>
          <button
            type="button"
            onClick={handleClearResult}
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code for payment" className="mx-auto block h-[220px] w-[220px] rounded-lg bg-white p-2" />
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/70 text-xs text-slate-400">
              QR preview unavailable
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-sm text-slate-400">Transaction ID</p>
            <p className="mt-2 break-all font-mono text-sm text-white">{result.transactionId}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-sm text-slate-400">QRIS string</p>
            <p className="mt-2 break-all font-mono text-xs text-slate-200">{result.qrisString}</p>
          </div>
        </div>
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

      {!bypassExecuted && (
        <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Simulation bypass</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as PaymentSimulationStatus)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            >
              <option value="SUCCESS">Berhasil</option>
              <option value="FAILED">Gagal</option>
              <option value="CANCELLED">Dibatalkan user</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <button
              type="button"
              onClick={handleSimulateStatus}
              disabled={simulating}
              className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {simulating ? "Simulating..." : "Simulate status"}
            </button>
          </div>

          {simulationState ? (
            <p className={`mt-3 text-sm ${simulationState.success ? "text-emerald-300" : "text-rose-300"}`}>
              {simulationState.message}
            </p>
          ) : null}
        </div>
      )}

      {bypassExecuted && simulationState && (
        <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className={`text-sm ${simulationState.success ? "text-emerald-300" : "text-rose-300"}`}>
            ✓ {simulationState.message}
          </p>
          <p className="mt-2 text-xs text-slate-400">Result akan dibersihkan otomatis dalam 3 detik...</p>
        </div>
      )}
    </div>
  );
}
