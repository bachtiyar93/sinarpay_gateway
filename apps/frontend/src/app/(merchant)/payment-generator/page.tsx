"use client";

import { PaymentForm } from "@/components/payment-form";
import { PaymentResult } from "@/components/payment-result";
import { usePaymentGeneratorStore } from "@/stores/payment-generator.store";

export default function PaymentGeneratorPage() {
  const { result } = usePaymentGeneratorStore();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Merchant area</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Payment generator</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PaymentForm />
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Notes</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Payment generation uses the backend QRIS creation flow.</li>
              <li>• Result includes transaction ID, QRIS payload, expiry, and copyable link.</li>
              <li>• Draft values are preserved in a modular Zustand store.</li>
            </ul>
          </div>

          <PaymentResult result={result} />
        </div>
      </div>
    </div>
  );
}
