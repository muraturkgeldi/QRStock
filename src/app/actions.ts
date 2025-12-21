
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { 
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
    updatePurchaseOrderInDB,
    updateUserDisplayNameInDB
} from '@/lib/server-actions';
import { getProductById, getStockItemsByProductId, findProductBySku } from '@/lib/data';
import * as xlsx from 'xlsx';
import { generateLowStockReport } from '@/ai/flows/send-low-stock-report';
import nodemailer from 'nodemailer';
import type { PurchaseOrderItem, UserProfile } from '@/lib/types';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { auth } from '@/firebase'; // Keep client auth for user creation
import { adminAuth, adminDb } from '@/lib/admin.server';
import { FieldValue } from 'firebase-admin/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, runTransaction, getDoc, collectionGroup, writeBatch, where } from 'firebase/firestore';
import { getServerDb } from '@/lib/firestore.server';
import { recordOrderEvent } from '@/lib/order-audit';


const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret');

async function getUidFromSession(): Promise<string> {
  const token = cookies().get('session')?.value;
  if (!token) throw new Error('UNAUTHENTICATED');
  try {
    const { payload } = await jose.jwtVerify(token, SECRET);
    const uid = String(payload.uid ?? payload.sub ?? '');
    if (!uid) throw new Error('UNAUTHENTICATED');
    return uid;
  } catch (e) {
    throw new Error('UNAUTHENTICATED');
  }
}


type ProductReportInfo = { 
    id: string; 
    name: string; 
    currentStock: number; 
    minStockLevel?: number; 
};

