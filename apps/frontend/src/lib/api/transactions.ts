export type TransactionRecord = {
  id: string;
  amount: number;
  status: "SUCCESS" | "PENDING" | "FAILED" | "EXPIRED";
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

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const mockData: TransactionRecord[] = [
  { id: "TXN-20001", amount: 250000, status: "SUCCESS", date: "2026-08-22T09:15:00Z", description: "Pembelian tiket konser", reference: "INV-9001" },
  { id: "TXN-20002", amount: 145500, status: "PENDING", date: "2026-08-21T17:30:00Z", description: "Top up e-wallet", reference: "INV-9002" },
  { id: "TXN-20003", amount: 390000, status: "SUCCESS", date: "2026-08-21T12:10:00Z", description: "Pembelian paket digital", reference: "INV-9003" },
  { id: "TXN-20004", amount: 820000, status: "FAILED", date: "2026-08-20T18:00:00Z", description: "Pembelian pulsa", reference: "INV-9004" },
  { id: "TXN-20005", amount: 910000, status: "SUCCESS", date: "2026-08-19T21:45:00Z", description: "Pembelian material kursus", reference: "INV-9005" },
  { id: "TXN-20006", amount: 150000, status: "EXPIRED", date: "2026-08-18T15:05:00Z", description: "QRIS payment expired", reference: "INV-9006" },
  { id: "TXN-20007", amount: 550000, status: "SUCCESS", date: "2026-08-17T08:25:00Z", description: "Pembelian membership", reference: "INV-9007" },
  { id: "TXN-20008", amount: 125000, status: "SUCCESS", date: "2026-08-16T19:40:00Z", description: "Pembelian buku digital", reference: "INV-9008" },
  { id: "TXN-20009", amount: 220000, status: "PENDING", date: "2026-08-15T11:05:00Z", description: "Pembelian voucher", reference: "INV-9009" },
  { id: "TXN-20100", amount: 430000, status: "SUCCESS", date: "2026-08-14T10:10:00Z", description: "Pembayaran langganan", reference: "INV-9010" },
];

export async function getTransactions(filters?: { status?: string; search?: string; page?: number; limit?: number }) {
  try {
    const response = await fetch(`${baseUrl}/v1/merchant/transactions/search`, {
      method: "POST",
      headers: { "content-type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        status: filters?.status,
        search: filters?.search,
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 10,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const filtered = mockData.filter((item) => {
        const searchText = filters?.search?.toLowerCase() ?? "";
        const matchesStatus = !filters?.status || filters.status === "ALL" || item.status === filters.status;
        const matchesSearch = !searchText || item.id.toLowerCase().includes(searchText) || (item.description ?? "").toLowerCase().includes(searchText);
        return matchesStatus && matchesSearch;
      });

      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 10;
      const start = (page - 1) * limit;
      return {
        items: filtered.slice(start, start + limit),
        total: filtered.length,
        page,
        limit,
      } satisfies TransactionsResponse;
    }

    return (await response.json()) as TransactionsResponse;
  } catch {
    const filtered = mockData.filter((item) => {
      const searchText = filters?.search?.toLowerCase() ?? "";
      const matchesStatus = !filters?.status || filters.status === "ALL" || item.status === filters.status;
      const matchesSearch = !searchText || item.id.toLowerCase().includes(searchText) || (item.description ?? "").toLowerCase().includes(searchText);
      return matchesStatus && matchesSearch;
    });

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const start = (page - 1) * limit;
    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    } satisfies TransactionsResponse;
  }
}

export async function getTransactionDetail(id: string) {
  const row = mockData.find((item) => item.id === id) ?? mockData[0];
  return {
    ...row,
    customer: "Nadia Ayu",
    merchantId: "MERCHANT-1001",
    history: [
      { status: "PENDING", at: "2026-08-22T09:15:00Z" },
      { status: "SUCCESS", at: "2026-08-22T09:20:00Z" },
    ],
  };
}

export function buildCsv(rows: TransactionRecord[]) {
  const headers = ["id", "amount", "status", "date", "description"];
  const csvRows = rows.map((row) =>
    [row.id, row.amount.toString(), row.status, row.date, row.description ?? ""].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
  );

  return [headers.join(","), ...csvRows].join("\n");
}
