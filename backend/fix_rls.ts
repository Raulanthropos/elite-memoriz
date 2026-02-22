import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function fixRLS() {
  console.log('Adding RLS Policy to allow hosts to see pending memories...');
  
  try {
    // Drop it if it exists to prevent errors
    await db.execute(sql`
      DROP POLICY IF EXISTS "Hosts can view all memories" ON memories;
    `);

    // Create policy allowing authenticated users to see their event's memories
    await db.execute(sql`
      CREATE POLICY "Hosts can view all memories" 
      ON memories
      FOR SELECT
      TO authenticated
      USING (
        event_id IN (
          SELECT id FROM events WHERE user_id = auth.uid()
        )
      );
    `);
    
    console.log('Policy successfully added!');
  } catch (err) {
    console.error('Failed to add policy:', err);
  }
  
  process.exit(0);
}

fixRLS();