export async function sendLowStockEmail(
    products: ProductReportInfo[],
    reportType: 'low-stock' | 'out-of-stock'
) {
    const uid = await getUidFromSession();
    try {
        const mailingList = await getMailingList(uid);
        
        if (!mailingList || mailingList.length === 0) {
            console.warn(`No mailing list for user ${uid}. Skipping email.`);
            return { success: true, message: 'Mail listesi boş, e-posta gönderilmedi.' };
        }

        if (products.length === 0) {
            return { success: true, message: 'Raporlanacak ürün bulunmuyor.' };
        }
        
        const { subject, introText } = await generateLowStockReport({ 
            productCount: products.length, 
            reportType 
        });

        const tableRows = products.map(product => {
            let statusBadge = '';
            if (reportType === 'out-of-stock') {
                statusBadge = '<span style="background-color: #FECACA; color: #B91C1C; padding: 3px 8px; border-radius: 12px; font-size: 12px;">TÜKENDİ</span>';
            } else if (reportType === 'low-stock') {
                statusBadge = '<span style="background-color: #FEF3C7; color: #B45309; padding: 3px 8px; border-radius: 12px; font-size: 12px;">DÜŞÜK STOK</span>';
            }

            return `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 12px;">${product.id}</td>
                    <td style="padding: 8px 12px;">${product.name}</td>
                    <td style="padding: 8px 12px; text-align: center;">${product.currentStock}</td>
                    <td style="padding: 8px 12px; text-align: center;">${product.minStockLevel || 'N/A'}</td>
                    <td style="padding: 8px 12px;">${statusBadge}</td>
                </tr>
            `;
        }).join('');

        const fullHtmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                ${introText}
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f3f4f6; text-align: left;">
                            <th style="padding: 8px 12px;">Stok Kodu</th>
                            <th style="padding: 8px 12px;">Ürün Adı</th>
                            <th style="padding: 8px 12px; text-align: center;">Mevcut Stok</th>
                            <th style="padding: 8px 12px; text-align: center;">Minimum Stok</th>
                            <th style="padding: 8px 12px;">Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
        
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Stok Takip Sistemi Rapor" <${process.env.SMTP_USER}>`,
            to: mailingList.join(', '),
            subject: subject,
            html: fullHtmlBody,
        });
        
        console.log(`Report (${reportType}) sent to ${mailingList.join(', ')} for user ${uid}.`);
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to send ${reportType} report email for user ${uid}:`, error);
        return { success: false, error: 'An unexpected response was received from the server.' };
    }
}


export async function updateStock(uid: string, formData: FormData) {
  try {
      if (!uid) throw new Error('Kullanıcı kimliği bulunamadı.');
      const productId = formData.get('productId') as string;
      const type = formData.get('type') as 'in' | 'out';
      const quantity = Number(formData.get('quantity'));
      const locationId = formData.get('locationId') as string;
      const description = formData.get('description') as string | undefined;
      const requester = formData.get('requester') as string | undefined;
      
      const product = await getProductById(productId);
      if (!product) throw new Error("Ürün bulunamadı");
      
      const stockItems = await getStockItemsByProductId(uid, productId);
      const totalStockBefore = stockItems.reduce((sum, item) => sum + item.quantity, 0);

      await updateStockInDB(uid, productId, locationId, type, quantity, { description, requester });

      if (type === 'out') {
        const totalStockAfter = totalStockBefore - quantity;
        const minStockLevel = product.minStockLevel || 0;
        
        const wasAboveMin = totalStockBefore > minStockLevel;
        const isBelowMin = totalStockAfter <= minStockLevel && minStockLevel > 0;
        const isDepleted = totalStockAfter <= 0;
        const wasDepleted = totalStockBefore <= 0;

        const productInfo: ProductReportInfo = {
            id: product.sku || product.id,
            name: product.name,
            currentStock: totalStockAfter,
            minStockLevel: product.minStockLevel,
        };

        if (isDepleted && !wasDepleted) {
             await sendLowStockEmail([productInfo], 'out-of-stock');
        } else if (isBelowMin && wasAboveMin) {
             await sendLowStockEmail([productInfo], 'low-stock');
        }
      }

      revalidatePath('/');
      revalidatePath('/stock');
      revalidatePath('/locations');
      revalidatePath(`/product/${formData.get('productId')}`);
      return { ok: true };

    } catch (error: any) {
      console.error("updateStock failed:", error?.code, error?.message);
      return { ok: false, error: error.message || 'UPDATE_STOCK_FAILED', code: error?.code || null };
    }
}

export async function addProduct(formData: FormData) {
  // ✅ Artık uid’i session’dan değil, formdan alıyoruz
  const uid = String(formData.get('uid') || '');

  if (!uid) {
    // Buraya düşüyorsa formda uid yok demektir
    throw new Error('AUTH_UID_MISSING');
  }

  const name = String(formData.get('name') || '');
  const description = String(formData.get('description') || '');
  const sku = String(formData.get('sku') || '');
  const id = sku.replace(/[^a-zA-Z0-9-]/g, '-');
  const minStockLevel = Number(formData.get('minStockLevel') || 0);

  const tagsString = formData.get('tags') as string;
  const tags = tagsString
    ? tagsString.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  try {
    await addProductToDB(uid, { id, name, description, sku, minStockLevel, tags });
  } catch (error: any) {
    console.error("Failed to add product:", error.message);
    throw error;
  }

  revalidatePath('/stock');
  // Yönlendirme artık istemci tarafından yönetiliyor.
  // redirect('/stock');
}


export async function updateProduct(formData: FormData) {
    const id = String(formData.get('id') || '');
    const name = String(formData.get('name') || '');
    const description = String(formData.get('description') || '');
    const sku = String(formData.get('sku') || '');
    const minStockLevel = Number(formData.get('minStockLevel') || 0);
    const tagsString = formData.get('tags') as string;
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!id) throw new Error('Product ID missing');

    try {
        await updateProductInDB(id, { name, description, sku, minStockLevel, tags });
        revalidatePath('/');
        revalidatePath('/stock');
        revalidatePath(`/product/${id}`);
        revalidatePath(`/product/${id}/edit`);
        revalidatePath('/settings/fix-data');
        return { ok: true };
    } catch (error: any) {
        console.error('Failed to update product:', error?.message || error);
        return { ok: false, error: error.message || 'UPDATE_PRODUCT_FAILED' };
    }
}


function parseLocationNames(input: string): string[] {
    // Split by new line and filter out empty lines
    const lines = input.split(/\r?\n/).filter(line => line.trim()); 
    
    return lines.flatMap(line => {
        const token = line.trim();
        // Pattern: Prefix-Start-End, e.g., "A-01-30" or "A01-30"
        const rangeMatch = token.match(/^(.*?)[-_]?(\d+)[-_](\d+)$/);
        if (rangeMatch) {
            const prefix = rangeMatch[1];
            const startStr = rangeMatch[2];
            const endStr = rangeMatch[3];
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);

            if (!isNaN(start) && !isNaN(end) && start <= end) {
                const names: string[] = [];
                const padding = startStr.length; // Assumes consistent padding
                for (let i = start; i <= end; i++) {
                    const paddedNumber = String(i).padStart(padding, '0');
                    names.push(prefix ? `${prefix}${paddedNumber}` : paddedNumber);
                }
                return names;
            }
        }
        // If no range pattern, treat as a single name
        return [token];
    });
}


export async function addLocation(formData: FormData) {
    const uid = await getUidFromSession();
    const nameInput = formData.get('name') as string;
    const type = formData.get('type') as 'warehouse' | 'corridor' | 'shelf';
    const parentId = formData.get('parentId') as string | undefined;

    const names = (type === 'warehouse') ? [nameInput.trim()] : parseLocationNames(nameInput);

    if (names.length === 0) {
        throw new Error("Lokasyon adı boş olamaz.");
    }
    
    if (type === 'warehouse' && names.length > 1) {
        throw new Error("Aynı anda yalnızca bir depo oluşturabilirsiniz.");
    }
    
    if (type !== 'warehouse' && !parentId) {
        throw new Error("Koridor veya Raf için üst lokasyon seçilmelidir.");
    }

    try {
        const locationsToAdd = names.map(name => ({
            name,
            type,
            parentId: type !== 'warehouse' ? parentId : undefined,
        }));
        await batchAddLocations(uid, locationsToAdd);
    } catch (error: any) {
       console.error("Failed to add location(s):", error.message);
       throw error;
    }
    
    revalidatePath('/locations');
}

export async function updateLocation(formData: FormData) {
    const uid = await getUidFromSession();
    const locationId = formData.get('locationId') as string;
    const name = formData.get('name') as string;

    if (!locationId || !name) {
        throw new Error("Location ID and name are required.");
    }

    try {
        await updateLocationNameInDB(uid, locationId, name);
    } catch (error: any) {
        console.error("Failed to update location:", error.message);
        throw error;
    }

    revalidatePath('/locations');
    redirect('/locations');
}


export async function deleteLocation(locationId: string) {
    const uid = await getUidFromSession();
    if (!locationId) {
        throw new Error("Location ID is required for deletion.");
    }

    try {
        const { deletedCount } = await deleteLocationAndChildren(uid, locationId);
        revalidatePath('/locations');
        return { success: true, message: `${deletedCount} lokasyon başarıyla silindi.` };
    } catch (error: any) {
        console.error("Failed to delete location(s):", error.message);
        // Don't throw, return a structured error for the client to handle
        return { success: false, message: error.message };
    }
}


export async function transferStock(formData: FormData) {
    const uid = await getUidFromSession();
    const productId = formData.get('productId') as string;
    const sourceLocationId = formData.get('sourceLocationId') as string;
    const destinationLocationId = formData.get('destinationLocationId') as string;
    const quantity = Number(formData.get('quantity'));

    try {
      await transferStockInDB(uid, productId, sourceLocationId, destinationLocationId, quantity);
    } catch(error: any) {
        console.error("Failed to transfer stock:", error.message);
        throw error;
    }

    revalidatePath('/stock');
    revalidatePath('/locations');
    revalidatePath(`/product/${productId}`);
}


export async function importProductsFromExcel(formData: FormData) {
    const uid = await getUidFromSession();
    const file = formData.get('excelFile') as File;
    if (!file) {
        throw new Error('Excel dosyası bulunamadı.');
    }

    const bytes = await file.arrayBuffer();
    const workbook = xlsx.read(bytes, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { raw: false }) as { StokKodu: string; Adi: string }[];

    if (!data || data.length === 0) {
        throw new Error('Excel dosyası boş veya formatı yanlış.');
    }

    const products: { id: string; name: string; sku: string;}[] = data.map(item => ({
        id: String(item.StokKodu).replace(/[^a-zA-Z0-9-]/g, '-'),
        sku: String(item.StokKodu),
        name: item.Adi,
    })).filter(p => p.id && p.name && p.sku); 

    if (products.length === 0) {
        throw new Error('Excel dosyasında geçerli ürün bulunamadı. StokKodu ve Adi sütunlarını kontrol edin.');
    }

    try {
        await batchAddProducts(uid, products);
    } catch (error: any) {
        console.error("Toplu ürün ekleme hatası:", error.message);
        throw error;
    }

}

export async function addEmailToMailingList(formData: FormData) {
    const uid = await getUidFromSession();
    const email = formData.get('email') as string;
    if (!email) {
        throw new Error("E-posta adresi boş olamaz.");
    }

    try {
        await addEmailToMailingListInDB(uid, email);
        revalidatePath('/settings');
    } catch (error: any) {
        console.error("Failed to add email:", error.message);
        throw error;
    }
}

export async function removeEmailFromMailingList(email: string) {
    const uid = await getUidFromSession();
    if (!email) {
        throw new Error("E-posta adresi boş olamaz.");
    }

    try {
        await removeEmailFromMailingListInDB(uid, email);
        revalidatePath('/settings');
    } catch (error: any) {
        console.error("Failed to remove email:", error.message);
        throw error;
    }
}

export async function fixSkusFromExcel(formData: FormData) {
    const uid = await getUidFromSession();
    const file = formData.get('excelFile') as File;
    if (!file) {
        throw new Error('Excel dosyası bulunamadı.');
    }

    const bytes = await file.arrayBuffer();
    const workbook = xlsx.read(bytes, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Use raw: false to get the formatted text, which is crucial for dotted numbers.
    const data = xlsx.utils.sheet_to_json(worksheet, { header: ["MevcutSKU", "YeniSKU", "UrunAdi"], raw: false, skipHeader: true }) as { MevcutSKU: string; YeniSKU: string; UrunAdi: string }[];
    
    if (!data || data.length === 0) {
        throw new Error('Excel dosyası boş veya formatı yanlış. "MevcutSKU" ve "YeniSKU" sütunlarını kontrol edin.');
    }
    
    const updates: { id: string, sku: string }[] = [];
    for (const item of data) {
        if (item.MevcutSKU && item.YeniSKU && item.MevcutSKU.trim() !== item.YeniSKU.trim()) {
            const productToUpdate = await findProductBySku(uid, String(item.MevcutSKU));
            if (productToUpdate) {
                updates.push({ id: productToUpdate.id, sku: String(item.YeniSKU) });
            } else {
                 console.warn(`Ürün bulunamadı (SKU): ${item.MevcutSKU}. Atlanıyor.`);
            }
        }
    }
    
    if (updates.length === 0) {
        return { success: true, message: 'Excel dosyasında güncellenecek yeni bir SKU bilgisi bulunamadı.' };
    }

    try {
        await batchUpdateSkus(uid, updates);
        revalidatePath('/stock');
        revalidatePath('/settings/fix-sku');
        revalidatePath('/settings/fix-data');
        return { success: true, message: `${updates.length} ürünün SKU\'su başarıyla güncellendi.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'Toplu SKU güncellenirken bir hata oluştu.' };
    }
}

