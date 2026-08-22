"use client";

import { useQuery } from "@tanstack/react-query";
import { getMerchantProfile } from "@/lib/api/settings";

export default function ProfilePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["merchant-profile"],
    queryFn: getMerchantProfile,
  });

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-slate-400">Loading profile...</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        Unable to load merchant profile.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Merchant Profile</p>
        <div className="mt-5 space-y-4 text-sm text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-400">Name</span>
            <span className="font-medium text-white">{data.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-400">Email</span>
            <span className="font-medium text-white">{data.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-400">Status</span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs uppercase text-emerald-400">
              {data.status}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-400">Created</span>
            <span className="font-medium text-white">
              {new Date(data.createdAt).toLocaleString("id-ID", { dateStyle: "medium" })}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Balance</p>
        <p className="mt-4 text-3xl font-semibold text-white">Rp {data.balance.toLocaleString("id-ID")}</p>
        <p className="mt-3 text-sm text-slate-400">Available settlement balance</p>
      </div>
    </div>
  );
}
