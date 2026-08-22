import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class RunReconciliationDto {
  @ApiPropertyOptional({ example: '2026-08-01T00:00:00Z', description: 'Start timestamp for reconciliation window' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-20T23:59:59Z', description: 'End timestamp for reconciliation window' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
