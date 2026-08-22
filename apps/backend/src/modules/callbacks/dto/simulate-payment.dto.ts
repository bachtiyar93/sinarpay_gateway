import { IsIn, IsOptional, IsString } from 'class-validator';

export class SimulatePaymentDto {
  @IsString()
  transactionId!: string;

  @IsIn(['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'])
  status!: 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  externalRef?: string;
}
