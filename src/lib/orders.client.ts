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
  remainingQuantity?: number;
};

// Firestore'a `undefined` değer göndermeyi engelleyen temizleme fonksiyonu.
function sanitizeItemsForFirestore(items: EditableItem[]) {
  return items.map(it => {
    const quantity = Number.isFinite(it.quantity) ? it.quantity : 0;
    const receivedQuantity = Number.isFinite(it.receivedQuantity) ? it.receivedQuantity : 0;
    
    return {
      productId: it.productId ?? "",
      productName: it.productName ?? "",
      productSku: it.productSku ?? "",
      quantity: quantity,
      description: it.description ?? null,
      receivedQuantity: receivedQuantity,
      remainingQuantity: Math.max(0, quantity - receivedQuantity),
    };
  });
}


export async function updateOrderItemsClient(orderId: string, items: EditableItem[]) {
  const ref = doc(db, "purchaseOrders", orderId);
  const safeItems = sanitizeItemsForFirestore(items);
  
  await updateDoc(ref, {
    items: safeItems,
    updatedAt: serverTimestamp(),
  });
}
