import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Listening to Supabase Realtime on memories table...');

const channel = supabase
  .channel('test_channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'memories' },
    (payload) => {
      console.log('--- NEW REALTIME EVENT ---');
      console.log(JSON.stringify(payload, null, 2));
    }
  )
  .subscribe((status) => {
      console.log('Subscription status:', status);
  });
