import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Put,
  BadRequestException,
  Query,
} from '@nestjs/common';
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

  @Get('merchant/profile')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get merchant profile' })
  @ApiResponse({ status: 200, description: 'Merchant profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getMerchantProfile(@Req() req: MerchantRequest) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.getMerchantProfile(merchantId);
  }

  @Put('merchant/profile')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Update merchant profile' })
  @ApiResponse({ status: 200, description: 'Merchant profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Merchant name is required' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async updateMerchantProfile(
    @Body() body: { name?: string },
    @Req() req: MerchantRequest,
  ) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    if (!body?.name?.trim()) {
      throw new BadRequestException('Merchant name is required');
    }
    return this.transactionService.updateMerchantProfile(merchantId, body.name);
  }

  @Get('merchant/api-keys')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get merchant API keys' })
  @ApiResponse({ status: 200, description: 'Merchant API keys retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getMerchantApiKeys(@Req() req: MerchantRequest) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.getMerchantApiKeys(merchantId);
  }

  @Post('merchant/api-keys/:keyId/regenerate')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Regenerate merchant API key' })
  @ApiResponse({ status: 200, description: 'Merchant API key regenerated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async regenerateMerchantApiKey(
    @Param('keyId') keyId: string,
    @Req() req: MerchantRequest,
  ) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.regenerateMerchantApiKey(merchantId, keyId);
  }

  @Get('merchant/analytics')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get merchant analytics summary' })
  @ApiResponse({ status: 200, description: 'Merchant analytics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getMerchantAnalytics(@Req() req: MerchantRequest) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.getMerchantAnalytics(merchantId);
  }

  @Get('merchant/analytics/trend')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get merchant transaction trend' })
  @ApiResponse({ status: 200, description: 'Merchant transaction trend retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getMerchantTrend(
    @Req() req: MerchantRequest,
    @Query('days') days?: string,
  ) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.getMerchantTrend(merchantId, days);
  }

  @Get('merchant/webhook-url')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get merchant webhook URL' })
  @ApiResponse({ status: 200, description: 'Webhook URL retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getWebhookUrl(@Req() req: MerchantRequest) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.getWebhookConfig(merchantId);
  }

  @Put('merchant/webhook-url')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Update merchant webhook URL' })
  @ApiResponse({ status: 200, description: 'Webhook URL updated successfully' })
  @ApiResponse({ status: 400, description: 'Webhook URL is required' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async updateWebhookUrl(
    @Body() body: { url?: string },
    @Req() req: MerchantRequest,
  ) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    if (!body?.url) {
      throw new BadRequestException('Webhook URL is required');
    }
    return this.transactionService.updateWebhookUrl(merchantId, body.url);
  }

  @Post('merchant/webhook/test')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Send test webhook to merchant URL' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  @ApiResponse({ status: 400, description: 'Webhook URL is not configured' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async testWebhook(@Req() req: MerchantRequest) {
    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new Error('Merchant ID not found in request');
    }
    return this.transactionService.testWebhook(merchantId);
  }
}
