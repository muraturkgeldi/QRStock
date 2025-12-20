
'use client';

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase.client";

export type EditableItem = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  description?: string;
  receivedQuantity?: number;
};

export async function updateOrderItemsClient(orderId: string, items: EditableItem[]) {
  const ref = doc(db, "purchaseOrders", orderId);
  await updateDoc(ref, {
    items,
    updatedAt: serverTimestamp(),
  });
}
