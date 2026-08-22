export interface CreatePaymentResponse {
  transactionId: string;
  qrisString: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
}
