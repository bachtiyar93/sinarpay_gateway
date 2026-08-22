import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { CallbacksService } from './callbacks.service';
import { BankCallbackDto } from './dto/bank-callback.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

@ApiTags('Bank Callbacks & Simulator')
@Controller('api/v1')
export class CallbacksController {
  constructor(private readonly callbacksService: CallbacksService) {}

  @Post('callbacks/bank/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inbound notification endpoint from Bank / Switching simulator' })
  @ApiHeader({
    name: 'x-bank-signature',
    description: 'HMAC-SHA256 signature calculated with BANK_CALLBACK_SECRET',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Bank payment settled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid bank signature' })
  async handleBankNotification(
    @Headers('x-bank-signature') signature: string,
    @Body() dto: BankCallbackDto,
    @Req() req: Request,
  ) {
    const rawBody = JSON.stringify(dto);
    return this.callbacksService.handleBankNotification(rawBody, signature, dto);
  }

  @Post('simulator/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate customer scanning QRIS & bank settling payment (PoC Simulator)' })
  @ApiResponse({ status: 200, description: 'Payment successfully simulated and settled' })
  async simulatePayment(@Body() dto: SimulatePaymentDto) {
    return this.callbacksService.simulatePayment(dto);
  }
}
