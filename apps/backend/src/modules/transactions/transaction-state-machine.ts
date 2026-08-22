export type TransactionStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

export const LEGACY_STATUS_ALIASES: Record<string, TransactionStatus> = {
  ISSUED: 'PENDING',
  PAID: 'SUCCESS',
  CANCELLED: 'FAILED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
};

export const TRANSACTION_STATE_MACHINE: Record<
  TransactionStatus,
  TransactionStatus[]
> = {
  PENDING: ['SUCCESS', 'FAILED', 'EXPIRED'],
  SUCCESS: ['REFUNDED'],
  FAILED: [],
  EXPIRED: [],
  REFUNDED: [],
};

export function normalizeTransactionStatus(
  status: string,
): TransactionStatus {
  const normalized = LEGACY_STATUS_ALIASES[status];
  if (normalized) {
    return normalized;
  }

  throw new Error(`Unsupported transaction status: ${status}`);
}

export function isValidTransition(
  fromStatus: string,
  toStatus: string,
): boolean {
  const normalizedFrom = normalizeTransactionStatus(fromStatus);
  const normalizedTo = normalizeTransactionStatus(toStatus);

  return TRANSACTION_STATE_MACHINE[normalizedFrom].includes(normalizedTo);
}
