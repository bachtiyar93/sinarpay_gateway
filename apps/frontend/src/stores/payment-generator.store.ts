import { create } from "zustand";
import type { PaymentResult } from "@/lib/api/payments";

type PaymentGeneratorState = {
  amount: string;
  description: string;
  currency: "IDR" | "USD" | "SGD";
  result: PaymentResult | null;
  isSubmitting: boolean;
  idempotencyKey: string | null;
  setDraft: (draft: Partial<Pick<PaymentGeneratorState, "amount" | "description" | "currency">>) => void;
  setResult: (result: PaymentResult | null) => void;
  setSubmitting: (value: boolean) => void;
  setIdempotencyKey: (key: string) => void;
  reset: () => void;
};

export const usePaymentGeneratorStore = create<PaymentGeneratorState>((set) => ({
  amount: "",
  description: "",
  currency: "IDR",
  result: null,
  isSubmitting: false,
  idempotencyKey: null,
  setDraft: (draft) => set((state) => ({ ...state, ...draft })),
  setResult: (result) => set({ result }),
  setSubmitting: (value) => set({ isSubmitting: value }),
  setIdempotencyKey: (key) => set({ idempotencyKey: key }),
  reset: () =>
    set({
      amount: "",
      description: "",
      currency: "IDR",
      result: null,
      isSubmitting: false,
      idempotencyKey: null,
    }),
}));
