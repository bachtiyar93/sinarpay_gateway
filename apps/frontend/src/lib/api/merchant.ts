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
const merchantApiKey = process.env.NEXT_PUBLIC_MERCHANT_API_KEY ?? "merchant-demo-key";

function formatDate(date: Date, daysAgo: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - daysAgo);
  return next.toISOString().slice(0, 10);
}

const mockAnalytics: MerchantAnalytics = {
  tpv: 352000000,
  successRate: 98.6,
  balance: 128500000,
  totalTransactions: 1842,
};

const mockTrend: TrendPoint[] = Array.from({ length: 30 }, (_, index) => {
  const date = formatDate(new Date(), 29 - index);
  const amount = 6000000 + ((index * 1875000) % 19000000);
  return { date, amount, count: 8 + (index % 7) };
});

const mockRecentTransactions: RecentTransaction[] = [
  { id: "TXN-10031", amount: 250000, status: "SUCCESS", date: "2026-08-21T09:30:00Z", description: "Pembelian tiket konser" },
  { id: "TXN-10032", amount: 190000, status: "PENDING", date: "2026-08-21T08:15:00Z", description: "Top up e-wallet" },
  { id: "TXN-10033", amount: 420000, status: "SUCCESS", date: "2026-08-20T18:45:00Z", description: "Pembelian materi kursus" },
  { id: "TXN-10034", amount: 730000, status: "FAILED", date: "2026-08-20T15:30:00Z", description: "Pembelian paket digital" },
  { id: "TXN-10035", amount: 150000, status: "SUCCESS", date: "2026-08-20T11:00:00Z", description: "Pembelian pulsa" },
];

export async function getMerchantAnalytics(): Promise<MerchantAnalytics> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/analytics`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return mockAnalytics;
    }

    const data = (await response.json()) as Partial<MerchantAnalytics>;
    return {
      tpv: Number(data.tpv ?? mockAnalytics.tpv),
      successRate: Number(data.successRate ?? mockAnalytics.successRate),
      balance: Number(data.balance ?? mockAnalytics.balance),
      totalTransactions: Number(data.totalTransactions ?? mockAnalytics.totalTransactions),
    };
  } catch {
    return mockAnalytics;
  }
}

export async function getTransactionTrend(days = 30): Promise<TrendPoint[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/analytics/trend?days=${days}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return mockTrend.slice(-days);
    }

    const data = (await response.json()) as TrendPoint[];
    return data.length > 0 ? data : mockTrend.slice(-days);
  } catch {
    return mockTrend.slice(-days);
  }
}

export async function getRecentTransactions(limit = 5): Promise<RecentTransaction[]> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/transactions/search`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
      "x-api-key": merchantApiKey,
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
