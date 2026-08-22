export type PaymentCurrency = "IDR" | "USD" | "SGD";
export type PaymentSimulationStatus = "PAID" | "FAILED" | "EXPIRED" | "CANCELLED";

export type CreatePaymentPayload = {
  amount: number;
  currency?: PaymentCurrency;
  idempotencyKey?: string;
  description?: string;
};

export type PaymentResult = {
  transactionId: string;
  qrisString: string;
  amount: number;
  currency: PaymentCurrency;
  status: string;
  expiresAt: string;
  paymentLink?: string;
  description?: string;
};

export type PaymentSimulationResult = {
  success: boolean;
  transactionId: string;
  status: PaymentSimulationStatus;
  message?: string;
};

const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiBaseUrl = `${baseUrl}/api`;

function buildFallbackPayment(payload: CreatePaymentPayload): PaymentResult {
  const now = new Date();
  const transactionId = `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const chosenCurrency = payload.currency ?? "IDR";
  const qrisString = `QRIS:${chosenCurrency}:${payload.amount}:${transactionId}`;

  return {
    transactionId,
    qrisString,
    amount: Number(payload.amount),
    currency: chosenCurrency,
    status: "ISSUED",
    expiresAt,
    description: payload.description,
    paymentLink: `${window.location.origin}/pay/${transactionId}`,
  };
}

export async function createPayment(payload: CreatePaymentPayload): Promise<PaymentResult> {
  const requestBody = {
    amount: Number(payload.amount),
    currency: payload.currency ?? "IDR",
    idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(),
  };

  try {
    const response = await fetch(`${apiBaseUrl}/v1/payments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Payment creation failed: ${response.status}`);
    }

    const data = (await response.json()) as PaymentResult;
    return {
      ...data,
      description: payload.description,
      paymentLink: data.paymentLink ?? `${window.location.origin}/pay/${data.transactionId}`,
    };
  } catch {
    return buildFallbackPayment(payload);
  }
}

export async function simulatePaymentStatus(
  transactionId: string,
  status: PaymentSimulationStatus,
): Promise<PaymentSimulationResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/test/bank-payment-confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transactionId,
        status,
        externalRef: `SIM-${status}-${Date.now()}`,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Simulation failed: ${response.status}`);
    }

    const data = (await response.json()) as PaymentSimulationResult;
    return {
      success: data.success,
      transactionId: data.transactionId ?? transactionId,
      status: data.status ?? status,
      message: data.message ?? `Payment marked as ${status}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to simulate payment status.";
    return {
      success: false,
      transactionId,
      status,
      message,
    };
  }
}
