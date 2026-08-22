const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL || 'admin@sinarpay.test';
  const password = process.env.ADMIN_PASSWORD || 'password123';
  const name = process.env.ADMIN_NAME || 'Admin SinarPay';

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

  console.log(`✅ Admin seeded: ${user.email} / ${password}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Failed to seed admin user. Ensure PostgreSQL is running and DATABASE_URL is valid.');
  console.error(error.message);
  process.exit(1);
});
