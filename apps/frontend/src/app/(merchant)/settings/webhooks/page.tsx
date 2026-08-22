"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getWebhookUrl, testWebhook, updateWebhookUrl } from "@/lib/api/settings";

const webhookSchema = z.object({
  url: z.string().url("Enter a valid URL"),
});

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["merchant-webhook"],
    queryFn: getWebhookUrl,
  });

  const form = useForm<z.infer<typeof webhookSchema>>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      url: data?.url ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (url: string) => updateWebhookUrl(url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merchant-webhook"] }),
  });

  const testMutation = useMutation({
    mutationFn: () => testWebhook(),
  });

  const onSubmit = async (values: z.infer<typeof webhookSchema>) => {
    await updateMutation.mutateAsync(values.url);
    form.reset({ url: values.url });
  };

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-slate-400">Loading webhook settings...</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        Unable to load webhook configuration.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Webhook</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Update callback URL</h2>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm text-slate-300">Webhook URL</span>
          <input
            {...form.register("url")}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500"
            placeholder="https://hooks.example.com/callback"
          />
          {form.formState.errors.url ? (
            <p className="mt-1 text-xs text-rose-300">{form.formState.errors.url.message}</p>
          ) : null}
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateMutation.isPending ? "Saving..." : "Save URL"}
          </button>
          <button
            type="button"
            onClick={() => testMutation.mutate()}
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200"
          >
            {testMutation.isPending ? "Testing..." : "Test webhook"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current URL</p>
          <p className="mt-3 break-all text-sm text-slate-100">{data.url}</p>
          <p className="mt-3 text-xs text-slate-400">
            Last test: {data.lastTestAt ? new Date(data.lastTestAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Not tested yet"}
          </p>
        </div>

        {testMutation.data ? (
          <div className={`rounded-2xl border p-5 shadow-lg ${testMutation.data.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Test result</p>
            <p className="mt-3 text-sm text-white">Status: {testMutation.data.statusCode}</p>
            <p className="mt-2 text-sm text-slate-200">{testMutation.data.response}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
