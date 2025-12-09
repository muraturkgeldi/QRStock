
'use server';

import { adminDb } from '@/lib/admin.server';
import { randomUUID } from 'crypto';
import type { PurchaseOrderEvent, PurchaseOrder } from '@/lib/types';

export async function recordOrderEvent(params: {
  ownerUid: string;        // orders hangi user altında tutuluyorsa
  orderId: string;
  type: PurchaseOrderEvent['type'];
  actor: PurchaseOrderEvent['actor'];
  fromStatus?: PurchaseOrder['status'];
  toStatus?: PurchaseOrder['status'];
  itemId?: string;
  productSku?: string;
  quantity?: number;
  reason?: string;
  note?: string;
}) {
  const id = randomUUID();
  const now = new Date();

  const event: PurchaseOrderEvent = {
    id,
    orderId: params.orderId,
    type: params.type,
    at: now,
    actor: params.actor,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    itemId: params.itemId,
    productSku: params.productSku,
    quantity: params.quantity,
    reason: params.reason,
    note: params.note,
  };

  await adminDb()
    .collection('purchaseOrders')
    .doc(params.orderId)
    .collection('events')
    .doc(id)
    .set(event);
}
