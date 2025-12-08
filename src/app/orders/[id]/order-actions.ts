'use server';

import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getServerDb } from '@/lib/firestore.server';
import { verifyAdminRole, verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';


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

// 2) Siparişi iptal et
export async function cancelOrderAction(orderId: string, reason?: string) {
  const user = await requireUser();
  const db = getServerDb();
  const ref = doc(db, 'purchaseOrders', orderId);

  await updateDoc(ref, {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    cancelledByUid: user.uid,
    cancelReason: (reason ?? '').trim(),
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { ok: true };
}

// 3) Siparişi tamamen sil
export async function deleteOrderAction(orderId: string) {
  const user = await requireUser();
  const db = getServerDb();
  const ref = doc(db, 'purchaseOrders', orderId);

  // İstersen burada önce doc'u okuyup status !== 'received' ise sil,
  // yoksa hata fırlat (tamamlanan sipariş silinmesin).
  await deleteDoc(ref);
  revalidatePath('/orders');
  return { ok: true, deleted: true };
}
