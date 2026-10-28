import { NextRequest, NextResponse } from 'next/server';
import { renameSrProjectFile } from '../../lib/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { srName, oldName, newName } = body;
    if (!srName || !oldName || !newName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const res = await renameSrProjectFile(srName, oldName, newName);
    return NextResponse.json({ success: true, targetName: res.targetName, source: res.source });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
