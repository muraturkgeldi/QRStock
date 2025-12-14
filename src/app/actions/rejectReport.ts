
'use server';

import { adminDb as getAdminDb } from '@/lib/admin.server';
import admin from 'firebase-admin';
import type { ReportSignatureKind } from './submitReport';

export type RejectReportInput = {
  reportId: string;
  dataHash: string;
  rejectedByUserId: string;
  rejectedByName?: string;
  reason: string; // Neden reddedildi
};

export async function rejectReport(input: RejectReportInput) {
  const db = getAdminDb();
   if (!db) {
    throw new Error('Veritabanı bağlantısı kurulamadı.');
  }
  const { reportId, dataHash, rejectedByUserId, rejectedByName, reason } = input;

  if (!reportId || !dataHash || !rejectedByUserId || !reason) {
    throw new Error('Eksik alan: reportId, dataHash, rejectedByUserId, reason zorunlu.');
  }

  const docRef = db.collection('reportApprovals').doc(reportId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      throw new Error(`Rapor bulunamadı: ${reportId}`);
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const current = snap.data() as any;
    const lastRevision = Number(current.lastRevision || 0);
    const nextRevision = lastRevision + 1;

    const sigRef = docRef
      .collection('signatures')
      .doc(nextRevision.toString().padStart(4, '0'));

    tx.set(
      docRef,
      {
        lastRevision: nextRevision,
        lastStatus: 'REJECTION',
        lastHash: dataHash,
        lastUpdatedAt: now,
        lastUpdatedBy: rejectedByUserId,
        lastUpdatedByName: rejectedByName || null,
      },
      { merge: true }
    );

    tx.set(sigRef, {
      revision: nextRevision,
      kind: 'REJECTION' as ReportSignatureKind,
      dataHash,
      createdAt: now,
      userId: rejectedByUserId,
      userName: rejectedByName || null,
      reason,
    });
  });
}
