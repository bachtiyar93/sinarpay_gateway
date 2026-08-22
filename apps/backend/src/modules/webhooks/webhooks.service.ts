import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HmacService } from '../../common/services/hmac.service';
import { WebhookQueueService } from './webhooks-queue.service';

@Injectable()
export class WebhookService {
  constructor(
    private prisma: PrismaService,
    private queueService: WebhookQueueService,
    private hmacService: HmacService,
  ) {}

  generateSignature(payload: Record<string, unknown>, merchantSecret: string) {
    return this.hmacService.generateSignature(payload, merchantSecret);
  }

  async sendWebhook(
    transactionId: string,
    merchantId: string,
    payload: Record<string, unknown>,
  ) {
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        transactionId,
        merchantId,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    await this.queueService.enqueueWebhook(delivery.id);

    return delivery;
  }

  async getDeliveryById(deliveryId: string) {
    return this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { merchant: true, transaction: true },
    });
  }
}
