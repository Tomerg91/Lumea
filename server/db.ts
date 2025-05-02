import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';

// Create a PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create a Postgres.js client
const client = postgres(process.env.DATABASE_URL || '');

// Create a drizzle database instance
export const db = drizzle(client, { schema });

// For connect-pg-simple
export const pgSession = {
  pool,
  tableName: 'session', // Optional. Default is 'session'
};
