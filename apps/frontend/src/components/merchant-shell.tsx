"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import type { UserRole } from "@/lib/auth";
import { useSessionStore } from "@/stores/session.store";
import { useUiStore } from "@/stores/ui.store";

type MerchantShellProps = {
  merchantName: string;
  merchantId: string;
  role: UserRole | null;
  children: ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/payment-generator", label: "Payment Generator" },
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
];

export function MerchantShell({ merchantName, merchantId, role, children }: MerchantShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();
  const { setSession, clearSession } = useSessionStore();

  useEffect(() => {
    if (merchantName && role) {
      setSession({
        role,
        merchantId,
        merchantName,
      });
    }
  }, [merchantId, merchantName, role, setSession]);

  const activeLabel = useMemo(
    () => navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label,
    [pathname],
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    setSidebarOpen(false);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
        <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[260px_1fr]">
          <aside
            className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-800 bg-slate-900/95 p-4 shadow-2xl transition-transform duration-200 lg:static lg:w-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:bg-slate-900/70 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
          >
            <div className="flex items-center justify-between lg:block">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">SinarPay</p>
                <h1 className="mt-2 text-lg font-semibold">Merchant Dashboard</h1>
                <p className="mt-1 text-sm text-slate-400">{merchantName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-300 lg:hidden"
              >
                Close
              </button>
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`block rounded-lg border px-3 py-2 text-sm transition ${active ? "border-indigo-500/60 bg-indigo-500/10 text-white" : "border-slate-800 text-slate-300 hover:border-indigo-500/40 hover:bg-slate-800"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {sidebarOpen ? (
            <button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}

          <section className="flex min-w-0 flex-col gap-4">
            <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="rounded-md border border-slate-800 px-3 py-2 text-sm text-slate-300 lg:hidden"
                >
                  Menu
                </button>
                <div>
                  <p className="text-sm text-slate-400">Current page</p>
                  <p className="text-lg font-semibold">{activeLabel ?? "Dashboard"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-white">{merchantName}</p>
                  <p className="text-xs text-slate-400">{role ?? "MERCHANT"}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  Logout
                </button>
              </div>
            </header>

            <main className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
              {children}
            </main>
          </section>
        </div>
      </div>
    </div>
  );
}
