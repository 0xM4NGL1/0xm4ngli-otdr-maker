import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.DATABASE_URL || process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  return getPool().query(text, params);
}

export async function initDB() {
  if (!process.env.DATABASE_URL) return;
  await query(`CREATE TABLE IF NOT EXISTS sr_projects (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    files TEXT[] DEFAULT '{}'
  )`);
}