"use client";

import { AnalyticsCard } from "@/components/analytics-card";
import { RecentTransactionsTable } from "@/components/recent-transactions-table";
import { TransactionTrendChart } from "@/components/transaction-trend-chart";
import {
  useMerchantAnalytics,
  useRecentTransactions,
  useTransactionTrend,
} from "@/hooks/use-merchant-analytics";
import { useDashboardStore, type DashboardMetric } from "@/stores/dashboard.store";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const chartRanges = [7, 14, 30];

export default function DashboardPage() {
  const { chartRange, selectedMetric, setChartRange, setSelectedMetric, isRefreshing, setIsRefreshing } =
    useDashboardStore();

  const analyticsQuery = useMerchantAnalytics();
  const trendQuery = useTransactionTrend(chartRange);
  const recentQuery = useRecentTransactions(5);

  const analytics = analyticsQuery.data;
  const trendData = trendQuery.data ?? [];
  const recentTransactions = recentQuery.data ?? [];

  const isLoading = analyticsQuery.isLoading || trendQuery.isLoading || recentQuery.isLoading;
  const hasError = analyticsQuery.isError || trendQuery.isError || recentQuery.isError;

  const metricLabels: Record<string, string> = {
    tpv: "Processing Value",
    successRate: "Success Rate",
    balance: "Merchant Balance",
  };

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([analyticsQuery.refetch(), trendQuery.refetch(), recentQuery.refetch()]);
    setIsRefreshing(false);
  }

  const cards = [
    {
      label: "Total Processing Value",
      value: currency.format(analytics?.tpv ?? 0),
      helper: "Across all successful payment entries this month",
      status: "positive" as const,
    },
    {
      label: "Success Rate",
      value: `${(analytics?.successRate ?? 0).toFixed(1)}%`,
      helper: "Average payment completion rate",
      status: "neutral" as const,
    },
    {
      label: "Merchant Balance",
      value: currency.format(analytics?.balance ?? 0),
      helper: "Available balance for settlement",
      status: "warning" as const,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">Merchant overview</p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard analytics</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            {chartRanges.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setChartRange(range)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  chartRange === range
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(metricLabels).map(([metric, label]) => (
          <button
            key={metric}
            type="button"
            onClick={() => setSelectedMetric(metric as DashboardMetric)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              selectedMetric === metric
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {hasError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          Data analytics sedang tidak tersedia. Silakan coba refresh kembali.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <AnalyticsCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Trend performance</p>
              <h2 className="text-xl font-semibold text-white">
                {metricLabels[selectedMetric]} over {chartRange} days
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-80 items-center justify-center text-slate-400">Loading analytics...</div>
          ) : (
            <TransactionTrendChart data={trendData} />
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Summary</h2>
          </div>
          <div className="space-y-4 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-slate-400">Transactions</p>
              <p className="mt-2 text-2xl font-semibold text-white">{analytics?.totalTransactions ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-slate-400">Selected focus</p>
              <p className="mt-2 text-lg font-medium text-indigo-300">{metricLabels[selectedMetric]}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-slate-400">Last sync</p>
              <p className="mt-2 text-base font-medium text-white">
                {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        {recentQuery.isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-slate-400">
            Loading recent transactions...
          </div>
        ) : (
          <RecentTransactionsTable rows={recentTransactions} />
        )}
      </div>
    </section>
  );
}
