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
    const folderPath = path.join(root, folder);
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
  const projectsDir = path.join(root, 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
  return projectsDir;
}

export function getProjectNames(): string[] {
  ensureProjectDir();
  const root = process.cwd();
  const projectsDir = path.join(root, 'projects');
  return fs.readdirSync(projectsDir).filter(f => {
    const p = path.join(projectsDir, f);
    return fs.statSync(p).isDirectory();
  }).sort();
}

export function getProjectFiles(projectName: string): string[] {
  const root = process.cwd();
  const projectPath = path.join(root, 'projects', projectName);
  if (!fs.existsSync(projectPath)) return [];
  return fs.readdirSync(projectPath).filter(f => f.endsWith('.sor')).sort();
}

export function copyFileToProject(
  sourceRelativePath: string,
  projectName: string,
  targetName: string
): { copiedPath: string; fullTargetPath: string } {
  const root = process.cwd();
  const sourcePath = path.join(root, sourceRelativePath);
  const projectDir = path.join(root, 'projects', projectName);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  const targetPath = path.join(projectDir, targetName);
  fs.copyFileSync(sourcePath, targetPath);
  return { copiedPath: targetPath, fullTargetPath: targetPath };
}
