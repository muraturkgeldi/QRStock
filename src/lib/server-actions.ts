
'use server';

import { adminDb } from '@/lib/admin.server';
import { placeholderProducts } from '@/lib/placeholder-images';
import type { Product, Location } from '@/lib/types';
import { Timestamp, collection, doc, writeBatch, getDocs, query, where, updateDoc, deleteDoc, getDoc, addDoc, serverTimestamp, FieldValue } from 'firebase/firestore';


async function addProductToDB(uid: string, productData: Omit<Product, 'id' | 'uid' | 'imageUrl' | 'imageHint'> & { tags?: string[] }) {
    const db = adminDb();
    const newProductRef = doc(collection(db, 'products'));

    const placeholder = placeholderProducts[Math.floor(Math.random() * placeholderProducts.length)];

    await db.collection('products').doc(newProductRef.id).set({
        ...productData,
        uid,
        createdAt: serverTimestamp(),
        imageUrl: placeholder.imageUrl,
        imageHint: placeholder.imageHint,
        tags: productData.tags || []
    });
    return newProductRef.id;
}


async function updateStockInDB(uid: string, productId: string, locationId: string, type: 'in' | 'out', quantity: number, metadata: { description?: string, requester?: string }) {
    if (!uid || !productId || !locationId || !type || !quantity) {
        throw new Error('Eksik parametreler.');
    }

    const db = adminDb();
    
    // Find the specific stock item
    const stockQuery = query(
      collection(db, 'stockItems'),
      where('uid', '==', uid),
      where('productId', '==', productId),
      where('locationId', '==', locationId)
    );
    
    const stockSnap = await getDocs(stockQuery);
    let stockItemRef;
    let currentQuantity = 0;
    
    if (!stockSnap.empty) {
        const stockDoc = stockSnap.docs[0];
        stockItemRef = stockDoc.ref;
        currentQuantity = stockDoc.data().quantity || 0;
    } else {
        stockItemRef = doc(collection(db, 'stockItems'));
    }

    const newQuantity = type === 'in' ? currentQuantity + quantity : currentQuantity - quantity;
    if (newQuantity < 0) {
        throw new Error('Yetersiz stok.');
    }

    // Create a new stock movement record
    const movementRef = doc(collection(db, 'stockMovements'));
    
    const userRecord = await adminDb().collection('users').doc(uid).get();
    const userDisplayName = userRecord.data()?.displayName || 'Sistem';
    
    const batch = writeBatch(db);

    batch.set(stockItemRef, {
        uid,
        productId,
        locationId,
        quantity: newQuantity
    }, { merge: true });

    batch.set(movementRef, {
        uid,
        productId,
        locationId,
        type,
        quantity: quantity,
        date: serverTimestamp(),
        userId: userDisplayName,
        description: metadata.description,
        requester: metadata.requester
    });

    await batch.commit();
}


async function updateProductInDB(productId: string, productData: Partial<Omit<Product, 'id' | 'uid'>>) {
    const db = adminDb();
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
        ...productData,
        updatedAt: serverTimestamp(),
    });
}

async function transferStockInDB(uid: string, productId: string, sourceLocationId: string, destinationLocationId: string, quantity: number) {
    if (sourceLocationId === destinationLocationId) {
        throw new Error('Kaynak ve hedef lokasyonlar aynı olamaz.');
    }

    const db = adminDb();
    
    const userRecord = await adminDb().collection('users').doc(uid).get();
    const userDisplayName = userRecord.data()?.displayName || 'Sistem';
    
    // Find source stock item
    const sourceQuery = query(
        collection(db, 'stockItems'),
        where('uid', '==', uid),
        where('productId', '==', productId),
        where('locationId', '==', sourceLocationId)
    );
    const sourceSnap = await getDocs(sourceQuery);
    if (sourceSnap.empty) {
        throw new Error('Kaynak lokasyonda ürün bulunamadı.');
    }
    const sourceDoc = sourceSnap.docs[0];
    if (sourceDoc.data().quantity < quantity) {
        throw new Error('Kaynak lokasyonda yeterli stok yok.');
    }

    // Find or create destination stock item
    const destQuery = query(
        collection(db, 'stockItems'),
        where('uid', '==', uid),
        where('productId', '==', productId),
        where('locationId', '==', destinationLocationId)
    );
    const destSnap = await getDocs(destQuery);
    let destDocRef;
    let destCurrentQuantity = 0;
    if (destSnap.empty) {
        destDocRef = doc(collection(db, 'stockItems'));
    } else {
        destDocRef = destSnap.docs[0].ref;
        destCurrentQuantity = destSnap.docs[0].data().quantity || 0;
    }

    const batch = writeBatch(db);

    // Update source
    batch.update(sourceDoc.ref, { quantity: sourceDoc.data().quantity - quantity });

    // Update destination
    batch.set(destDocRef, { 
        uid,
        productId,
        locationId: destinationLocationId,
        quantity: destCurrentQuantity + quantity 
    }, { merge: true });
    
    // Create movement log
    const movementRef = doc(collection(db, 'stockMovements'));
    batch.set(movementRef, {
        uid,
        productId,
        locationId: sourceLocationId, // Source location for "out" part of transfer
        type: 'transfer',
        quantity,
        date: serverTimestamp(),
        userId: userDisplayName,
        description: `Transfer: ${sourceLocationId} -> ${destinationLocationId}`
    });

    await batch.commit();
}

