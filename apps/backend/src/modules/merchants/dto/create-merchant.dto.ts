import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({ example: 'Toko Elektronik Makmur', description: 'Merchant business name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'https://merchant.example.com/api/webhooks/sinarpay' })
  @IsUrl({ require_tld: false }, { message: 'webhookUrl must be a valid URL' })
  @IsOptional()
  webhookUrl?: string;
}
