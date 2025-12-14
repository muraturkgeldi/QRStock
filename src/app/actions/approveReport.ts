
'use server';

import { adminDb } from '@/lib/admin.server';
import admin from 'firebase-admin';
import type { ReportSignatureKind } from './submitReport';

export type ApproveReportInput = {
  reportId: string;
  dataHash: string;          // Onaylanan data hash’i (client ile senkron)
  approvedByUserId: string;
  approvedByName?: string;
  note?: string;
};

export async function approveReport(input: ApproveReportInput) {
  const db = adminDb();
  if (!db) {
    throw new Error('Veritabanı bağlantısı kurulamadı.');
  }
  const { reportId, dataHash, approvedByUserId, approvedByName, note } = input;

  if (!reportId || !dataHash || !approvedByUserId) {
    throw new Error('Eksik alan: reportId, dataHash, approvedByUserId zorunlu.');
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
        lastStatus: 'APPROVAL',
        lastHash: dataHash,
        lastUpdatedAt: now,
        lastUpdatedBy: approvedByUserId,
        lastUpdatedByName: approvedByName || null,
      },
      { merge: true }
    );

    tx.set(sigRef, {
      revision: nextRevision,
      kind: 'APPROVAL' as ReportSignatureKind,
      dataHash,
      createdAt: now,
      userId: approvedByUserId,
      userName: approvedByName || null,
      note: note || null,
    });
  });
}
