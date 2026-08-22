import { IsIn, IsOptional, IsString } from 'class-validator';

export class SimulatePaymentDto {
  @IsString()
  transactionId!: string;

  @IsIn(['PAID', 'FAILED', 'EXPIRED'])
  status!: 'PAID' | 'FAILED' | 'EXPIRED';

  @IsOptional()
  @IsString()
  externalRef?: string;
}
