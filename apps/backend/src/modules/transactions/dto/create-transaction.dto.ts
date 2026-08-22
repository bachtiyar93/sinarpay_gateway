import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @ApiProperty({ example: 50000, description: 'Transaction amount in IDR' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1000, { message: 'Minimum transaction amount is Rp 1.000' })
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: 'IDR', default: 'IDR' })
  @IsString()
  @IsOptional()
  currency?: string = 'IDR';

  @ApiPropertyOptional({ example: 'Pembayaran Kopi Susu', description: 'Order or item description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 15, description: 'Expiry in minutes (default 15 mins)' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  expiryMinutes?: number = 15;
}
