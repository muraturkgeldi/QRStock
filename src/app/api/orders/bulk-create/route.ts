
import { NextRequest, NextResponse } from 'next/server';
import { createPurchaseOrderInDB } from '@/lib/server-actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uid = String(body.uid || '');
    const items = Array.isArray(body.items) ? body.items : [];

    if (!uid) {
      return NextResponse.json(
        { ok: false, error: 'UID_MISSING' },
        { status: 401 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'NO_ITEMS' },
        { status: 400 }
      );
    }

    // server-actions.ts içindeki fonksiyonu çağırıyoruz
    const result = await createPurchaseOrderInDB({
      uid,
      items,
      status: 'draft',
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    console.error('BULK_CREATE_PO_API_ERROR:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'BULK_CREATE_PO_FAILED' },
      { status: 500 }
    );
  }
}
