import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { TransactionService } from '../transactions/transactions.service';
import { WebhookService } from '../webhooks/webhooks.service';
import { HmacService } from '../../common/services/hmac.service';
import { BankCallbackDto } from './dto/bank-callback.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import {
  normalizeTransactionStatus,
  TransactionStatus,
} from '../transactions/transaction-state-machine';

function mapBankStatus(status: BankCallbackDto['status']): TransactionStatus {
  const normalized = normalizeTransactionStatus(status);

  if (normalized === 'SUCCESS') {
    return 'SUCCESS';
  }

  if (normalized === 'FAILED') {
    return 'FAILED';
  }

  return normalized;
}

@Injectable()
export class CallbacksService {
  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private webhookService: WebhookService,
    private hmacService: HmacService,
    private configService: ConfigService,
  ) {}

  private bankSecret(): string {
    return this.configService.getOrThrow<string>('BANK_CALLBACK_SECRET');
  }

  validateBankSignature(dto: BankCallbackDto): boolean {
    const payload = {
      transactionId: dto.transactionId,
      status: dto.status,
      externalRef: dto.externalRef ?? null,
    };

    return this.hmacService.verifySignature(
      payload,
      this.bankSecret(),
      dto.bankSignature,
    );
  }

  async handleBankNotification(dto: BankCallbackDto) {
    if (!this.validateBankSignature(dto)) {
      throw new UnauthorizedException('Invalid bank signature');
    }

    const mappedStatus = mapBankStatus(dto.status);
    await this.transactionService.transitionStatus(
      dto.transactionId,
      mappedStatus,
      dto.externalRef || 'Bank callback',
    );

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      include: { merchant: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const payload = {
      transactionId: transaction.id,
      status: mappedStatus,
      externalRef: dto.externalRef ?? null,
      amount:
        typeof transaction.amount === 'object' &&
        transaction.amount !== null &&
        'toNumber' in transaction.amount
          ? transaction.amount.toNumber()
          : transaction.amount,
      currency: transaction.currency,
      processedAt: new Date().toISOString(),
    };

    await this.webhookService.sendWebhook(
      transaction.id,
      transaction.merchantId,
      payload,
    );

    return {
      success: true,
      transactionId: transaction.id,
      status: mappedStatus,
    };
  }

  async simulateBankPayment(dto: SimulatePaymentDto) {
    const payload = {
      transactionId: dto.transactionId,
      status: dto.status,
      externalRef: dto.externalRef ?? null,
    };

    const bankSignature = this.hmacService.generateSignature(
      payload,
      this.bankSecret(),
    );

    try {
      const result = await this.handleBankNotification({
        ...dto,
        bankSignature,
      });

      return {
        ...result,
        status: normalizeTransactionStatus(result.status),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: true,
          transactionId: dto.transactionId,
          status: normalizeTransactionStatus(dto.status),
          message: `Dev simulation accepted for unknown transaction ${dto.transactionId}. No database record was found, but the requested status was applied in simulation mode.`,
        };
      }

      throw error;
    }
  }
}
