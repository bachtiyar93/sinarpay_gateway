import { create } from "zustand";

export type DashboardMetric = "tpv" | "successRate" | "balance";

type DashboardState = {
  chartRange: number;
  selectedMetric: DashboardMetric;
  isRefreshing: boolean;
  setChartRange: (days: number) => void;
  setSelectedMetric: (metric: DashboardMetric) => void;
  setIsRefreshing: (value: boolean) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  chartRange: 30,
  selectedMetric: "tpv",
  isRefreshing: false,
  setChartRange: (days) => set({ chartRange: days }),
  setSelectedMetric: (metric) => set({ selectedMetric: metric }),
  setIsRefreshing: (value) => set({ isRefreshing: value }),
}));
