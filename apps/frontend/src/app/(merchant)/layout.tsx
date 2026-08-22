import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AUTH_COOKIES, type UserRole } from "@/lib/auth";
import { MerchantShell } from "@/components/merchant-shell";

export default async function MerchantLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const merchantName = cookieStore.get(AUTH_COOKIES.merchantName)?.value ?? "Merchant";
  const merchantId = cookieStore.get(AUTH_COOKIES.merchantId)?.value ?? merchantName;
  const role = cookieStore.get(AUTH_COOKIES.role)?.value as UserRole | undefined;

  return (
    <MerchantShell merchantName={merchantName} merchantId={merchantId} role={role ?? "MERCHANT"}>
      {children}
    </MerchantShell>
  );
}
