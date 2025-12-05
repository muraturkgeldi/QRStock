
'use server';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

import { firestore, initFirebase } from '@/firebase';
import type { Product, PurchaseOrderItem } from './types';
import { adminAuth, adminDb } from '@/lib/admin.server';

// Sunucu tarafında Firestore'u da initialize et
initFirebase();


// --- Write Operations from original data.ts ---

export async function addProductToDB(
  uid: string,
  productData: {
    id: string;
    name: string;
    description?: string;
    sku: string;
    minStockLevel?: number;
    tags?: string[];
  }
): Promise<string> {
  if (!uid) {
    throw new Error("Authentication Error: User ID is required to add a product.");
  }

  // ✅ Admin SDK YOK, normal firestore kullanıyoruz
  const customIdRef = doc(firestore, 'products', productData.id);
  const docSnap = await getDoc(customIdRef);

  if (docSnap.exists()) {
    throw new Error(`Ürün kodu '${productData.id}' zaten mevcut.`);
  }

  const newProduct: Omit<Product, 'id'> = {
    uid: uid,
    name: productData.name,
    description: productData.description || '',
    sku: productData.sku || productData.id,
    imageUrl: `https://picsum.photos/seed/${productData.id}/400/400`,
    imageHint: 'new product',
    minStockLevel: productData.minStockLevel || 0,
    tags: productData.tags || [],
  };

  await setDoc(customIdRef, newProduct);
  return customIdRef.id;
}


export async function updateProductInDB(
  id: string,
  productData: Partial<Omit<Product, 'id' | 'uid'>>
): Promise<void> {
  // Artık adminDb değil, normal Firestore kullanıyoruz
  const docRef = doc(firestore, 'products', id);

  const existingDoc = await getDoc(docRef);
  if (!existingDoc.exists()) {
    throw new Error('Product not found.');
  }

  await updateDoc(docRef, productData);
}


export async function batchUpdateSkus(uid: string, updates: { id: string, sku: string }[]): Promise<void> {
    if (!uid) {
        throw new Error("Authentication Error: User ID is required for batch update.");
    }

    const batch = writeBatch(firestore);

    for (const update of updates) {
        const productRef = doc(firestore, 'products', update.id);
        batch.update(productRef, { sku: update.sku });
    }

    await batch.commit();
}


export async function batchAddLocations(uid: string, locations: { name: string, type: 'warehouse' | 'corridor' | 'shelf', parentId?: string }[]): Promise<void> {
    if (!uid) {
        throw new Error("Authentication Error: User ID is required to add locations.");
    }

    const batch = writeBatch(firestore);

    for (const location of locations) {
        const docRef = doc(collection(firestore, 'locations'));
        const dataToAdd: { name: string; type: string; uid: string; parentId?: string } = {
            name: location.name,
            type: location.type,
            uid,
        };

        if (location.type !== 'warehouse' && location.parentId) {
            dataToAdd.parentId = location.parentId;
        }

        batch.set(docRef, dataToAdd);
    }

    await batch.commit();
}

export async function updateLocationNameInDB(uid: string, locationId: string, newName: string): Promise<void> {
    const docRef = doc(firestore, 'locations', locationId);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().uid !== uid) {
        throw new Error("You do not have permission to edit this location.");
    }

    await updateDoc(docRef, { name: newName });
}

