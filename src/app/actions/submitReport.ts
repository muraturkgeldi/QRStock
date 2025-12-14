
'use server';

import { adminDb } from '@/lib/admin.server';
import type { ReportKind } from '@/utils/reportId';
import admin from 'firebase-admin';

export type ReportSignatureKind = 'SUBMISSION' | 'APPROVAL' | 'REJECTION';

export type SubmitReportInput = {
  reportId: string;
  reportType: ReportKind;
  dataHash: string;              // SHA-256 string
  submittedByUserId: string;
  submittedByName?: string;
  // İstersen özet bilgi, row sayısı vs. koyarsın:
  meta?: {
    rowCount?: number;
    warehouseId?: string;
    date?: string; // YYYY-MM-DD
  };
};

export async function submitReport(input: SubmitReportInput) {
  const db = adminDb();
  if (!db) {
    throw new Error('Veritabanı bağlantısı kurulamadı.');
  }
  const { reportId, reportType, dataHash, submittedByUserId, submittedByName, meta } = input;

  if (!reportId || !reportType || !dataHash || !submittedByUserId) {
    throw new Error('Eksik alan: reportId, reportType, dataHash, submittedByUserId zorunlu.');
  }

  const docRef = db.collection('reportApprovals').doc(reportId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const now = admin.firestore.FieldValue.serverTimestamp();

    let lastRevision = 0;
    if (snap.exists) {
      const data = snap.data() as any;
      lastRevision = Number(data.lastRevision || 0);
    }

    const nextRevision = lastRevision + 1;
    const sigRef = docRef
      .collection('signatures')
      .doc(nextRevision.toString().padStart(4, '0'));

    // parent doküman
    tx.set(
      docRef,
      {
        reportId,
        type: reportType,
        lastRevision: nextRevision,
        lastStatus: 'SUBMISSION',
        lastHash: dataHash,
        lastUpdatedAt: now,
        lastUpdatedBy: submittedByUserId,
        lastUpdatedByName: submittedByName || null,
        meta: meta || admin.firestore.FieldValue.delete(), // yoksa temizle
        createdAt: snap.exists ? (snap.data() as any).createdAt ?? now : now,
      },
      { merge: true }
    );

    // revision / signature dokümanı
    tx.set(sigRef, {
      revision: nextRevision,
      kind: 'SUBMISSION' as ReportSignatureKind,
      dataHash,
      createdAt: now,
      userId: submittedByUserId,
      userName: submittedByName || null,
      note: null,
    });
  });
}
