
'use server';

import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getServerDb } from '@/lib/firestore.server';
import { verifyAdminRole, verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';


// Basit “kullanıcı zorunlu” helper
async function requireUser() {
  const user = await verifyFirebaseToken();
  if (!user || !user.uid) {
    throw new Error('Bu işlemi yapmak için giriş yapmalısınız.');
  }
  return user;
}


// 1) Sipariş üst bilgisini güncelle (not vs.)
export async function updateOrderMetaAction(
  orderId: string,
  patch: { note?: string; supplierName?: string }
) {
  const user = await requireUser();
  const db = getServerDb();

  const ref = doc(db, 'purchaseOrders', orderId);

  const dataToSet: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedByUid: user.uid,
  };

  if (typeof patch.note === 'string') {
    dataToSet.internalNote = patch.note.trim();
  }

  if (typeof patch.supplierName === 'string') {
    dataToSet.supplierName = patch.supplierName.trim();
  }

  await updateDoc(ref, dataToSet);
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// 2) Siparişi iptal et (status: 'cancelled')
export async function cancelOrderAction(orderId: string, reason?: string) {
  const user = await requireUser();
  const db = getServerDb();
  const ref = doc(db, 'purchaseOrders', orderId);

  await updateDoc(ref, {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    cancelledByUid: user.uid,
    cancelReason: (reason ?? '').trim(),
    updatedAt: serverTimestamp(),
    updatedByUid: user.uid,
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { ok: true };
}


// 3) Arşive alma (soft delete) - Artık sadece login yeterli
export async function archiveOrderAction(orderId: string) {
  const user = await requireUser();
  const db = getServerDb();
  const ref = doc(db, 'purchaseOrders', orderId);

  await updateDoc(ref, {
    status: 'archived',
    archivedAt: serverTimestamp(),
    archivedByUid: user.uid,
    updatedAt: serverTimestamp(),
    updatedByUid: user.uid,
  });
  
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { ok: true };
}


// 4) Kalıcı silme - Artık sadece login yeterli
export async function hardDeleteOrderAction(orderId: string) {
  const user = await requireUser();
  
  // Önceki admin kontrolü kaldırıldı.
  // if (!isAdmin) {
  //   throw new Error('Siparişi kalıcı silmek için yönetici yetkisi gereklidir.');
  // }

  const db = getServerDb();
  await deleteDoc(doc(db, 'purchaseOrders', orderId));
  revalidatePath('/orders');
  return { ok: true, deleted: true };
}
