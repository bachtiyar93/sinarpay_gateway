import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class UpdateWebhookDto {
  @ApiProperty({ example: 'https://merchant.example.com/api/webhooks/sinarpay', description: 'Merchant callback endpoint' })
  @IsUrl({ require_tld: false }, { message: 'webhookUrl must be a valid URL' })
  @IsNotEmpty()
  webhookUrl: string;
}
