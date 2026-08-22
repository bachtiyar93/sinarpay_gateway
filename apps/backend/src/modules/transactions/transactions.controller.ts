import { Controller, Post, Body, UseGuards, Req, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TransactionService } from './transactions.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SearchTransactionsDto } from './dto/search-transactions.dto';
import { CreatePaymentResponse } from './dto/create-payment-response.interface';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import type { Request } from 'express';

export interface MerchantRequest extends Request {
  user?: { merchantId: string };
}

@ApiTags('payments')
@Controller('v1')
@Throttle({ default: { limit: 1000, ttl: 60000 } })
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Post('payments')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Create payment with QRIS' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      properties: {
        transactionId: { type: 'string' },
        qrisString: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        status: { type: 'string' },
        expiresAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: MerchantRequest,
  ): Promise<CreatePaymentResponse> {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.createTransaction(merchantId, dto);
  }

  @Post('merchant/transactions/search')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Search merchant transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async searchTransactions(
    @Body() dto: SearchTransactionsDto,
    @Req() req: MerchantRequest,
  ) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.searchTransactions(merchantId, dto);
  }

  @Get('merchant/transactions/:transactionId')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get merchant transaction detail' })
  @ApiResponse({ status: 200, description: 'Transaction detail retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionDetail(
    @Param('transactionId') transactionId: string,
    @Req() req: MerchantRequest,
  ) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.getTransactionDetail(transactionId, merchantId);
  }

  @Post('merchant/transactions/:transactionId/refund')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Refund merchant transaction' })
  @ApiResponse({ status: 200, description: 'Transaction refunded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction state for refund' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async refundTransaction(
    @Param('transactionId') transactionId: string,
    @Req() req: MerchantRequest,
  ) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.refundTransaction(transactionId, merchantId);
  }
}
