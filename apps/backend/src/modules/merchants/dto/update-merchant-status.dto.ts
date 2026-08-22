import { ApiProperty } from '@nestjs/swagger';
import { MerchantStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateMerchantStatusDto {
  @ApiProperty({ enum: MerchantStatus, example: MerchantStatus.ACTIVE })
  @IsEnum(MerchantStatus)
  @IsNotEmpty()
  status: MerchantStatus;
}
