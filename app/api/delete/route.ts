import { NextRequest, NextResponse } from 'next/server';
import { deleteSrProjectFile } from '../../lib/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { srName, fileName } = body;
    if (!srName || !fileName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    await deleteSrProjectFile(srName, fileName);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
