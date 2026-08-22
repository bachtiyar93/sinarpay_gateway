"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/stores/settings.store";

const tabs = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setActiveTab } = useSettingsStore();

  useEffect(() => {
    const activeTab = tabs.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href.replace("/settings/", "") as
      | "profile"
      | "api-keys"
      | "webhooks";

    if (activeTab) {
      setActiveTab(activeTab);
    }
  }, [pathname, setActiveTab]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Merchant preferences</h1>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setActiveTab(tab.href.replace("/settings/", "") as "profile" | "api-keys" | "webhooks")}
              className={`rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-indigo-500 text-white" : "bg-slate-950 text-slate-300 hover:bg-slate-800"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
