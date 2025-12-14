'use server';

import admin from 'firebase-admin';
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
    throw new Error('Veritabanı bağlantısı kurulamadı.');
  }
  const ref = db.collection('purchaseOrders').doc(orderId);

  await ref.update({
    items,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Liste + detay sayfası yeniden çekilsin
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
}
