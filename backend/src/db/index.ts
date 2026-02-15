import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  client_encoding: 'UTF8', // Explicitly force UTF-8
});

export const db = drizzle(pool, { schema });
