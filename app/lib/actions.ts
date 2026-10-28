'use server';

import {
  getOfficialFiles,
  getProjectNames,
  getProjectFileEntries,
  copyFileToProject,
  getFileSource,
  setFileSource,
  removeFileSource,
  readSourceMap,
  writeSourceMap,
  createMeterFile,
} from './files';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function listOfficialFiles(queryStr?: string) {
  const all = getOfficialFiles();
  if (!queryStr || queryStr.trim() === '') return all;
  const q = queryStr.toLowerCase();
  return all.filter(f => f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q));
}

export async function createOfficialMeterFile(meter: number) {
  return createMeterFile(meter);
}

export async function listSrProjects() {
  return getProjectNames();
}

export async function listSrFiles(srName: string) {
  return getProjectFileEntries(srName);
}

export async function createSrProject(name: string) {
  const root = process.cwd();
  const dir = path.join(/*turbopackIgnore: true*/ root, 'projects', name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return name;
}

export async function deleteSrProject(name: string) {
  const root = process.cwd();
  const dir = path.join(/*turbopackIgnore: true*/ root, 'projects', name);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export async function renameSrProject(oldName: string, newName: string) {
  const root = process.cwd();
  const projectsDir = path.join(/*turbopackIgnore: true*/ root, 'projects');
  const oldPath = path.join(projectsDir, oldName);
  if (!oldName || !fs.existsSync(oldPath)) throw new Error('SR project not found');

  const clean = (newName || '').trim();
  if (!clean) throw new Error('Name required');
  if (clean === '.' || clean === '..' || /[\/\\]/.test(clean)) throw new Error('Invalid folder name');
  if (clean === oldName) return { name: oldName };

  const newPath = path.join(projectsDir, clean);
  if (fs.existsSync(newPath)) throw new Error('SR project already exists');
  fs.renameSync(oldPath, newPath);
  return { name: clean };
}

export async function addToSrProject(sourcePath: string, srName: string, newName: string) {
  if (!srName) throw new Error('SR name required');
  const root = process.cwd();
  const projDir = path.join(/*turbopackIgnore: true*/ root, 'projects', srName);
  if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });

  // If the source already lives in an SR project, inherit its ORIGINAL official name.
  const projectsRoot = path.join(/*turbopackIgnore: true*/ root, 'projects');
  const rel = path.relative(projectsRoot, path.join(/*turbopackIgnore: true*/ root, sourcePath));
  const parts = rel.split(path.sep);
  const sourceName = !rel.startsWith('..') && parts.length === 2
    ? getFileSource(parts[0], parts[1])
    : path.basename(sourcePath);

  let targetName = newName || path.basename(sourcePath);
  if (!targetName.endsWith('.sor')) targetName += '.sor';
  const targetPath = path.join(projDir, targetName);
  if (fs.existsSync(targetPath)) {
    const base = targetName.replace(/\.sor$/, '');
    let i = 1;
    while (fs.existsSync(path.join(projDir, `${base}-${i}.sor`))) i++;
    targetName = `${base}-${i}.sor`;
  }
  const result = copyFileToProject(sourcePath, srName, targetName);
  setFileSource(srName, targetName, sourceName);
  return { targetName, source: sourceName, copiedPath: result.copiedPath };
}

export async function renameSrProjectFile(srName: string, oldName: string, newName: string) {
  if (!srName) throw new Error('SR name required');
  const root = process.cwd();
  const projDir = path.join(/*turbopackIgnore: true*/ root, 'projects', srName);
  const oldPath = path.join(projDir, oldName);
  if (!fs.existsSync(oldPath)) throw new Error('File not found');

  let targetName = (newName || '').trim();
  if (!targetName) throw new Error('Name required');
  if (!targetName.endsWith('.sor')) targetName += '.sor';

  const sourceName = getFileSource(srName, oldName);
  if (targetName === oldName) return { targetName, source: sourceName };

  if (fs.existsSync(path.join(projDir, targetName))) {
    const base = targetName.replace(/\.sor$/, '');
    let i = 1;
    while (fs.existsSync(path.join(projDir, `${base}-${i}.sor`))) i++;
    targetName = `${base}-${i}.sor`;
  }

  fs.renameSync(oldPath, path.join(projDir, targetName));
  const map = readSourceMap(srName);
  delete map[oldName];
  map[targetName] = sourceName;
  writeSourceMap(srName, map);

  return { targetName, source: sourceName };
}

export async function openFolder(projectName: string) {
  const root = process.cwd();
  const dir = path.join(/*turbopackIgnore: true*/ root, 'projects', projectName);
  exec(`dolphin "${dir}"`);
  return true;
}

export async function deleteSrProjectFile(srName: string, fileName: string) {
  const root = process.cwd();
  const p = path.join(/*turbopackIgnore: true*/ root, 'projects', srName, fileName);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  removeFileSource(srName, fileName);
  return true;
}
