
import { NextRequest, NextResponse } from 'next/server';
import { createPurchaseOrderInDB } from '@/lib/server-actions';
import { adminAuth } from '@/lib/admin.server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, items, userInfo } = body;
    
    if (!uid) {
      return NextResponse.json(
        { ok: false, error: 'UID_MISSING' },
        { status: 401 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'NO_ITEMS' },
        { status: 400 }
      );
    }
    
    const userRecord = await adminAuth().getUser(uid);

    const result = await createPurchaseOrderInDB({
      uid,
      items,
      status: 'draft',
      userInfo: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
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
