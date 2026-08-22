import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

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
