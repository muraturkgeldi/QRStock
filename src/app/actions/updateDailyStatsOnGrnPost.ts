
'use server';

import { adminDb } from '@/lib/admin.server';
import admin from 'firebase-admin';

export type UpdateDailyStatsOnGrnPostInput = {
  warehouseId: string;         // WHS1 vs.
  date: string | Date;         // GRN tarihi (gün bazlı)
  totalLines: number;          // bu GRN’deki satır sayısı
  totalReceivedQty: number;    // bu GRN’de toplam alınan miktar
};

function toDateKey(d: string | Date): string {
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return new Date(d).toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * GRN oluşturulduktan sonra çağır:
 * await updateDailyStatsOnGrnPost({ ... })
 */
export async function updateDailyStatsOnGrnPost(
  input: UpdateDailyStatsOnGrnPostInput
) {
  const db = adminDb();
  if (!db) {
    throw new Error('Veritabanı bağlantısı kurulamadı.');
  }
  const dateKey = toDateKey(input.date);
  const whs = input.warehouseId || 'ALL';
  const docId = `${dateKey}_${whs}`;

  const ref = db.collection('dailyStats').doc(docId);

  await ref.set(
    {
      date: dateKey,
      warehouseId: whs,
      receivingCount: admin.firestore.FieldValue.increment(1),
      receivingLineCount: admin.firestore.FieldValue.increment(
        input.totalLines || 0
      ),
      receivingQtyTotal: admin.firestore.FieldValue.increment(
        input.totalReceivedQty || 0
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