export async function deleteLocationAndChildren(uid: string, locationId: string): Promise<{deletedCount: number}> {
    const allLocationsQuery = query(collection(firestore, 'locations'), where('uid', '==', uid));
    const querySnapshot = await getDocs(allLocationsQuery);
    const allLocations: any[] = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));


    const locationsToDeleteIds = new Set<string>();
    const findChildren = (id: string) => {
        locationsToDeleteIds.add(id);
        const children = allLocations.filter(loc => loc.parentId === id);
        children.forEach(child => findChildren(child.id));
    };

    findChildren(locationId);

    const locationsToDeleteArray = Array.from(locationsToDeleteIds);
    const zeroStockItemsToDelete: string[] = [];

    const CHUNK_SIZE = 30;
    for (let i = 0; i < locationsToDeleteArray.length; i += CHUNK_SIZE) {
        const chunk = locationsToDeleteArray.slice(i, i + CHUNK_SIZE);
        if (chunk.length === 0) continue;
        
        const stockItemsQuery = query(
            collection(firestore, 'stockItems'), 
            where('uid', '==', uid), 
            where('locationId', 'in', chunk)
        );
        const stockItemsSnapshot = await getDocs(stockItemsQuery);
        
        for (const itemDoc of stockItemsSnapshot.docs) {
            if (itemDoc.data().quantity > 0) {
                 const problematicLocationId = itemDoc.data().locationId;
                 const problematicLocation = allLocations.find(l => l.id === problematicLocationId);
                 const locationName = problematicLocation ? `"${problematicLocation.name}"` : `(${problematicLocationId})`;
                 throw new Error(`Silme işlemi başarısız: ${locationName} lokasyonunda hala stok bulunuyor. Önce ürünleri transfer edin veya silin.`);
            } else {
                zeroStockItemsToDelete.push(itemDoc.id);
            }
        }
    }
    
    const batch = writeBatch(firestore);
    
    locationsToDeleteIds.forEach(id => {
        batch.delete(doc(firestore, 'locations', id));
    });

    zeroStockItemsToDelete.forEach(itemId => {
        batch.delete(doc(firestore, 'stockItems', itemId));
    });

    await batch.commit();
    return { deletedCount: locationsToDeleteIds.size };
}



export const updateStockInDB = async (
    uid: string, 
    productId: string, 
    locationId: string, 
    type: 'in' | 'out', 
    quantity: number,
    details: { description?: string, requester?: string }
): Promise<void> => {
    if (!uid) {
        throw new Error("Authentication Error: User ID cannot be empty.");
    }
    
    const parsedQuantity = parseInt(String(quantity), 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("Geçersiz miktar. Miktar pozitif bir sayı olmalıdır.");
    }


    const stockItemsRef = collection(firestore, 'stockItems');
    const q = query(stockItemsRef, where('productId', '==', productId), where('locationId', '==', locationId), where('uid', '==', uid));
    
    const movementsRef = collection(firestore, 'stockMovements');

    await runTransaction(firestore, async (transaction) => {
        const snapshot = await getDocs(q);
        let newQuantity: number;

        if (snapshot.empty) {
            if (type === 'out') {
                throw new Error("Stokta olmayan bir ürünü azaltamazsınız.");
            }
            const newStockItemRef = doc(collection(firestore, 'stockItems'));
            newQuantity = parsedQuantity;
            transaction.set(newStockItemRef, { productId, locationId, quantity: newQuantity, uid });
        } else {
            const stockItemDoc = snapshot.docs[0];
            const currentQuantity = parseInt(String(stockItemDoc.data().quantity), 10);
            
            newQuantity = type === 'in' ? currentQuantity + parsedQuantity : currentQuantity - parsedQuantity;

            if (newQuantity < 0) {
                throw new Error('Yetersiz stok!');
            }
            transaction.update(doc(firestore, 'stockItems', stockItemDoc.id), { quantity: newQuantity });
        }
        
        const newMovementRef = doc(movementsRef);
        
        const movementData = {
            productId, 
            locationId, 
            type,
            quantity: parsedQuantity,
            uid,
            userId: uid, // Use the provided uid as the performer
            description: details.description || '',
            requester: details.requester || '',
            date: serverTimestamp(),
        };

        transaction.set(newMovementRef, movementData);
    });
};

export const transferStockInDB = async (
  uid: string,
  productId: string,
  sourceLocationId: string,
  destinationLocationId: string,
  quantity: number
): Promise<void> => {
    if(!uid) {
        throw new Error("Authentication Error: User not found for stock transfer.");
    }

  if (sourceLocationId === destinationLocationId) {
    throw new Error('Kaynak ve hedef lokasyonlar aynı olamaz.');
  }
   await runTransaction(firestore, async (transaction) => {

        const sourceStockQuery = query(collection(firestore, 'stockItems'), 
            where('productId', '==', productId), 
            where('locationId', '==', sourceLocationId), 
            where('uid', '==', uid)
        );
        const sourceStockSnap = await getDocs(sourceStockQuery);
        if (sourceStockSnap.empty) throw new Error("Kaynak lokasyonda ürün bulunamadı.");
        
        const sourceStockDoc = sourceStockSnap.docs[0];
        const sourceStockData = sourceStockDoc.data();
        if (sourceStockData.quantity < quantity) throw new Error("Yetersiz stok.");

        const destStockQuery = query(collection(firestore, 'stockItems'), 
            where('productId', '==', productId), 
            where('locationId', '==', destinationLocationId), 
            where('uid', '==', uid)
        );
        const destStockSnap = await getDocs(destStockQuery);

        const newSourceQuantity = sourceStockData.quantity - quantity;
        transaction.update(sourceStockDoc.ref, { quantity: newSourceQuantity });

        if (destStockSnap.empty) {
            const newDestStockRef = doc(collection(firestore, 'stockItems'));
            transaction.set(newDestStockRef, { productId, locationId: destinationLocationId, quantity, uid });
        } else {
            const destStockDoc = destStockSnap.docs[0];
            const newDestQuantity = destStockDoc.data().quantity + quantity;
            transaction.update(destStockDoc.ref, { quantity: newDestQuantity });
        }

        const movementRef = doc(collection(firestore, 'stockMovements'));
        transaction.set(movementRef, {
            productId,
            type: 'transfer',
            quantity,
            fromLocation: sourceLocationId,
            toLocation: destinationLocationId,
            date: serverTimestamp(),
            uid,
            userId: uid,
        });
   });
};

