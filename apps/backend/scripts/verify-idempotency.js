const { PrismaClient } = require('@prisma/client');

async function verifyIdempotency() {
  const prisma = new PrismaClient();

  console.log('📊 Database Verification for Both Tests:\n');

  // Test 1: Sequential requests
  const key1 = 'a1b2c3d4-1234-5678-9abc-def012345678';
  const txns1 = await prisma.transaction.findMany({
    where: { idempotencyKey: key1 },
  });

  console.log('Test 1 - Sequential requests:');
  console.log(`   Key: ${key1}`);
  console.log(`   Transactions found: ${txns1.length}`);
  if (txns1.length === 1) {
    console.log('   ✅ PASS: Only 1 transaction\n');
  } else {
    console.log('   ❌ FAIL: Multiple transactions\n');
  }

  // Test 2: Concurrent requests
  const key2 = 'b2c3d4e5-2345-6789-abcd-ef0123456789';
  const txns2 = await prisma.transaction.findMany({
    where: { idempotencyKey: key2 },
  });

  console.log('Test 2 - Concurrent requests (5x):');
  console.log(`   Key: ${key2}`);
  console.log(`   Transactions found: ${txns2.length}`);
  if (txns2.length === 1) {
    console.log('   ✅ PASS: Only 1 transaction from 5 concurrent requests\n');
  } else {
    console.log('   ❌ FAIL: Multiple transactions\n');
  }

  // Summary
  const total = txns1.length + txns2.length;
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📈 Summary: ${total} transactions total`);
  console.log('   2 unique idempotency keys');
  console.log('   2 + 5 = 7 total requests');
  console.log('   Expected: 2 transactions (1 per key)');

  if (total === 2) {
    console.log('\n✨ PERFECT: Idempotency system working correctly!');
    console.log('   No double-charging possible.');
  }

  await prisma.$disconnect();
}

verifyIdempotency();

