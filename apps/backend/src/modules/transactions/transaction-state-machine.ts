export type TransactionStatus = 'ISSUED' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export const TRANSACTION_STATE_MACHINE: Record<
  TransactionStatus,
  TransactionStatus[]
> = {
  ISSUED: ['PAID', 'EXPIRED', 'CANCELLED'],
  PAID: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function isValidTransition(
  fromStatus: TransactionStatus,
  toStatus: TransactionStatus,
): boolean {
  if (!(fromStatus in TRANSACTION_STATE_MACHINE)) {
    return false;
  }

  return TRANSACTION_STATE_MACHINE[fromStatus].includes(toStatus);
}
