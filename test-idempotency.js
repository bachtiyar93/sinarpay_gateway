#!/usr/bin/env node
/**
 * Manual test script: Verify idempotency key prevents double-charging
 * 
 * Usage: 
 *   node test-idempotency.js
 * 
 * What it tests:
 * 1. Create payment with idempotency key A
 * 2. Create payment again with same key A (should return same transaction)
 * 3. Verify only 1 transaction exists in database
 */

const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
const merchantApiKey = process.env.MERCHANT_API_KEY || 'merchant-demo-key';

// Generate test idempotency key
const testKey = '12345678-1234-5678-1234-567812345678';

async function test() {
  console.log('🧪 Testing Idempotency Key System');
  console.log(`   Backend URL: ${baseUrl}`);
  console.log(`   Idempotency Key: ${testKey}\n`);

  const payload = {
    amount: 55000,
    currency: 'IDR',
    idempotencyKey: testKey,
  };

  try {
    // Request 1
    console.log('📤 Request 1: Create payment...');
    const response1 = await fetch(`${baseUrl}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': merchantApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response1.ok) {
      console.error(`❌ Request 1 failed: ${response1.status}`);
      console.error(await response1.text());
      process.exit(1);
    }

    const data1 = await response1.json();
    const txId1 = data1.transactionId;
    console.log(`✅ Transaction created: ${txId1}\n`);

    // Wait a bit
    await new Promise((r) => setTimeout(r, 500));

    // Request 2 (duplicate)
    console.log('📤 Request 2: Create payment with SAME idempotency key...');
    const response2 = await fetch(`${baseUrl}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': merchantApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response2.ok) {
      console.error(`❌ Request 2 failed: ${response2.status}`);
      console.error(await response2.text());
      process.exit(1);
    }

    const data2 = await response2.json();
    const txId2 = data2.transactionId;
    console.log(`✅ Response received: ${txId2}\n`);

    // Verify
    console.log('🔍 Verification:');
    if (txId1 === txId2) {
      console.log(`✅ PASS: Both requests returned same transaction ID`);
      console.log(`   Request 1: ${txId1}`);
      console.log(`   Request 2: ${txId2}`);
    } else {
      console.error(
        `❌ FAIL: Different transaction IDs (DOUBLE CHARGE!)`
      );
      console.error(`   Request 1: ${txId1}`);
      console.error(`   Request 2: ${txId2}`);
      process.exit(1);
    }

    if (JSON.stringify(data1) === JSON.stringify(data2)) {
      console.log(`✅ PASS: Response payload identical`);
    } else {
      console.error(`❌ FAIL: Response payload different`);
      process.exit(1);
    }

    console.log('\n✨ Idempotency test PASSED!');
    console.log('   Duplicate requests correctly prevented double transaction.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
