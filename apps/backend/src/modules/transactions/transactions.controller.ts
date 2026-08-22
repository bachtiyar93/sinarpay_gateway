import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TransactionService } from './transactions.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
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
}
