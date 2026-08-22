import { Injectable } from '@nestjs/common';

@Injectable()
export class QrisSimulatorService {
  generateQrisString(transactionId: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    return `00020126610014id.co.bri.bris0113${transactionId}${randomSuffix}52040000530398450611800000000${timestamp}5802ID5913SINARPAY6009JAKARTA62510${transactionId}63042D0A`;
  }
}
