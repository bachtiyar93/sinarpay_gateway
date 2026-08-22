import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BankCallbackDto {
  @ApiProperty({ example: 'tx-uuid-1234', description: 'Internal SinarPay transaction ID' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ example: 'BNK-REF-987654321', description: 'Bank / Switching reference identifier' })
  @IsString()
  @IsNotEmpty()
  externalRef: string;

  @ApiProperty({ example: 50000, description: 'Amount paid by customer' })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'PAID', description: 'Bank payment status' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: '2026-08-20T15:30:00Z', description: 'Bank settlement timestamp' })
  @IsString()
  @IsNotEmpty()
  settledAt: string;
}
