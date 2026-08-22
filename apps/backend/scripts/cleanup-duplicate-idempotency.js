const { PrismaClient } = require('@prisma/client');

/**
 * Cleanup duplicate (merchantId, idempotencyKey) pairs before applying schema constraint.
 * 
 * Strategy:
 * - For each (merchantId, idempotencyKey) pair that appears multiple times
 * - Keep the LATEST transaction (by createdAt)
 * - Delete older duplicates
 * 
 * This ensures data integrity while preserving valid transactions.
 */
async function cleanupDuplicateIdempotencyKeys() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking for duplicate (merchantId, idempotencyKey) pairs...\n');

    // Find all (merchantId, idempotencyKey) pairs with duplicates
    const duplicates = await prisma.$queryRaw`
      SELECT 
        "merchantId", 
        "idempotencyKey", 
        COUNT(*) as count,
        ARRAY_AGG(id) as ids,
        MAX("createdAt") as latestDate
      FROM transactions
      GROUP BY "merchantId", "idempotencyKey"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicate idempotency keys found. Safe to apply constraint.\n');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate groups:\n`);

    let totalDeleted = 0;

    for (const dup of duplicates) {
      const { merchantId, idempotencyKey, count, ids, latestDate } = dup;

      console.log(
        `   • Merchant: ${merchantId.substring(0, 8)}...`
      );
      console.log(`     Key: ${idempotencyKey}`);
      console.log(`     Duplicates: ${count}`);

      // Keep latest, delete rest
      const idsToDelete = ids.filter((id) => {
        const tx = duplicates.find((d) => d.ids.includes(id));
        return tx.latestDate !== latestDate;
      });

      if (idsToDelete.length > 0) {
        console.log(`     Keeping: ${ids.find((id) => !idsToDelete.includes(id))}`);
        console.log(`     Deleting: ${idsToDelete.join(', ')}`);

        // Delete duplicate records (cascade will handle history and webhooks)
        const deleted = await prisma.transaction.deleteMany({
          where: {
            id: { in: idsToDelete },
          },
        });

        totalDeleted += deleted.count;
        console.log(`     ✓ Deleted ${deleted.count} duplicate(s)\n`);
      }
    }

    console.log(
      `\n✅ Cleanup complete. Total deleted: ${totalDeleted} duplicate transaction(s)\n`
    );
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateIdempotencyKeys();
