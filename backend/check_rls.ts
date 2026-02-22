import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function checkPolicies() {
  const result = await db.execute(sql`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'memories';
  `);
  
  console.log('Policies on memories table:', result);
  
  const rlsStatus = await db.execute(sql`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = 'memories';
  `);
  console.log('RLS Status:', rlsStatus);
  process.exit(0);
}

checkPolicies().catch(console.error);
