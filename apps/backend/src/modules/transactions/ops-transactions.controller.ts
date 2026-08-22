import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, TransactionStatus } from '@prisma/client';

@ApiTags('Transactions (Internal Ops)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPS)
@Controller('api/v1/ops/transactions')
export class OpsTransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List system-wide transactions across all merchants' })
  async listAllTransactions(@Query() filters: FilterTransactionDto) {
    return this.transactionsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction detail system-wide' })
  async getTransaction(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }

  @Post(':id/expire')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger transaction expiration (Admin override)' })
  async expireTransaction(@Param('id') id: string) {
    return this.transactionsService.transitionStatus(
      id,
      TransactionStatus.EXPIRED,
      'Manual expiration by admin ops',
    );
  }
}
