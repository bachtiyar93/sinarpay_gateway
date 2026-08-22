import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentMerchant } from '../../common/decorators/current-merchant.decorator';
import { Merchant } from '@prisma/client';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('deliveries')
  @ApiSecurity('x-api-key')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get recent webhook deliveries for current merchant' })
  async getMyDeliveries(@CurrentMerchant() merchant: Merchant) {
    return this.webhooksService.getDeliveriesByMerchant(merchant.id);
  }

  @Get('deliveries/transaction/:transactionId')
  @ApiSecurity('x-api-key')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get webhook deliveries for a specific transaction' })
  async getDeliveriesByTransaction(
    @Param('transactionId') transactionId: string,
  ) {
    return this.webhooksService.getDeliveriesByTransaction(transactionId);
  }
}
