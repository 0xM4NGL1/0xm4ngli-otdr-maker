import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function initDB() {
  await query(`CREATE TABLE IF NOT EXISTS sr_projects (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    files TEXT[] DEFAULT '{}'
  )`);
}
