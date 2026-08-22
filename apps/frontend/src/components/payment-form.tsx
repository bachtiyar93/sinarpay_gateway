"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { createPayment } from "@/lib/api/payments";
import { usePaymentGeneratorStore } from "@/stores/payment-generator.store";

const paymentSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  description: z.string().max(120, "Description is too long").optional().or(z.literal("")),
  currency: z.enum(["IDR", "USD", "SGD"]),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export function PaymentForm() {
  const { amount, description, currency, isSubmitting, setDraft, setResult, setSubmitting } = usePaymentGeneratorStore();
  const form = useForm<PaymentFormValues>({
    defaultValues: {
      amount: Number(amount) || 0,
      description: description || "",
      currency: currency || "IDR",
    },
  });

  const handleSubmit = async (values: PaymentFormValues) => {
    const parsed = paymentSchema.safeParse(values);
    if (!parsed.success) {
      const error = parsed.error.flatten().fieldErrors;
      if (error.amount?.[0]) {
        form.setError("amount", { type: "manual", message: error.amount[0] });
      }
      if (error.description?.[0]) {
        form.setError("description", { type: "manual", message: error.description[0] });
      }
      return;
    }

    const sanitizedValues = parsed.data;
    setDraft({ amount: String(sanitizedValues.amount), description: sanitizedValues.description ?? "", currency: sanitizedValues.currency });
    setSubmitting(true);

    try {
      const result = await createPayment({
        amount: sanitizedValues.amount,
        currency: sanitizedValues.currency,
        description: sanitizedValues.description || undefined,
      });
      setResult(result);
      form.reset({ amount: 0, description: "", currency: sanitizedValues.currency });
      setDraft({ amount: "", description: "", currency: sanitizedValues.currency });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create payment.";
      setResult({
        transactionId: "ERROR",
        qrisString: message,
        amount: sanitizedValues.amount,
        currency: sanitizedValues.currency,
        status: "ERROR",
        expiresAt: new Date().toISOString(),
        description: sanitizedValues.description || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Create payment</p>
          <h2 className="mt-2 text-xl font-semibold text-white">QRIS payment form</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Amount</span>
          <input
            type="number"
            min={1}
            step="1"
            {...form.register("amount", { valueAsNumber: true })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
            placeholder="250000"
          />
          {form.formState.errors.amount ? (
            <p className="mt-1 text-xs text-rose-300">{form.formState.errors.amount.message}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Currency</span>
          <select
            {...form.register("currency")}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
          >
            <option value="IDR">IDR</option>
            <option value="USD">USD</option>
            <option value="SGD">SGD</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm text-slate-300">Description</span>
        <textarea
          rows={4}
          {...form.register("description")}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
          placeholder="Order: Premium bundle"
        />
        {form.formState.errors.description ? (
          <p className="mt-1 text-xs text-rose-300">{form.formState.errors.description.message}</p>
        ) : null}
      </label>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={form.formState.isSubmitting || isSubmitting}
          className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create payment"}
        </button>
      </div>
    </form>
  );
}