export const batchAddProducts = async (
    uid: string,
    products: { id: string; name: string; sku: string; }[]
): Promise<void> => {
    if (!uid) {
        throw new Error("Authentication Error: User not found for batch operation.");
    }
    const batch = writeBatch(firestore);

    for (const product of products) {
        const { id, name, sku } = product;

        if (!id || !name || !sku) {
            console.warn("Skipping invalid row:", product);
            continue;
        }

        const productRef = doc(firestore, 'products', id);

        const newProduct: Omit<Product, 'id'> = {
            uid: uid,
            name: name,
            description: '', 
            sku: sku,
            imageUrl: `https://picsum.photos/seed/${id}/400/400`,
            imageHint: "new product"
        };
        
        batch.set(productRef, newProduct, { merge: true }); 
    }
    
    await batch.commit();
};


// --- Settings / Mailing List ---

export async function getMailingList(uid: string): Promise<string[]> {
    if (!uid) {
        console.error("getMailingList called without a uid.");
        return [];
    }
    const settingsRef = doc(firestore, 'settings', uid);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
        const settings = docSnap.data();
        return settings.mailingList || [];
    }
    return [];
}

export async function addEmailToMailingListInDB(uid: string, email: string): Promise<void> {
    const settingsRef = doc(firestore, 'settings', uid);
    
    await runTransaction(firestore, async (transaction) => {
        const docSnap = await transaction.get(settingsRef);
        if (!docSnap.exists()) {
            transaction.set(settingsRef, { uid, mailingList: [email] });
        } else {
            transaction.update(settingsRef, {
                mailingList: arrayUnion(email)
            });
        }
    });
}

export async function removeEmailFromMailingListInDB(uid: string, email: string): Promise<void> {
    const settingsRef = doc(firestore, 'settings', uid);
    
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        await updateDoc(settingsRef, {
            mailingList: arrayRemove(email)
        });
    }
}

// Purchase Order Operations
export async function createPurchaseOrderInDB(input: {
  uid: string;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    description?: string;
  }>;
  status?: 'draft' | 'ordered' | 'partially-received' | 'received';
}): Promise<any> {
  // 1) Normalize
  const status = input.status ?? 'draft';

  const items = input.items
    .map((it) => ({
      productId: String(it.productId || '').trim(),
      productName: String(it.productName || '').trim(),
      productSku: String(it.productSku || '').trim(),
      description: String(it.description ?? ''),
      quantity: Number(it.quantity),
    }))
    .filter(
      (it) =>
        it.productId &&
        it.productName &&
        it.productSku &&
        Number.isFinite(it.quantity) &&
        it.quantity > 0,
    );

  if (!input.uid) throw new Error('UID_MISSING');
  if (items.length === 0) throw new Error('NO_VALID_ITEMS');

  // 2) Payload
  const payload = {
    uid: input.uid,
    orderNumber: `PO-${Date.now()}`,
    orderDate: new Date(), // Admin Firestore bunu Timestamp'e çevirir
    status,
    items: items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      productSku: it.productSku,
      quantity: it.quantity,
      receivedQuantity: 0,
      remainingQuantity: it.quantity,
      description: it.description,
    })),
  };

  try {
    // 🔥 BURASI KRİTİK: client firestore DEĞİL, adminDb() kullanıyoruz
    const db = adminDb();
    const ref = await db.collection('purchaseOrders').add(payload);
    return { id: ref.id, ...payload };
  } catch (e: any) {
    console.error('CREATE_PO_IN_DB_ERROR:', e);
    const msg = e?.message || 'FIRESTORE_ADD_FAILED';
    const err: any = new Error(msg);
    err.code = e?.code;
    throw err;
  }
}

