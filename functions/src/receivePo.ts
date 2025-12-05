import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

export const receivePO = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error('UNAUTHENTICATED');
  const { poId, itemReceipts } = req.data as {
    poId: string;
    itemReceipts: { productId: string; addQty: number; locationId: string }[];
  };

  if (!poId || !itemReceipts || !Array.isArray(itemReceipts) || itemReceipts.length === 0) {
    throw new Error('INVALID_ARGUMENT');
  }

  const poRef = db.collection('purchaseOrders').doc(poId);

  await db.runTransaction(async (tx) => {
    const poSnap = await tx.get(poRef);
    if (!poSnap.exists) throw new Error('PO_NOT_FOUND');
    
    const poData = poSnap.data();
    if (poData?.uid !== uid) throw new Error('PERMISSION_DENIED');

    let allItemsFullyReceived = true;

    const updatedItems = poData.items.map((item: any) => {
      const receipt = itemReceipts.find(r => r.productId === item.productId);
      if (!receipt || receipt.addQty <= 0) return item;

      const newReceivedQty = (item.receivedQuantity || 0) + receipt.addQty;
      const remainingQty = Math.max(0, item.quantity - newReceivedQty);
      
      if (remainingQty > 0) allItemsFullyReceived = false;

      // Update stockItem
      const stockRef = db.collection('stockItems').doc(); // Create new or find existing
      tx.set(stockRef, { 
          uid, 
          productId: item.productId, 
          locationId: receipt.locationId,
          quantity: FieldValue.increment(receipt.addQty)
      }, { merge: true });

      // Create stockMovement
      const movementRef = db.collection('stockMovements').doc();
      tx.set(movementRef, {
        uid,
        productId: item.productId,
        locationId: receipt.locationId,
        type: 'in',
        quantity: receipt.addQty,
        date: new Date().toISOString(),
        userId: req.auth?.token.email || uid,
        description: `PO ${poData.orderNumber} received`
      });

      return { ...item, receivedQuantity: newReceivedQty, remainingQuantity: remainingQty };
    });

    const newStatus = allItemsFullyReceived ? 'received' : 'partially-received';
    tx.update(poRef, { items: updatedItems, status: newStatus });
  });

  return { ok: true };
});
