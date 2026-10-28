import { neon } from '@neondatabase/serverless';

function getSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');
  return neon(dbUrl);
}

export async function query(text: string, params?: any[]) {
  return getSql()(text, params);
}

export async function initDB() {
  await query(`CREATE TABLE IF NOT EXISTS sr_projects (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    files TEXT[] DEFAULT '{}'
  )`);
  await query(`CREATE TABLE IF NOT EXISTS sr_files (
    id SERIAL PRIMARY KEY,
    project_name TEXT REFERENCES sr_projects(name) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    content TEXT,
    UNIQUE(project_name, file_name)
  )`);
}
