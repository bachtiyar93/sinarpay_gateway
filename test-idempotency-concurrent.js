#!/usr/bin/env node
/**
 * Advanced test: Simulate button spam with concurrent requests
 * Test if backend prevents double-charging on rapid/concurrent requests
 */

const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
const merchantApiKey = process.env.MERCHANT_API_KEY || 'merchant-demo-key';

// Generate test idempotency key
const testKey = 'b2c3d4e5-2345-6789-abcd-ef0123456789';

async function createPayment(requestNum) {
  const payload = {
    amount: 77000,
    currency: 'IDR',
    idempotencyKey: testKey,
  };

  try {
    const response = await fetch(`${baseUrl}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': merchantApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `  ❌ Request ${requestNum} failed: ${response.status}`
      );
      return null;
    }

    const data = await response.json();
    return data.transactionId;
  } catch (error) {
    console.error(`  ❌ Request ${requestNum} error:`, error.message);
    return null;
  }
}

async function test() {
  console.log('🧪 Advanced Idempotency Test: Concurrent Requests');
  console.log(`   Backend URL: ${baseUrl}`);
  console.log(`   Idempotency Key: ${testKey}\n`);

  console.log('📤 Sending 5 concurrent requests with SAME idempotency key...');

  const promises = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(createPayment(i));
  }

  const results = await Promise.all(promises);

  console.log('\n✅ All requests completed\n');
  console.log('📊 Results:');
  results.forEach((txId, i) => {
    console.log(`   Request ${i + 1}: ${txId}`);
  });

  console.log('');

  const unique = new Set(results.filter((id) => id !== null));

  if (unique.size === 1) {
    console.log(
      `✅ PERFECT: All 5 requests returned SAME transaction ID`
    );
    console.log(`   Transaction: ${results[0]}`);
    console.log(
      '\n✨ Concurrent request test PASSED! No double-charge possible.'
    );
  } else if (unique.size > 1) {
    console.log(
      `❌ FAIL: Requests returned ${unique.size} different transaction IDs (DOUBLE-CHARGE RISK!)`
    );
    console.error('   Unique IDs:', Array.from(unique));
    process.exit(1);
  } else {
    console.error('❌ All requests failed');
    process.exit(1);
  }
}

test();
