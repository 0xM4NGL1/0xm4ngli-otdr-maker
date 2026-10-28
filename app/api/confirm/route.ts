import { NextRequest, NextResponse } from 'next/server';
import { addToSrProject } from '../../lib/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourcePath, target, rename } = body;
    if (!sourcePath || !target || !rename) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const res = await addToSrProject(sourcePath, target, rename);
    return NextResponse.json({ success: true, targetName: res.targetName, source: res.source });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
