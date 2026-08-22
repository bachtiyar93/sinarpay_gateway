import { Module } from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { TransactionController } from './transactions.controller';
import { QrisSimulatorService } from './qris-simulator.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    TransactionService,
    QrisSimulatorService,
    IdempotencyService,
    PrismaService,
  ],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule {}
