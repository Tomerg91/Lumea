import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const client = postgres(process.env.DATABASE_URL || '');
export const db = drizzle(client, { schema });
export const pgSession = {
    pool,
    tableName: 'session',
};
