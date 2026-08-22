import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CallbacksService } from './callbacks.service';
import { BankCallbackDto } from './dto/bank-callback.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

@ApiTags('callbacks')
@Controller()
export class CallbacksController {
  constructor(private callbacksService: CallbacksService) {}

  @Post('callbacks/bank-notification')
  @ApiOperation({ summary: 'Receive bank payment callback' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  @ApiResponse({ status: 401, description: 'Invalid bank signature' })
  async handleBankNotification(@Body() dto: BankCallbackDto) {
    return this.callbacksService.handleBankNotification(dto);
  }

  @Post('test/bank-payment-confirm')
  @ApiOperation({ summary: 'Simulate bank payment confirmation (dev only)' })
  @ApiResponse({ status: 200, description: 'Simulation processed' })
  async simulateBankPayment(@Body() dto: SimulatePaymentDto) {
    return this.callbacksService.simulateBankPayment(dto);
  }
}
