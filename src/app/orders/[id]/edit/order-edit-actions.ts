'use client';

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase'; // Assuming db is exported from your client-side firebase setup

export type EditableItem = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  description?: string;
  receivedQuantity?: number;
};

export async function updateOrderItemsOnClient(
  orderId: string,
  items: EditableItem[],
) {
  const ref = doc(db, 'purchaseOrders', orderId);
  await updateDoc(ref, {
    items,
    updatedAt: serverTimestamp(),
  });
}
