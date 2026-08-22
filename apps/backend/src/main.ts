import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-XSS-Protection', '0');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      if (req.headers['x-forwarded-proto'] !== 'https') {
        res.status(400).json({
          statusCode: 400,
          message: 'HTTPS required',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('SinarPay API')
    .setDescription(
      'Payment Engine API for SinarPay - handles payment processing, webhooks, and reconciliation',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  console.log(
    `✓ SinarPay Backend running on: http://localhost:${port}/api (${nodeEnv})`,
  );
  console.log(`✓ Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`✓ Health check: http://localhost:${port}/api/health`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
