import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReconciliationService } from './reconciliation.service';
import { WebhookDlqService } from '../webhooks/webhooks-dlq.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { SettlementRow } from './settlement-simulator.service';

@ApiTags('admin')
@Controller()
@Throttle({ default: { limit: 1000, ttl: 60000 } })
export class ReconciliationController {
  constructor(
    private reconciliationService: ReconciliationService,
    private dlqService: WebhookDlqService,
  ) {}

  @Get('admin/reconciliation-report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPS')
  @ApiOperation({ summary: 'Get reconciliation report' })
  @ApiResponse({ status: 200, description: 'Reconciliation data' })
  getReport(): Promise<unknown[]> {
    return this.reconciliationService.getReport();
  }

  @Get('test/settlement-file')
  @ApiOperation({ summary: 'Simulate bank settlement file (dev only)' })
  @ApiResponse({ status: 200, description: 'Settlement file' })
  getSettlementFile(): Promise<SettlementRow[]> {
    return this.reconciliationService.getSettlementFile();
  }

  @Post('admin/webhooks/dlq/:deliveryId/replay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OPS')
  @ApiOperation({ summary: 'Replay DLQ webhook delivery' })
  @ApiResponse({ status: 200, description: 'Replay scheduled' })
  async replayDlq(
    @Param('deliveryId') deliveryId: string,
  ): Promise<{ replayed: boolean }> {
    const replayed = await this.dlqService.replay(deliveryId);
    return { replayed };
  }
}