export async function updatePurchaseOrderInDB(orderId: string, uid: string, items: PurchaseOrderItem[]): Promise<void> {
    const orderRef = doc(firestore, 'purchaseOrders', orderId);

    await runTransaction(firestore, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists() || orderSnap.data().uid !== uid) {
            throw new Error("Sipariş bulunamadı veya düzenleme yetkiniz yok.");
        }

        const updatedItems = items.map(item => ({
            ...item,
            remainingQuantity: item.quantity - item.receivedQuantity,
        }));
        
        const allItemsReceived = updatedItems.every(i => i.remainingQuantity <= 0);
        const someItemsReceived = updatedItems.some(i => i.receivedQuantity > 0);
        
        let status: 'draft' | 'ordered' | 'partially-received' | 'received' = 'draft';
        if (allItemsReceived) {
            status = 'received';
        } else if (someItemsReceived) {
            status = 'partially-received';
        } else {
            const currentStatus = orderSnap.data().status;
            if (currentStatus === 'ordered' || currentStatus === 'partially-received') {
                status = 'ordered';
            }
        }


        transaction.update(orderRef, { items: updatedItems, status });
    });
}
    
export async function receivePurchaseOrderItemInDB(uid: string, orderId: string, productId: string, receivedQuantity: number, locationId: string): Promise<void> {

    await runTransaction(firestore, async (transaction) => {
        const orderRef = doc(firestore, "purchaseOrders", orderId);
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists() || orderSnap.data().uid !== uid) {
            throw new Error("Sipariş bulunamadı veya bu işlem için yetkiniz yok.");
        }

        const order: any = orderSnap.data();
        const itemIndex = order.items.findIndex((item:any) => item.productId === productId);

        if (itemIndex === -1) {
            throw new Error("Sipariş içinde ürün bulunamadı.");
        }

        const item = order.items[itemIndex];
        
        if (receivedQuantity > item.remainingQuantity) {
            throw new Error(`Teslim alınan miktar (${receivedQuantity}), kalan miktardan (${item.remainingQuantity}) fazla olamaz.`);
        }

        const newReceived = item.receivedQuantity + receivedQuantity;
        const newRemaining = item.quantity - newReceived;
        
        order.items[itemIndex].receivedQuantity = newReceived;
        order.items[itemIndex].remainingQuantity = newRemaining;

        const allItemsReceived = order.items.every((i:any) => i.remainingQuantity <= 0);
        const someItemsReceived = order.items.some((i:any) => i.receivedQuantity > 0);

        if (allItemsReceived) {
            order.status = 'received';
        } else if (someItemsReceived) {
            order.status = 'partially-received';
        } else {
            order.status = 'ordered';
        }

        transaction.update(orderRef, { items: order.items, status: order.status });
        
        const stockItemsRef = collection(firestore, 'stockItems');
        const q = query(stockItemsRef, where('productId', '==', productId), where('locationId', '==', locationId), where('uid', '==', uid));
        const stockSnapshot = await getDocs(q);

        if (stockSnapshot.empty) {
            const newStockItemRef = doc(collection(firestore, 'stockItems'));
            transaction.set(newStockItemRef, { productId, locationId, quantity: receivedQuantity, uid });
        } else {
            const stockItemDoc = stockSnapshot.docs[0];
            const newQuantity = stockItemDoc.data().quantity + receivedQuantity;
            transaction.update(stockItemDoc.ref, { quantity: newQuantity });
        }
        
        const newMovementRef = doc(collection(firestore, 'stockMovements'));
        transaction.set(newMovementRef, {
            productId,
            locationId,
            type: 'in',
            quantity: receivedQuantity,
            date: serverTimestamp(),
            uid,
            userId: uid,
            description: `Sipariş #${order.orderNumber} teslimatı`
        });
    });
}

export async function updateUserDisplayNameInDB(userId: string, displayName: string): Promise<void> {
    await adminAuth().updateUser(userId, { displayName });
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, { displayName });
}


    

    
