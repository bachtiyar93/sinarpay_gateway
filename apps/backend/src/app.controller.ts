import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health(): { status: string; timestamp: string } {
    return this.appService.health();
  }

  @Post('test/webhook-receiver')
  @ApiTags('Test')
  @ApiOperation({ summary: 'Local webhook receiver for development testing' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  })
  @ApiResponse({ status: 201, description: 'Webhook payload received successfully' })
  testWebhookReceiver(
    @Body() body: Record<string, unknown>,
  ): { received: boolean; timestamp: string; payload: Record<string, unknown> } {
    return {
      received: true,
      timestamp: new Date().toISOString(),
      payload: body,
    };
  }
}
