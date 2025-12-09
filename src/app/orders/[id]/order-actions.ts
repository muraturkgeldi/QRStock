
'use server';

import { doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getServerDb } from '@/lib/firestore.server';
import { verifyAdminRole, verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';


// Sadece login kontrolü
async function requireAuth() {
  const user = await verifyFirebaseToken();
  if (!user || !user.uid) {
    throw new Error('Bu işlemi yapmak için giriş yapmalısınız.');
  }
  
  // We need the roles, so we fetch them here
  const { isAdmin } = await verifyAdminRole(cookies().get('session')?.value);

  return { uid: user.uid, isAdmin };
}

// Admin kontrolü
async function requireAdmin() {
  const { uid, isAdmin } = await requireAuth();
  if (!isAdmin) {
    throw new Error('Bu işlemi yapmak için admin yetkisi gerekiyor.');
  }
  return { uid };
}

// 🟡 ARŞİVLE – user kendi siparişini, admin herkesinkini arşivleyebilir
export async function archiveOrderAction(orderId: string) {
  const { uid, isAdmin } = await requireAuth();
  const db = getServerDb();

  const ref = doc(db, 'purchaseOrders', orderId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Sipariş bulunamadı.');
  }

  const data = snap.data() as any;

  // createdBy sahası varsa kontrol et
  if (data.uid && data.uid !== uid && !isAdmin) {
    throw new Error('Bu siparişi yalnızca oluşturan veya admin arşivleyebilir.');
  }

  await updateDoc(ref, {
    status: 'archived',
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { ok: true };
}

// 🔴 KALICI SİL – sadece admin
export async function hardDeleteOrderAction(orderId: string) {
  const { uid } = await requireAdmin();
  const db = getServerDb();

  const ref = doc(db, 'purchaseOrders', orderId);
  await deleteDoc(ref);
  revalidatePath('/orders');
  return { ok: true, deleted: true };
}


// 1) Sipariş üst bilgisini güncelle (not vs.)
export async function updateOrderMetaAction(
  orderId: string,
  patch: { note?: string; supplierName?: string }
) {
  const { uid } = await requireAuth();
  const db = getServerDb();

  const ref = doc(db, 'purchaseOrders', orderId);

  const dataToSet: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
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
  const { uid } = await requireAuth();
  const db = getServerDb();
  const ref = doc(db, 'purchaseOrders', orderId);

  await updateDoc(ref, {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    cancelledByUid: uid,
    cancelReason: (reason ?? '').trim(),
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { ok: true };
}
