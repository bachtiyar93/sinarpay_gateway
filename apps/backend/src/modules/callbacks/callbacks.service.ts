import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionsService } from '../transactions/transactions.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { BankCallbackDto } from './dto/bank-callback.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { TransactionStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class CallbacksService {
  private readonly logger = new Logger(CallbacksService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Process inbound bank callback notification
   */
  async handleBankNotification(
    rawBody: string,
    signature: string,
    dto: BankCallbackDto,
  ) {
    const bankSecret =
      this.configService.get<string>('security.bankCallbackSecret') ||
      this.configService.get<string>('BANK_CALLBACK_SECRET');

    if (!bankSecret) {
      throw new BadRequestException('Bank secret configuration missing');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing X-Bank-Signature header');
    }

    // Verify HMAC-SHA256 signature
    const isValid = this.cryptoService.verifyHmacSignature(
      rawBody,
      bankSecret,
      signature,
    );

    if (!isValid) {
      this.logger.warn(`Invalid bank signature received for transaction: ${dto.transactionId}`);
      throw new UnauthorizedException('Invalid bank callback signature');
    }

    if (dto.status !== 'PAID' && dto.status !== 'SUCCESS') {
      this.logger.warn(`Bank callback status was ${dto.status}, not PAID`);
      return { received: true, status: dto.status };
    }

    // Transition state strictly to PAID
    const transaction = await this.transactionsService.transitionStatus(
      dto.transactionId,
      TransactionStatus.PAID,
      'Settled by Bank Callback',
      dto.externalRef,
    );

    return {
      success: true,
      transactionId: transaction.id,
      status: transaction.status,
      externalRef: transaction.externalRef,
    };
  }

  /**
   * Simulator helper to test bank payments end-to-end without external tools
   */
  async simulatePayment(dto: SimulatePaymentDto) {
    const transaction = await this.transactionsService.findById(dto.transactionId);

    const bankSecret =
      this.configService.get<string>('security.bankCallbackSecret') ||
      this.configService.get<string>('BANK_CALLBACK_SECRET');

    const bankPayload: BankCallbackDto = {
      transactionId: transaction.id,
      externalRef: dto.externalRef || `BNK-SIM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      amount: Number(transaction.amount),
      status: 'PAID',
      settledAt: new Date().toISOString(),
    };

    const rawPayload = JSON.stringify(bankPayload);
    const signature = this.cryptoService.createHmacSignature(rawPayload, bankSecret);

    return this.handleBankNotification(rawPayload, signature, bankPayload);
  }
}
