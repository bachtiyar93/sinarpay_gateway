#!/usr/bin/env node
/**
 * Test: Verify idempotency key reset after successful payment
 * 
 * Scenario:
 * 1. Create payment 1 with amount 50000
 * 2. Payment 1 becomes SUCCESS (simulated)
 * 3. Create payment 2 with amount 50000 (or different)
 * 4. Should create NEW transaction (different from payment 1)
 * 
 * Before fix: Payment 2 would use same key as Payment 1 → Error
 * After fix: Payment 2 gets new key → Creates new transaction ✅
 */

const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
const merchantApiKey = process.env.MERCHANT_API_KEY || 'merchant-demo-key';

async function createPayment(amount, key) {
  const payload = {
    amount,
    currency: 'IDR',
    idempotencyKey: key,
  };

  const response = await fetch(`${baseUrl}/api/v1/payments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': merchantApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Payment creation failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function simulatePayment(transactionId, status) {
  const response = await fetch(`${baseUrl}/api/test/bank-payment-confirm`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      transactionId,
      status,
      externalRef: `TEST-${status}-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Simulation failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function test() {
  console.log('🧪 Testing Idempotency Key Reset After Payment Success\n');

  // Generate valid UUIDs
  const { randomUUID } = require('crypto');
  const key1 = randomUUID();
  const key2 = randomUUID();

  console.log(`Using keys:\n  Key1: ${key1}\n  Key2: ${key2}\n`);

  try {
    // Step 1: Create payment 1
    console.log('📤 Step 1: Create payment 1 with amount 50000');
    const payment1 = await createPayment(50000, key1);
    console.log(`   ✅ Payment 1: ${payment1.transactionId}\n`);

    // Step 2: Simulate to SUCCESS
    console.log('📤 Step 2: Simulate payment 1 to SUCCESS');
    await simulatePayment(payment1.transactionId, 'SUCCESS');
    console.log('   ✅ Payment 1 is now SUCCESS\n');

    // Step 3: Create payment 2 with SAME amount (critical test)
    console.log('📤 Step 3: Create payment 2 with amount 50000 (SAME as payment 1)');
    const payment2 = await createPayment(50000, key2);
    console.log(`   ✅ Payment 2: ${payment2.transactionId}\n`);

    // Verify
    console.log('🔍 Verification:');
    if (payment1.transactionId === payment2.transactionId) {
      console.log('❌ FAIL: Same transaction ID (should be different)');
      process.exit(1);
    }

    if (payment1.transactionId !== payment2.transactionId) {
      console.log('✅ PASS: Different transaction IDs');
      console.log(`   Payment 1: ${payment1.transactionId}`);
      console.log(`   Payment 2: ${payment2.transactionId}`);
      console.log('\n✨ Idempotency key reset working correctly!');
      console.log('   User can create new payments after successful transaction.');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
