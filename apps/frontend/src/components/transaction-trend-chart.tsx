"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/lib/api/merchant";

type TransactionTrendChartProps = {
  data: TrendPoint[];
};

export function TransactionTrendChart({ data }: TransactionTrendChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 10, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="amountFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            formatter={(value) => [`Rp ${Number(value ?? 0).toLocaleString("id-ID")}`, "Amount"]}
            labelFormatter={(label) => `Tanggal: ${label}`}
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
              color: "#e2e8f0",
            }}
          />
          <Area type="monotone" dataKey="amount" stroke="#818cf8" strokeWidth={3} fill="url(#amountFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
