
'use server';

import { doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getServerDb } from '@/lib/firestore.server';
import { verifyAdminRole, verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { canArchiveOrder, canHardDeleteOrder, type UserContext } from '@/lib/permissions';
import type { PurchaseOrder } from '@/lib/types';


// Sadece login kontrolü
async function requireAuth() {
  const token = cookies().get('session')?.value;
  if (!token) {
    throw new Error('Bu işlemi yapmak için giriş yapmalısınız.');
  }

  // We need the roles, so we fetch them here
  const { isAdmin, uid } = await verifyAdminRole(token);
  if (!uid) {
    throw new Error('Geçersiz oturum bilgisi.');
  }

  const role: UserContext['role'] = isAdmin ? 'admin' : 'purchaser'; // Default to purchaser for now
  
  const userContext: UserContext = {
    uid,
    role,
    department: null,
  };

  return { db: getServerDb(), user: userContext };
}


// 🟡 ARŞİVLE – user kendi siparişini, admin herkesinkini arşivleyebilir
export async function archiveOrderAction(orderId: string) {
  const { db, user } = await requireAuth();
  const ref = doc(db, 'purchaseOrders', orderId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Sipariş bulunamadı.');
  }

  const order = snap.data() as PurchaseOrder;

  if (!canArchiveOrder(user, order)) {
    throw new Error('Bu siparişi arşivlemek için yetkiniz yok.');
  }

  await updateDoc(ref, {
    status: 'archived',
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedByUid: user.uid,
    archivedByUid: user.uid,
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { ok: true };
}

// 🔴 KALICI SİL – sadece admin
export async function hardDeleteOrderAction(orderId: string) {
  const { db, user } = await requireAuth();
  const ref = doc(db, 'purchaseOrders', orderId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Already deleted, do nothing
    revalidatePath('/orders');
    return { ok: true, deleted: true };
  }

  if (!canHardDeleteOrder(user, snap.data() as PurchaseOrder)) {
    throw new Error('Siparişi kalıcı olarak silmek için yönetici yetkiniz bulunmuyor.');
  }
  
  await deleteDoc(ref);
  revalidatePath('/orders');
  return { ok: true, deleted: true };
}


// 1) Sipariş üst bilgisini güncelle (not vs.)
export async function updateOrderMetaAction(
  orderId: string,
  patch: { note?: string; supplierName?: string }
) {
  const { db, user } = await requireAuth();

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
  const { db, user } = await requireAuth();
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
