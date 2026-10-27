import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Archiver } from 'archiver';

export async function GET(request: NextRequest, { params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;
  const root = process.cwd();
  const projDir = path.join(root, 'projects', project);
  if (!fs.existsSync(projDir)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const archive = new Archiver('zip', { zlib: { level: 9 } });
  archive.directory(projDir, false);

  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  return new Promise<NextResponse>((resolve, reject) => {
    archive.on('end', () => {
      const fileBuffer = Buffer.concat(chunks);
      resolve(new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${project}.zip"`,
        },
      }));
    });
    archive.on('warning', (err: any) => {
      if (err.code === 'ENOENT') return;
      reject(err);
    });
    archive.on('error', (err: any) => reject(err));
    archive.finalize();
  }).catch((e: any) => {
    return NextResponse.json({ error: 'Archive failed: ' + (e?.message || String(e)) }, { status: 500 });
  });
}
