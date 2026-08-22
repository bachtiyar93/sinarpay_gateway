export type TransactionRecord = {
  id: string;
  amount: number;
  status: "SUCCESS" | "PENDING" | "FAILED" | "EXPIRED" | "REFUNDED";
  date: string;
  description?: string;
  reference?: string;
};

export type TransactionsResponse = {
  items: TransactionRecord[];
  total: number;
  page: number;
  limit: number;
};

export type TransactionDetail = TransactionRecord & {
  currency: string;
  expiresAt: string;
  history: Array<{
    fromStatus?: string | null;
    status: string;
    reason?: string;
    at: string;
  }>;
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

export async function getTransactions(filters?: { status?: string; search?: string; page?: number; limit?: number }) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/transactions/search`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
    body: JSON.stringify({
      status: filters?.status,
      search: filters?.search,
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 10,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load transactions: ${response.status}`);
  }

  return (await response.json()) as TransactionsResponse;
}

export async function getTransactionDetail(id: string): Promise<TransactionDetail> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/transactions/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load transaction detail: ${response.status}`);
  }

  return (await response.json()) as TransactionDetail;
}

export async function refundTransaction(id: string): Promise<TransactionDetail> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/transactions/${id}/refund`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "x-api-key": getMerchantApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to refund transaction: ${response.status}`);
  }

  return (await response.json()) as TransactionDetail;
}

export function buildCsv(rows: TransactionRecord[]) {
  const headers = ["id", "amount", "status", "date", "description"];
  const csvRows = rows.map((row) =>
    [row.id, row.amount.toString(), row.status, row.date, row.description ?? ""].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
  );

  return [headers.join(","), ...csvRows].join("\n");
}
