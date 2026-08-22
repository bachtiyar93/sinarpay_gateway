import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SimulatePaymentDto {
  @ApiProperty({ example: 'tx-uuid-1234', description: 'Transaction ID to mark as paid' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({ example: 'BNK-SIM-12345678', description: 'Optional simulated bank ref' })
  @IsString()
  @IsOptional()
  externalRef?: string;
}
