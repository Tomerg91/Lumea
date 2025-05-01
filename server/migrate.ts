import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { config } from 'dotenv';

// Load environment variables
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set');
}

// Remove the 'file:' prefix if it exists
const dbPath = databaseUrl.replace('file:', '');
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// Run migrations
migrate(db, { migrationsFolder: './migrations' })
  .then(() => {
    console.log('Migrations completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error running migrations:', err);
    process.exit(1);
  });
