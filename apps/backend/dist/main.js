"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('SinarPay API')
        .setDescription('Payment Engine API for SinarPay - handles payment processing, webhooks, and reconciliation')
        .setVersion('1.0.0')
        .addTag('Health', 'System health checks')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    console.log(`✓ SinarPay Backend running on: http://localhost:${port}/api (${nodeEnv})`);
    console.log(`✓ Swagger documentation: http://localhost:${port}/api/docs`);
    console.log(`✓ Health check: http://localhost:${port}/api/health`);
}
bootstrap().catch((err) => {
    console.error('Bootstrap error:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map