async function batchAddLocations(uid: string, locations: Pick<Location, 'name' | 'type' | 'parentId'>[]) {
    const db = adminDb();
    const batch = writeBatch(db);
    locations.forEach(loc => {
        const newLocRef = doc(collection(db, 'locations'));
        batch.set(newLocRef, { ...loc, uid, createdAt: serverTimestamp() });
    });
    await batch.commit();
}


async function batchAddProducts(uid: string, products: Pick<Product, 'name' | 'sku'>[]) {
    const db = adminDb();
    const batch = writeBatch(db);
    products.forEach(product => {
        const newProductRef = doc(collection(db, 'products'));
        const placeholder = placeholderProducts[Math.floor(Math.random() * placeholderProducts.length)];
        batch.set(newProductRef, {
            ...product,
            uid,
            createdAt: serverTimestamp(),
            imageUrl: placeholder.imageUrl,
            imageHint: placeholder.imageHint,
        });
    });
    await batch.commit();
}

async function getMailingList(uid: string): Promise<string[]> {
    const docRef = doc(adminDb(), 'settings', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return [];
    return docSnap.data()?.mailingList || [];
}

async function addEmailToMailingListInDB(uid: string, email: string) {
    const docRef = doc(adminDb(), 'settings', uid);
    await updateDoc(docRef, {
        mailingList: FieldValue.arrayUnion(email)
    });
}

async function removeEmailFromMailingListInDB(uid: string, email: string) {
    const docRef = doc(adminDb(), 'settings', uid);
    await updateDoc(docRef, {
        mailingList: FieldValue.arrayRemove(email)
    });
}


async function batchUpdateSkus(uid: string, updates: { id: string, sku: string }[]) {
    const db = adminDb();
    const batch = writeBatch(db);
    const q = query(collection(db, 'products'), where('uid', '==', uid));
    const userProductsSnap = await getDocs(q);
    const userProductIds = new Set(userProductsSnap.docs.map(d => d.id));

    updates.forEach(update => {
        if (userProductIds.has(update.id)) {
            const productRef = doc(db, 'products', update.id);
            batch.update(productRef, { sku: update.sku });
        }
    });

    await batch.commit();
}

async function updateLocationNameInDB(uid: string, locationId: string, name: string) {
    const db = adminDb();
    const locationRef = doc(db, 'locations', locationId);
    const locationSnap = await getDoc(locationRef);

    if (!locationSnap.exists() || locationSnap.data()?.uid !== uid) {
        throw new Error("Lokasyon bulunamadı veya bu işlem için yetkiniz yok.");
    }
    
    await updateDoc(locationRef, { name });
}

async function deleteLocationAndChildren(uid: string, locationId: string) {
    const db = adminDb();
    const locationsToDelete = new Set<string>();
    const q = collection(db, 'locations');
    
    const allLocationsSnap = await getDocs(query(q, where('uid', '==', uid)));
    const allLocations = allLocationsSnap.docs.map(d => ({...d.data(), id: d.id} as Location));

    const childrenMap = new Map<string, string[]>();
    allLocations.forEach(loc => {
        if (loc.parentId) {
            const children = childrenMap.get(loc.parentId) || [];
            children.push(loc.id);
            childrenMap.set(loc.parentId, children);
        }
    });

    const stack = [locationId];
    locationsToDelete.add(locationId);

    while (stack.length > 0) {
        const currentId = stack.pop()!;
        const children = childrenMap.get(currentId) || [];
        for (const childId of children) {
            locationsToDelete.add(childId);
            stack.push(childId);
        }
    }
    
    // Check if any location to be deleted has stock
    const stockCheckQuery = query(collection(db, 'stockItems'), where('locationId', 'in', Array.from(locationsToDelete)), where('quantity', '>', 0));
    const stockSnap = await getDocs(stockCheckQuery);
    if (!stockSnap.empty) {
        throw new Error("Silmek istediğiniz lokasyonlardan birinde veya daha fazlasında stok bulunmaktadır. Önce stokları transfer etmelisiniz.");
    }

    const batch = writeBatch(db);
    locationsToDelete.forEach(id => {
        batch.delete(doc(db, 'locations', id));
    });

    await batch.commit();
    return { deletedCount: locationsToDelete.size };
}


async function createPurchaseOrderInDB(orderData: any) {
    const db = adminDb();
    const newOrderRef = doc(collection(db, 'purchaseOrders'));

    const counterRef = doc(db, 'counters', 'purchaseOrders');
    const newOrderNumber = await db.runTransaction(async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const newCount = (counterSnap.data()?.count || 0) + 1;
        transaction.set(counterRef, { count: newCount }, { merge: true });
        return `PO-${String(newCount).padStart(6, '0')}`;
    });

    const items = orderData.items.map((item: any) => ({
        ...item,
        receivedQuantity: 0,
        remainingQuantity: item.quantity,
    }));

    const finalOrderData = {
        ...orderData,
        id: newOrderRef.id,
        orderNumber: newOrderNumber,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: orderData.userInfo,
    };
    
    await newOrderRef.set(finalOrderData);
    
    return { id: newOrderRef.id, orderNumber: newOrderNumber };
}

