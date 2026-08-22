export type MerchantAnalytics = {
  tpv: number;
  successRate: number;
  balance: number;
  totalTransactions: number;
};

export type TrendPoint = {
  date: string;
  amount: number;
  count: number;
};

export type RecentTransaction = {
  id: string;
  amount: number;
  status: string;
  date: string;
  description?: string;
};

const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiBaseUrl = `${baseUrl}/api`;
const fallbackMerchantApiKey = process.env.NEXT_PUBLIC_MERCHANT_API_KEY ?? "merchant-demo-key";

function getMerchantApiKey() {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("merchantApiKey") ?? fallbackMerchantApiKey;
  }

  return fallbackMerchantApiKey;
}

export async function getMerchantAnalytics(): Promise<MerchantAnalytics> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/analytics`, {
    cache: "no-store",
    headers: { Accept: "application/json", "x-api-key": getMerchantApiKey() },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load merchant analytics: ${response.status}`);
  }

  return (await response.json()) as MerchantAnalytics;
}

export async function getTransactionTrend(days = 30): Promise<TrendPoint[]> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/analytics/trend?days=${days}`, {
    cache: "no-store",
    headers: { Accept: "application/json", "x-api-key": getMerchantApiKey() },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load transaction trend: ${response.status}`);
  }

  return (await response.json()) as TrendPoint[];
}

export async function getRecentTransactions(limit = 5): Promise<RecentTransaction[]> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/transactions/search`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
    body: JSON.stringify({
      page: 1,
      limit,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load recent transactions: ${response.status}`);
  }

  const data = (await response.json()) as { items: RecentTransaction[] };
  return data.items;
}
