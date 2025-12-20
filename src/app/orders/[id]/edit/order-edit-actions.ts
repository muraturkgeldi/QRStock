'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/admin.server';

// UI'dan gelecek minimal satır tipi
type EditableItem = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  description?: string;
  receivedQuantity?: number;
};

export async function updateOrderItemsAction(
  orderId: string,
  items: EditableItem[],
) {
  const db = adminDb();
  if (!db) {
    throw new Error('Veritabanı bağlantısı kurulamadı. Sunucu yapılandırmasını kontrol edin.');
  }
  const ref = db.collection('purchaseOrders').doc(orderId);

  await ref.update({
    items,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Liste + detay sayfası yeniden çekilsin
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
}
