
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running migration...');
    // Add category column
    await db.execute(sql`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS category text DEFAULT 'other' NOT NULL;
    `);
    
    // Create new enum constraint check if not exists (Postgres doesn't support IF NOT EXISTS for constraints easily in one line, 
    // but text check constraint is implicit or we can add it. 
    // Drizzle's text({ enum: ... }) usually adds a check constraint named "events_category_check" or similar.
    // For now, adding the column is the critical part to fix the 500 error.
    
    console.log('Migration successful: "category" column added.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
