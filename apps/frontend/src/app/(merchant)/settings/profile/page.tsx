"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_COOKIES } from "@/lib/auth";
import { getMerchantProfile, updateMerchantProfile } from "@/lib/api/settings";
import { useSessionStore } from "@/stores/session.store";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((state) => state.setSession);
  const { data, isLoading, error } = useQuery({
    queryKey: ["merchant-profile"],
    queryFn: getMerchantProfile,
  });
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data?.name) {
      setName(data.name);
    }
  }, [data?.name]);

  const updateMutation = useMutation({
    mutationFn: (nextName: string) => updateMerchantProfile(nextName),
    onSuccess: (updated) => {
      queryClient.setQueryData(["merchant-profile"], updated);
      setSession({
        role: "OPS",
        merchantId: updated.id,
        merchantName: updated.name,
      });
      document.cookie = `${AUTH_COOKIES.merchantName}=${encodeURIComponent(updated.name)}; path=/; max-age=3600; SameSite=Lax`;
      document.cookie = `${AUTH_COOKIES.merchantId}=${encodeURIComponent(updated.id)}; path=/; max-age=3600; SameSite=Lax`;
      setSuccessMessage("Profile berhasil diperbarui.");
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    await updateMutation.mutateAsync(name);
  }

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
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Merchant Profile</p>
        <div className="mt-5 space-y-4 text-sm text-slate-300">
          <label className="block">
            <span className="mb-2 block text-slate-400">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
              placeholder="Merchant name"
            />
          </label>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-400">Email</span>
            <span className="font-medium text-white">{data.email ?? "-"}</span>
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

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateMutation.isPending ? "Saving..." : "Save profile"}
          </button>
          {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}
          {updateMutation.error ? (
            <p className="text-sm text-rose-300">
              {updateMutation.error instanceof Error ? updateMutation.error.message : "Gagal memperbarui profile."}
            </p>
          ) : null}
        </div>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Balance</p>
        <p className="mt-4 text-3xl font-semibold text-white">Rp {data.balance.toLocaleString("id-ID")}</p>
        <p className="mt-3 text-sm text-slate-400">Available settlement balance</p>
      </div>
    </div>
  );
}
