"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiKeys, regenerateApiKey } from "@/lib/api/settings";
import { useSettingsStore } from "@/stores/settings.store";

function maskKey(key: string) {
  if (key.length <= 12) {
    return key;
  }
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const { confirmAction, setConfirmAction } = useSettingsStore();
  const [revealed, setRevealed] = useState(false);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["merchant-api-keys"],
    queryFn: getApiKeys,
  });

  const regeneration = useMutation({
    mutationFn: (id: string) => regenerateApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-api-keys"] });
      setConfirmAction(null);
    },
  });

  const activeKey = data[0];

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-slate-400">Loading API keys...</div>;
  }

  if (error || !activeKey) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        Unable to load API keys.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">API Key</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Active secret</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(activeKey.key)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction("regenerate-key")}
            className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-sm text-slate-400">Key</p>
        <p className="mt-3 break-all font-mono text-sm text-slate-100">
          {revealed ? activeKey.key : maskKey(activeKey.key)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Created</p>
          <p className="mt-2 text-white">
            {new Date(activeKey.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm text-slate-400">Last used</p>
          <p className="mt-2 text-white">
            {activeKey.lastUsedAt ? new Date(activeKey.lastUsedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
          </p>
        </div>
      </div>

      {confirmAction === "regenerate-key" ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-medium">Warning</p>
          <p className="mt-2">Regenerating your API key will invalidate the previous secret immediately.</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => regeneration.mutate(activeKey.id)}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950"
            >
              {regeneration.isPending ? "Regenerating..." : "Confirm regenerate"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
