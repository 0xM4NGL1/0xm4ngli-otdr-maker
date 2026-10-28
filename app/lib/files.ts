import fs from 'fs';
import path from 'path';

const SOURCE_DIRS = [
  '0-10', '11-20', '21-30', '31-40', '41-50', '51-100',
  '101-200', '201-300', '301+',
];

export interface SorFile {
  id: string;
  name: string;
  folder: string;
  relativePath: string;
  sizeBytes: number;
  meters: number;
}

export function getOfficialFiles(): SorFile[] {
  const files: SorFile[] = [];
  const root = process.cwd();
  for (const folder of SOURCE_DIRS) {
    const folderPath = path.join(/*turbopackIgnore: true*/ root, folder);
    if (!fs.existsSync(folderPath)) continue;
    const entries = fs.readdirSync(folderPath);
    for (const entry of entries) {
      if (entry.endsWith('.sor')) {
        const fullPath = path.join(folderPath, entry);
        const stat = fs.statSync(fullPath);
        // Derive a pseudo-meter value from binary size for display
        const sizeBytes = Number((stat as any).sizeBytes ?? stat.size ?? 0);
        const meters = Math.round(sizeBytes / 1024 * 1.23 + Math.random() * 500);
        files.push({
          id: `${folder}/${entry}`,
          name: entry,
          folder,
          relativePath: path.join(folder, entry),
          sizeBytes,
          meters,
        });
      }
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export function ensureProjectDir(): string {
  const root = process.cwd();
  const projectsDir = path.join(/*turbopackIgnore: true*/ root, 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
  return projectsDir;
}

export function getProjectNames(): string[] {
  ensureProjectDir();
  const root = process.cwd();
  const projectsDir = path.join(/*turbopackIgnore: true*/ root, 'projects');
  return fs.readdirSync(projectsDir).filter(f => {
    const p = path.join(projectsDir, f);
    return fs.statSync(p).isDirectory();
  }).sort();
}

export function getProjectFiles(projectName: string): string[] {
  const root = process.cwd();
  const projectPath = path.join(/*turbopackIgnore: true*/ root, 'projects', projectName);
  if (!fs.existsSync(projectPath)) return [];
  return fs.readdirSync(projectPath).filter(f => f.endsWith('.sor')).sort();
}

const SOURCE_MAP_FILE = '.sources.json';

function projectDir(projectName: string): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'projects', projectName);
}

/** Per-project map: stored file name -> original official .sor file name. */
export function readSourceMap(projectName: string): Record<string, string> {
  try {
    const raw = fs.readFileSync(path.join(projectDir(projectName), SOURCE_MAP_FILE), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // no metadata yet
  }
  return {};
}

export function writeSourceMap(projectName: string, map: Record<string, string>): void {
  const dir = projectDir(projectName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, SOURCE_MAP_FILE), JSON.stringify(map, null, 2));
}

export function setFileSource(projectName: string, fileName: string, sourceName: string): void {
  const map = readSourceMap(projectName);
  map[fileName] = sourceName;
  writeSourceMap(projectName, map);
}

export function removeFileSource(projectName: string, fileName: string): void {
  const map = readSourceMap(projectName);
  if (map[fileName]) {
    delete map[fileName];
    writeSourceMap(projectName, map);
  }
}

/** Original official file name for a stored file (falls back to the stored name). */
export function getFileSource(projectName: string, fileName: string): string {
  const map = readSourceMap(projectName);
  if (map[fileName]) return map[fileName];
  // legacy copies made before metadata existed
  return fileName.replace(/-dup(?=\.sor$)/i, '');
}

export function getProjectFileEntries(projectName: string): { name: string; source: string }[] {
  return getProjectFiles(projectName).map(name => ({
    name,
    source: getFileSource(projectName, name),
  }));
}

function folderForMeter(meter: number): string {
  if (meter <= 10) return '0-10';
  if (meter <= 20) return '11-20';
  if (meter <= 30) return '21-30';
  if (meter <= 40) return '31-40';
  if (meter <= 50) return '41-50';
  if (meter <= 100) return '51-100';
  if (meter <= 200) return '101-200';
  if (meter <= 300) return '201-300';
  return '301+';
}

/**
 * Create a missing meter .sor file by copying the nearest existing official
 * measurement. The file name is the meter number, so it behaves exactly like
 * the other official files (2.sor -> meter 2, 1.sor -> meter 1).
 */
export function createMeterFile(meter: number): { name: string } {
  if (!Number.isInteger(meter) || meter < 1) throw new Error('Invalid meter number');
  const root = process.cwd();
  const folder = folderForMeter(meter);
  const dir = path.join(/*turbopackIgnore: true*/ root, folder);
  const name = `${meter}.sor`;
  const target = path.join(dir, name);
  if (fs.existsSync(target)) throw new Error(`Meter ${meter} already exists`);

  const all = getOfficialFiles();
  if (!all.length) throw new Error('No official .sor file to copy');
  const sameFolder = all.filter(f => f.folder === folder);
  const pool = sameFolder.length ? sameFolder : all;
  const template = pool.reduce((best, f) => {
    const bestNum = parseInt(best.name, 10);
    const fNum = parseInt(f.name, 10);
    if (Number.isNaN(fNum)) return best;
    if (Number.isNaN(bestNum)) return f;
    return Math.abs(fNum - meter) < Math.abs(bestNum - meter) ? f : best;
  });

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(/*turbopackIgnore: true*/ root, template.relativePath), target);
  return { name };
}

export function copyFileToProject(
  sourceRelativePath: string,
  projectName: string,
  targetName: string
): { copiedPath: string; fullTargetPath: string } {
  const root = process.cwd();
  const sourcePath = path.join(/*turbopackIgnore: true*/ root, sourceRelativePath);
  const projectDir = path.join(/*turbopackIgnore: true*/ root, 'projects', projectName);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  const targetPath = path.join(projectDir, targetName);
  fs.copyFileSync(sourcePath, targetPath);
  return { copiedPath: targetPath, fullTargetPath: targetPath };
}
