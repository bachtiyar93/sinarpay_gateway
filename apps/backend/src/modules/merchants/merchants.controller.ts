import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { UpdateMerchantStatusDto } from './dto/update-merchant-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentMerchant } from '../../common/decorators/current-merchant.decorator';
import { UserRole, Merchant } from '@prisma/client';

@ApiTags('Merchants')
@Controller('api/v1/merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  // --- Ops Endpoints ---

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Onboard a new merchant (Internal Ops)' })
  @ApiResponse({ status: 201, description: 'Merchant created with plaintext API Key and Secret' })
  async create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List all merchants (Internal Ops)' })
  async findAll() {
    return this.merchantsService.findAll();
  }

  // --- Merchant Self Endpoints (Authenticated via API Key) ---

  @Get('me')
  @ApiSecurity('x-api-key')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get current merchant profile & balance (Merchant API Key)' })
  async getMe(@CurrentMerchant() merchant: Merchant) {
    return this.merchantsService.findById(merchant.id);
  }

  @Patch('me/webhook')
  @ApiSecurity('x-api-key')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Update merchant webhook URL (Merchant API Key)' })
  async updateMyWebhook(
    @CurrentMerchant() merchant: Merchant,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.merchantsService.updateWebhook(merchant.id, dto);
  }

  // --- Ops Resource-specific Endpoints ---

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Get merchant by ID (Internal Ops)' })
  async findById(@Param('id') id: string) {
    return this.merchantsService.findById(id);
  }

  @Post(':id/regenerate-keys')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Regenerate merchant API Key and Secret (Admin Only)' })
  async regenerateKeys(@Param('id') id: string) {
    return this.merchantsService.regenerateKeys(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Update merchant status (Internal Ops)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantStatusDto,
  ) {
    return this.merchantsService.updateStatus(id, dto);
  }
}
