import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export async function GET(request: NextRequest, { params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const root = process.cwd();
  const projDir = path.join(root, 'projects', project);
  if (!fs.existsSync(projDir)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const archivePath = path.join(root, 'projects', project + '.tar.gz');
  try {
    const projName = path.basename(projDir);
    const projParent = path.dirname(projDir);
    execSync(`tar -czf "${archivePath}" -C "${projParent}" "${projName}"`, { stdio: 'pipe' });
  } catch (e: any) {
    return NextResponse.json({ error: 'Archive failed: ' + (e?.message || String(e)) }, { status: 500 });
  }

  const fileBuffer = fs.readFileSync(archivePath);
  fs.unlinkSync(archivePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${project}.tar.gz"`,
    },
  });
}
