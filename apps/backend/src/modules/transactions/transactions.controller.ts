import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentMerchant } from '../../common/decorators/current-merchant.decorator';
import { Merchant } from '@prisma/client';

@ApiTags('Transactions')
@Controller('api/v1/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity('x-api-key')
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique idempotency UUID to prevent duplicate payment creation',
    required: true,
  })
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Create a new QRIS payment order (Merchant API Key)' })
  @ApiResponse({ status: 201, description: 'QRIS payment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or missing idempotency key' })
  async createPayment(
    @CurrentMerchant() merchant: Merchant,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreateTransactionDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Header "Idempotency-Key" is required');
    }
    return this.transactionsService.createPayment(
      merchant.id,
      idempotencyKey,
      dto,
    );
  }

  @Get()
  @ApiSecurity('x-api-key')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'List and filter transactions for current merchant (Merchant API Key)' })
  async listMyTransactions(
    @CurrentMerchant() merchant: Merchant,
    @Query() filters: FilterTransactionDto,
  ) {
    return this.transactionsService.findAll(filters, merchant.id);
  }

  @Get(':id')
  @ApiSecurity('x-api-key')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get transaction details by ID (Merchant API Key)' })
  async getTransactionDetails(
    @CurrentMerchant() merchant: Merchant,
    @Param('id') id: string,
  ) {
    return this.transactionsService.findById(id, merchant.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('x-api-key')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Cancel an ISSUED payment order (Merchant API Key)' })
  async cancelTransaction(
    @CurrentMerchant() merchant: Merchant,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.transactionsService.cancelPayment(
      id,
      merchant.id,
      reason || 'Cancelled by merchant',
    );
  }
}
