import { create } from "zustand";

export type MerchantRole = "MERCHANT" | "OPS" | "ADMIN" | null;

type SessionState = {
  isAuthenticated: boolean;
  role: MerchantRole;
  merchantId: string | null;
  merchantName: string | null;
  setSession: (session: {
    role: Exclude<MerchantRole, null>;
    merchantId: string;
    merchantName: string;
  }) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  role: null,
  merchantId: null,
  merchantName: null,
  setSession: ({ role, merchantId, merchantName }) =>
    set({
      isAuthenticated: true,
      role,
      merchantId,
      merchantName,
    }),
  clearSession: () =>
    set({
      isAuthenticated: false,
      role: null,
      merchantId: null,
      merchantName: null,
    }),
}));
