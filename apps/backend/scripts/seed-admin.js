const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

function encryptMerchantSecret(value) {
  const rawKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(rawKey, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL || 'admin@sinarpay.test';
  const password = process.env.ADMIN_PASSWORD || 'password123';
  const name = process.env.ADMIN_NAME || 'Admin SinarPay';
  const merchantName = process.env.MERCHANT_NAME || 'Demo Merchant';
  const merchantApiKey = process.env.MERCHANT_API_KEY || 'merchant-demo-key';
  const merchantApiSecret = process.env.MERCHANT_API_SECRET || 'merchant-demo-secret';
  const merchantWebhookUrl = process.env.MERCHANT_WEBHOOK_URL || null;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name,
      role: 'ADMIN',
    },
    create: {
      email,
      passwordHash,
      name,
      role: 'ADMIN',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { apiKeyHash: merchantApiKey },
    update: {
      name: merchantName,
      webhookUrl: merchantWebhookUrl,
      status: 'ACTIVE',
      apiSecretHash: encryptMerchantSecret(merchantApiSecret),
    },
    create: {
      name: merchantName,
      apiKeyHash: merchantApiKey,
      apiSecretHash: encryptMerchantSecret(merchantApiSecret),
      webhookUrl: merchantWebhookUrl,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      apiKeyHash: true,
      status: true,
    },
  });

  console.log(`✅ Admin seeded: ${user.email} / ${password}`);
  console.log(`✅ Demo merchant seeded: ${merchant.name} / api key: ${merchant.apiKeyHash}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Failed to seed admin user or demo merchant. Ensure PostgreSQL is running and DATABASE_URL is valid.');
  console.error(error.message);
  process.exit(1);
});
