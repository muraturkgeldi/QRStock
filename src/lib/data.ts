

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import type { Product, Location, StockItem } from './types';


// --- Read Operations ---
export async function getLocationById(id: string): Promise<Location | undefined> {
    const docRef = doc(firestore, 'locations', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { ...docSnap.data(), id: docSnap.id } as Location;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const docRef = doc(firestore, 'products', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return undefined;

  const product = { ...docSnap.data(), id: docSnap.id } as Product;
  
  return product;
}

export async function findProductBySku(uid: string, sku: string): Promise<Product | undefined> {
    
    // First, try finding by the new 'sku' field
    const skuQuery = query(collection(firestore, 'products'), where('uid', '==', uid), where('sku', '==', sku));
    const skuSnapshot = await getDocs(skuQuery);
    
    if (!skuSnapshot.empty) {
        const doc = skuSnapshot.docs[0];
        return { ...doc.data(), id: doc.id } as Product;
    }
    
    // Fallback: if not found, try finding by document ID (for old data)
    try {
        const productById = await getProductById(sku);
        if (productById && productById.uid === uid) {
            return productById;
        }
    } catch(e) {
        // This can happen if the sku is not a valid doc ID format
    }

    return undefined;
}

export async function getStockItemsByProductId(uid: string, productId: string): Promise<StockItem[]> {
  const q = query(
    collection(firestore, 'stockItems'),
    where('uid', '==', uid),
    where('productId', '==', productId)
  );
  const stockItemsSnap = await getDocs(q);

  if (stockItemsSnap.empty) {
    return [];
  }
  
  const product = await getProductById(productId);
  if (!product) return [];

  return stockItemsSnap.docs.map(itemDoc => {
      const data = itemDoc.data();
      return {
          id: itemDoc.id,
          product,
          quantity: data.quantity,
          uid,
          locationId: data.locationId,
          productId: product.id
      } as StockItem;
  }).filter((item): item is StockItem => item !== null);
}

export async function getLocations(): Promise<Location[]> {
  const locationsSnap = await getDocs(collection(firestore, 'locations'));
  
  if (locationsSnap.empty) {
    return [];
  }
  
  return locationsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Location));
}

    