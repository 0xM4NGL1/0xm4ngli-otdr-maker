'use server';

import { getOfficialFiles, getProjectNames, getProjectFiles, copyFileToProject, ensureProjectDir } from './files';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function listOfficialFiles(query?: string) {
  const all = getOfficialFiles();
  if (!query || query.trim() === '') return all;
  const q = query.toLowerCase();
  return all.filter(f => f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q));
}

export async function listSrProjects() {
  return getProjectNames();
}

export async function listSrFiles(srName: string) {
  return getProjectFiles(srName);
}

export async function createSrProject(name: string) {
  const root = process.cwd();
  const dir = path.join(root, 'projects', name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return name;
}

export async function deleteSrProject(name: string) {
  const root = process.cwd();
  const dir = path.join(root, 'projects', name);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export async function addToSrProject(sourcePath: string, srName: string, newName: string) {
  if (!srName) throw new Error('SR name required');
  const root = process.cwd();
  const projDir = path.join(root, 'projects', srName);
  if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });
  let targetName = newName || path.basename(sourcePath);
  if (!targetName.endsWith('.sor')) targetName += '.sor';
  const targetPath = path.join(projDir, targetName);
  if (fs.existsSync(targetPath)) {
    const base = targetName.replace('.sor', '');
    let i = 1;
    while (fs.existsSync(path.join(projDir, `${base}-${i}.sor`))) i++;
    targetName = `${base}-${i}.sor`;
  }
  const result = copyFileToProject(sourcePath, srName, targetName);
  return { targetName, copiedPath: result.copiedPath };
}

export async function openFolder(projectName: string) {
  const root = process.cwd();
  const dir = path.join(root, 'projects', projectName);
  exec(`dolphin "${dir}"`);
  return true;
}

export async function deleteSrProjectFile(srName: string, fileName: string) {
  const root = process.cwd();
  const p = path.join(root, 'projects', srName, fileName);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  return true;
}
