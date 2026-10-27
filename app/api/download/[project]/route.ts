import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export async function GET(request: NextRequest, { params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const root = process.cwd();
  const projDir = path.join(root, 'projects', project);
  if (!fs.existsSync(projDir)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const zipPath = path.join(root, 'projects', project + '.zip');
  try {
    execSync(`zip -r "${zipPath}" "${projDir}" -x "*.zip"`, { stdio: 'pipe' });
  } catch (e) {
    return NextResponse.json({ error: 'Zip failed' }, { status: 500 });
  }

  const fileBuffer = fs.readFileSync(zipPath);
  fs.unlinkSync(zipPath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${project}.zip"`,
    },
  });
}
