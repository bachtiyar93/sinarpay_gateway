import {
  IsNumber,
  IsString,
  IsUUID,
  IsPositive,
  Length,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string; // ISO 4217 code

  @IsUUID()
  idempotencyKey!: string;
}
