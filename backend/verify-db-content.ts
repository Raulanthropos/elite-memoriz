import { db } from './src/db';
import { memories } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function checkUploads() {
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(memories);
    console.log('Current Upload Count:', result[0].count);
    process.exit(0);
  } catch (error) {
    console.error('Check failed:', error);
    process.exit(1);
  }
}

checkUploads();