async function receivePurchaseOrderItemInDB(orderId: string, productId: string, receivedQuantity: number, locationId: string, uid: string) {
    const db = adminDb();
    const orderRef = doc(db, 'purchaseOrders', orderId);

    return db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
            throw new Error('Sipariş bulunamadı.');
        }

        const order = orderSnap.data() as any;
        if (order.uid !== uid) {
            throw new Error('Bu siparişe erişim yetkiniz yok.');
        }

        const itemIndex = order.items.findIndex((item: any) => item.productId === productId);
        if (itemIndex === -1) {
            throw new Error('Siparişte bu ürün bulunmuyor.');
        }

        const item = order.items[itemIndex];
        const newReceivedQty = (item.receivedQuantity || 0) + receivedQuantity;

        if (newReceivedQty > item.quantity) {
            throw new Error('Teslim alınan miktar, sipariş miktarını aşamaz.');
        }

        item.receivedQuantity = newReceivedQty;
        item.remainingQuantity = item.quantity - newReceivedQty;

        const allItemsReceived = order.items.every((i: any) => i.remainingQuantity <= 0);
        order.status = allItemsReceived ? 'received' : 'partially-received';

        transaction.update(orderRef, { items: order.items, status: order.status });
        
        // Stock logic from callable function
        const stockQuery = query(collection(db, 'stockItems'), where('uid', '==', uid), where('productId', '==', productId), where('locationId', '==', locationId));
        const stockSnap = await getDocs(stockQuery);
        let stockItemRef;
        let currentQuantity = 0;
        if (!stockSnap.empty) {
            stockItemRef = stockSnap.docs[0].ref;
            currentQuantity = stockSnap.docs[0].data().quantity || 0;
        } else {
            stockItemRef = doc(collection(db, 'stockItems'));
        }
        transaction.set(stockItemRef, { uid, productId, locationId, quantity: currentQuantity + receivedQuantity }, { merge: true });

        // Movement log
        const movementRef = doc(collection(db, 'stockMovements'));
        transaction.set(movementRef, {
            uid,
            productId,
            locationId,
            type: 'in',
            quantity: receivedQuantity,
            date: serverTimestamp(),
            userId: uid, // Or a more descriptive user identifier
            description: `PO #${order.orderNumber} teslimatı`,
        });
    });
}


async function updatePurchaseOrderInDB(orderId: string, uid: string, items: any[]) {
    const db = adminDb();
    const orderRef = doc(db, 'purchaseOrders', orderId);
    await updateDoc(orderRef, {
        items: items,
        updatedAt: serverTimestamp(),
    });
}

async function updateUserDisplayNameInDB(userId: string, displayName: string) {
    const db = adminDb();
    const auth = (await import('firebase-admin/auth')).getAuth();

    const userRef = doc(db, 'users', userId);
    
    await auth.updateUser(userId, { displayName });
    await updateDoc(userRef, { displayName });
}


export { 
    addProductToDB,
    updateStockInDB,
    updateProductInDB,
    transferStockInDB,
    batchAddLocations,
    batchAddProducts,
    getMailingList,
    addEmailToMailingListInDB,
    removeEmailFromMailingListInDB,
    batchUpdateSkus,
    updateLocationNameInDB,
    deleteLocationAndChildren,
    createPurchaseOrderInDB,
    receivePurchaseOrderItemInDB,
    updatePurchaseOrderInDB,
    updateUserDisplayNameInDB
};