// Purchase Order Actions
export async function createPurchaseOrder(
  items: Omit<PurchaseOrderItem, 'receivedQuantity' | 'remainingQuantity'>[],
  userInfo: { uid: string, email?: string, displayName?: string }
){
  const uid = await getUidFromSession();
  if (uid !== userInfo.uid) throw new Error('UNAUTHORIZED');

  try {
    if (!Array.isArray(items)) return { ok:false, error:'Ürün listesi yok' };

    // normalize + filtre (qty>0 ve sayısal)
    const clean = items.map(it => ({
      productId: String(it.productId||'').trim(),
      productName: String(it.productName||'').trim(),
      productSku: String(it.productSku||'').trim(),
      description: String(it.description ?? ''),
      quantity: Number(it.quantity)
    })).filter(it => it.productId && it.productName && it.productSku && Number.isFinite(it.quantity) && it.quantity > 0);

    if (clean.length===0) return { ok:false, error:'Siparişte adet > 0 olan ürün yok' };

    const result = await createPurchaseOrderInDB({ uid, userInfo, items: clean, status:'draft' });

     await recordOrderEvent({
        ownerUid: uid,
        orderId: result.id,
        type: 'created',
        actor: {
            uid: userInfo.uid,
            email: userInfo.email,
            displayName: userInfo.displayName,
            role: 'purchaser',
        },
        note: 'Sipariş oluşturuldu',
    });


    revalidatePath('/orders'); revalidatePath('/');
    return { ok:true, data: result };
  } catch (e:any) {
    console.error('CREATE_PO_ERROR:', e?.stack||e);
    // Firestore hata kodunu geçir
    return { ok:false, error: e?.message || 'CREATE_PO_FAILED', code: e?.code || null };
  }
}

