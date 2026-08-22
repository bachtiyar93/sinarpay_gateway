import { TransactionStatus } from '@prisma/client';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    transactionId: string;
    merchantId: string;
    amount: number | string;
    currency: string;
    status: TransactionStatus;
    externalRef?: string | null;
    createdAt: string;
    paidAt?: string | null;
  };
}

export interface WebhookJobData {
  deliveryId: string;
  merchantId: string;
  transactionId: string;
  webhookUrl: string;
  payload: WebhookPayload;
}
