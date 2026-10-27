import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.json');

export function readDB() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeDB(data: any) {
  fs.mkdirSync(path.dirname(DB_PATH) || '.', { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
