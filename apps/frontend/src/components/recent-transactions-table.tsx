import type { RecentTransaction } from "@/lib/api/merchant";

type RecentTransactionsTableProps = {
  rows: RecentTransaction[];
};

const statusStyles: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  FAILED: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
};

export function RecentTransactionsTable({ rows }: RecentTransactionsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
      <div className="border-b border-slate-800 px-5 py-3">
        <h3 className="text-lg font-semibold text-white">Recent transactions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                <td className="px-5 py-3 font-mono text-xs">{row.id}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] uppercase ${statusStyles[row.status] ?? "bg-slate-700/30 text-slate-300"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-5 py-3">Rp {row.amount.toLocaleString("id-ID")}</td>
                <td className="px-5 py-3 text-slate-400">
                  {new Date(row.date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
