import { onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

// sku + locationId + delta (+/-) -> stockItems quantity güncelle, stockMovements ekle
export const adjustStock = onCall({ cors: true }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error('UNAUTHENTICATED');

  const { sku, locationId, delta, type } = req.data as {
    sku: string; locationId: string; delta: number; type: 'in'|'out'|'transfer';
  };
  if (!sku || !locationId || !delta || !type) throw new Error('INVALID_ARGUMENT');

  // 1) SKU -> product
  const prodSnap = await db.collection('products')
    .where('uid','==',uid).where('sku','==',sku).limit(1).get();
  if (prodSnap.empty) throw new Error('PRODUCT_NOT_FOUND');
  const productId = prodSnap.docs[0].id;
  const productData = prodSnap.docs[0].data();

  // 2) Tekil stockItem id (uid+product+location)
  const stockId = `${uid}_${productId}_${locationId}`;
  const stockRef = db.collection('stockItems').doc(stockId);
  const mvRef = db.collection('stockMovements').doc();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(stockRef);
    const currentQty = snap.exists ? (snap.data()?.quantity || 0) : 0;
    const newQty = currentQty + delta;
    
    if (newQty < 0) {
        throw new Error('INSUFFICIENT_STOCK');
    }

    tx.set(stockRef, {
      id: stockId, uid, productId, locationId, quantity: newQty
    }, { merge: true });

    tx.set(mvRef, {
      id: mvRef.id, 
      uid, 
      productId,
      locationId,
      type,
      quantity: Math.abs(delta), 
      date: new Date().toISOString(), 
      userId: req.auth?.token.email || uid,
      description: `Callable function ${type} operation.`
    });
  });

  return { ok: true };
});


export * from './receivePo';
