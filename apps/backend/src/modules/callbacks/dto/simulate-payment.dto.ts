import { IsIn, IsOptional, IsString } from 'class-validator';

export class SimulatePaymentDto {
  @IsString()
  transactionId!: string;

  @IsIn(['PAID', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'])
  status!: 'PAID' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  externalRef?: string;
}