export async function updatePurchaseOrder(formData: FormData) {
    const uid = await getUidFromSession();
    const orderId = formData.get('orderId') as string;
    const itemsJson = formData.get('items') as string;

    if (!orderId || !itemsJson) {
      throw new Error('Eksik bilgi: orderId ve items zorunludur.');
    }
    
    let items: PurchaseOrderItem[];
    try {
      items = JSON.parse(itemsJson);
    } catch {
      throw new Error('Geçersiz ürün formatı.');
    }

    if (!Array.isArray(items)) {
        throw new Error('Ürün listesi bir dizi olmalıdır.');
    }

    try {
        const orderRef = doc(getServerDb(), 'purchaseOrders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists() || orderSnap.data().uid !== uid) {
            throw new Error('Sipariş bulunamadı veya yetkiniz yok.');
        }

        const existingItemsMap = new Map(orderSnap.data().items.map((item: PurchaseOrderItem) => [item.productId, item]));

        const finalItems = items.map(item => {
            const existingItem = existingItemsMap.get(item.productId);
            const receivedQuantity = existingItem ? (Number(existingItem.receivedQuantity) || 0) : 0;
            const quantity = Number(item.quantity) || 0;
            return {
                ...item,
                quantity: quantity,
                receivedQuantity: receivedQuantity,
                remainingQuantity: Math.max(0, quantity - receivedQuantity),
            };
        });

        await updatePurchaseOrderInDB(orderId, uid, finalItems);
        
        revalidatePath('/orders');
        revalidatePath(`/orders/${orderId}`);

    } catch (e: any) {
        console.error('UPDATE_PO_ERROR:', e?.stack || e);
        throw new Error(e.message || 'Sipariş güncellenirken bir hata oluştu.');
    }
}


