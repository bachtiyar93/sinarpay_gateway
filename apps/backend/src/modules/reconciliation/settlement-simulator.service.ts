import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface SettlementRow {
  txnId: string;
  amount: number;
  status: 'PAID' | 'FAILED';
  settledAt: string;
}

@Injectable()
export class SettlementSimulatorService {
  constructor(private prisma: PrismaService) {}

  async getSettlementFile(): Promise<SettlementRow[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return transactions.map((transaction, index) => ({
      txnId: transaction.id,
      amount:
        typeof transaction.amount === 'object' &&
        transaction.amount !== null &&
        'toNumber' in transaction.amount
          ? transaction.amount.toNumber()
          : Number(transaction.amount),
      status:
        index === 0
          ? 'PAID'
          : transaction.status === 'PAID'
            ? 'PAID'
            : 'FAILED',
      settledAt: new Date().toISOString(),
    }));
  }
}
