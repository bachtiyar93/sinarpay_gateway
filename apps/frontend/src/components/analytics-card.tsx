type AnalyticsCardProps = {
  label: string;
  value: string;
  helper: string;
  status: "positive" | "neutral" | "warning";
};

export function AnalyticsCard({ label, value, helper, status }: AnalyticsCardProps) {
  const accent =
    status === "positive"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : status === "warning"
        ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
        : "text-indigo-400 border-indigo-500/30 bg-indigo-500/10";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase ${accent}`}>
          {status}
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{helper}</p>
    </div>
  );
}