export async function receivePurchaseOrderItem(formData: FormData) {
  console.log("FIREBASE_SERVICE_ACCOUNT_KEY exists?", !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  console.log("FIREBASE_SERVICE_ACCOUNT_KEY len:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length ?? 0);
  const db = adminDb(); // ✅ admin firestore
  const uid = await getUidFromSession();
  const user = await adminAuth().getUser(uid);

  const orderId = formData.get('orderId') as string;
  const productId = formData.get('productId') as string;
  const receivedQuantity = Number(formData.get('receivedQuantity'));
  const locationId = formData.get('locationId') as string;

  if (!orderId || !productId || !receivedQuantity || !locationId) {
    throw new Error('Eksik bilgi: Sipariş ID, Ürün ID, Miktar ve Lokasyon zorunludur.');
  }

  const result = await db.runTransaction(async (tx) => {
    const orderRef = db.collection('purchaseOrders').doc(orderId);
    const orderSnap = await tx.get(orderRef);

    if (!orderSnap.exists) {
      throw new Error('Sipariş bulunamadı.');
    }

    const order: any = orderSnap.data();
    if (order.uid !== uid) {
      throw new Error('Sipariş bulunamadı veya bu işlem için yetkiniz yok.');
    }

    const oldStatus = order.status;
    const itemIndex = order.items.findIndex((it: any) => it.productId === productId);
    if (itemIndex === -1) throw new Error('Sipariş içinde ürün bulunamadı.');

    const item = order.items[itemIndex];

    if (receivedQuantity > Number(item.remainingQuantity || 0)) {
      throw new Error(
        `Teslim alınan miktar (${receivedQuantity}), kalan miktardan (${item.remainingQuantity}) fazla olamaz.`
      );
    }

    const newReceived = Number(item.receivedQuantity || 0) + receivedQuantity;
    const newRemaining = Number(item.quantity || 0) - newReceived;

    order.items[itemIndex].receivedQuantity = newReceived;
    order.items[itemIndex].remainingQuantity = newRemaining;

    const allItemsReceived = order.items.every((i: any) => Number(i.remainingQuantity || 0) <= 0);
    const someItemsReceived = order.items.some((i: any) => Number(i.receivedQuantity || 0) > 0);

    let newStatus = order.status;
    if (allItemsReceived) newStatus = 'received';
    else if (someItemsReceived) newStatus = 'partially-received';

    // ✅ order update
    tx.update(orderRef, { items: order.items, status: newStatus });

    // ✅ stockItems upsert (uid + productId + locationId)
    const stockQuery = db
      .collection('stockItems')
      .where('uid', '==', uid)
      .where('productId', '==', productId)
      .where('locationId', '==', locationId);

    const stockSnap = await tx.get(stockQuery);

    if (stockSnap.empty) {
      const newStockRef = db.collection('stockItems').doc();
      tx.set(newStockRef, { uid, productId, locationId, quantity: receivedQuantity });
    } else {
      const doc0 = stockSnap.docs[0];
      const currentQty = Number(doc0.data().quantity || 0);
      tx.update(doc0.ref, { quantity: currentQty + receivedQuantity });
    }

    // ✅ stockMovements insert
    const moveRef = db.collection('stockMovements').doc();
    tx.set(moveRef, {
      uid,
      productId,
      locationId,
      type: 'in',
      quantity: receivedQuantity,
      date: FieldValue.serverTimestamp(),
      userId: user.displayName || user.email || uid,
      description: `Sipariş #${order.orderNumber} teslimatı`,
    });

    return { newStatus, oldStatus, item };
  });

  const { newStatus, oldStatus, item } = result;

    if (newStatus !== oldStatus) {
        await recordOrderEvent({
            ownerUid: uid,
            orderId,
            type: 'status-changed',
            actor: { uid, email: user.email, displayName: user.displayName, role: 'warehouse' },
            fromStatus: oldStatus,
            toStatus: newStatus,
            note: 'Mal kabul ile durum değişti'
        });
    }

    await recordOrderEvent({
        ownerUid: uid,
        orderId,
        type: newStatus === 'received' ? 'item-received' : 'item-partially-received',
        actor: { uid, email: user.email, displayName: user.displayName, role: 'warehouse' },
        itemId: productId,
        productSku: item.productSku,
        quantity: receivedQuantity,
        note: `Mal kabul: ${receivedQuantity} adet alındı`
    });


    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath(`/product/${productId}`);
    revalidatePath('/stock');
    revalidatePath('/');
}

// User Management Actions

type RegisterParams = {
  displayName: string;
  email: string;
  password: string;
};

export async function registerUserWithRole({
  displayName,
  email,
  password,
}: RegisterParams): Promise<{ userCredential: any, role: 'admin' | 'user' }> {
  // 1) Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  const db = getServerDb();

  // 2) Check if any user exists in Firestore
  const usersRef = collection(db, 'users');
  let role: 'admin' | 'user' = 'user';
  
  // This check must be done with admin privileges if security rules are restrictive
  try {
    const q = query(usersRef, limit(2)); // Check for more than one to be safe
    const snap = await getDocs(q);
    if (snap.docs.length === 0) { // This will be the first document
      role = 'admin';
    }
  } catch (e) {
    console.warn("Could not check for existing users, defaulting to 'user' role. This might happen due to security rules.", e);
  }


  // 4) If admin, set custom claim via Admin SDK
  if (role === 'admin') {
      try {
        await adminAuth().setCustomUserClaims(uid, { role: 'admin' });
      } catch (error) {
          console.error("Failed to set admin custom claim:", error);
          // Rollback Auth user creation if claim fails
          await userCredential.user.delete();
          throw new Error("Failed to assign admin role. Please try again.");
      }
  }

  // 5) Save user info to Firestore
  await setDoc(doc(usersRef, uid), {
    uid,
    displayName,
    email,
    role,
    createdAt: serverTimestamp(),
  });
  
  await updateProfile(userCredential.user, { displayName });

  // Return credential and role
  return { userCredential, role };
}


export async function updateUserDisplayName(userId: string, displayName: string) {
    if (!userId || !displayName) {
        throw new Error("Kullanıcı ID ve Ad Soyad zorunludur.");
    }
    const uid = await getUidFromSession();
    const { isAdmin } = await verifyAdminRole(cookies().get('session')?.value);
    if(uid !== userId && !isAdmin) {
       throw new Error("UNAUTHORIZED");
    }

    try {
        await updateUserDisplayNameInDB(userId, displayName);
        revalidatePath('/settings/users');
    } catch (error: any) {
        console.error("Failed to update user display name:", error.message);
        throw error;
    }
}
async function verifyAdminRole(sessionCookie?: string | null): Promise<{ isAdmin: boolean, uid: string | null }> {
    if (!sessionCookie) {
        return { isAdmin: false, uid: null };
    }
    try {
        const uid = await getUidFromSession(); // Uses the same logic to decode session
        const db = adminDb();
        if (!db) return { isAdmin: false, uid: uid };

        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data()?.role === 'admin') {
            return { isAdmin: true, uid };
        }
        return { isAdmin: false, uid };
    } catch (err) {
        console.error('verifyAdminRole error', err);
        return { isAdmin: false, uid: null };
    }
}

    