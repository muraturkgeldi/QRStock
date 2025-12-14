
'use server';

import { adminDb } from '@/lib/admin.server';
import { parseReportId, type ReceivingReportIdParts } from '@/utils/reportId';
import admin from 'firebase-admin';

export type DailyReceivingRow = {
  date: string;              // YYYY-MM-DD
  warehouseId: string;
  supplierKey: string;
  poNumber: string;
  grnId: string;
  sku: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  unit?: string;
  receivedAt: Date;
  receivedByUserId: string;
};

export type DailyReceivingReportMeta = {
  reportId: string;
  date: string;
  warehouseId: string;
  supplierKey: string;
  poKey: string;
  rowCount: number;
};

export type DailyReceivingReportData = {
  meta: DailyReceivingReportMeta;
  rows: DailyReceivingRow[];
};

/**
 * Shared data builder – PDF de bunu kullanacak.
 * TODO: GRN koleksiyon isimlerini kendi şemana göre uyarlayacaksın.
 */
export async function buildDailyReceivingReportData(
  parsed: ReceivingReportIdParts
): Promise<DailyReceivingReportData> {
  const db = adminDb();
  if (!db) {
    throw new Error('Veritabanı bağlantısı kurulamadı.');
  }

  const { date, warehouseKey, supplierKey, poKey } = parsed;

  // ÖRNEK şema: goodsReceipts collection + lines subcollection.
  // Burası tamamen senin Firestore yapına göre düzenlenecek.
  const grnSnap = await db
    .collection('goodsReceipts')
    .where('date', '==', date) // YYYY-MM-DD string alan bir field varsayımı
    .where('warehouseId', '==', warehouseKey === 'ALL' ? warehouseKey : warehouseKey)
    .get();

  const rows: DailyReceivingRow[] = [];

  for (const doc of grnSnap.docs) {
    const grn = doc.data() as any;
    const linesSnap = await doc.ref.collection('lines').get();

    for (const line of linesSnap.docs) {
      const l = line.data() as any;

      // Filtre: supplier / po optional
      if (supplierKey !== 'ALL' && (l.supplierKey || '').toUpperCase() !== supplierKey) {
        continue;
      }
      if (poKey !== 'ALL' && (l.poNumber || '').toUpperCase() !== poKey) {
        continue;
      }

      const orderedQty = Number(l.orderedQty ?? 0);
      const receivedQty = Number(l.receivedQty ?? 0);

      rows.push({
        date,
        warehouseId: grn.warehouseId || warehouseKey,
        supplierKey: (l.supplierKey || '').toUpperCase(),
        poNumber: (l.poNumber || '').toString(),
        grnId: doc.id,
        sku: (l.sku || '').toString(),
        productName: (l.productName || '').toString(),
        orderedQty,
        receivedQty,
        remainingQty: orderedQty - receivedQty,
        unit: l.unit || '',
        receivedAt:
          grn.receivedAt && typeof grn.receivedAt.toDate === 'function'
            ? grn.receivedAt.toDate()
            : new Date(),
        receivedByUserId: grn.receivedByUserId || 'UNKNOWN',
      });
    }
  }

  const meta: DailyReceivingReportMeta = {
    reportId: [
      'DAILY_RECEIVING',
      parsed.date,
      `WHS:${parsed.warehouseKey}`,
      `SUP:${parsed.supplierKey}`,
      `PO:${parsed.poKey}`,
    ].join('|'),
    date,
    warehouseId: parsed.warehouseKey,
    supplierKey: parsed.supplierKey,
    poKey: parsed.poKey,
    rowCount: rows.length,
  };

  return { meta, rows };
}

/**
 * Excel = CSV çıktısı.
 * Client bu string’i alıp Blob + download yapabilir.
 */
export async function exportDailyReceivingExcel(reportId: string): Promise<string> {
  const parsed = parseReportId(reportId);
  if (!parsed || parsed.kind !== 'DAILY_RECEIVING') {
    throw new Error('Geçersiz DAILY_RECEIVING reportId');
  }

  const { meta, rows } = await buildDailyReceivingReportData(parsed);

  const header = [
    'Tarih',
    'Depo',
    'Tedarikçi',
    'Sipariş No',
    'GRN No',
    'Stok Kodu',
    'Ürün Adı',
    'Sipariş Miktarı',
    'Teslim Alınan',
    'Kalan Birim',
    'Birim',
    'Teslim Alan Kullanıcı',
    'Teslim Alma Tarihi',
  ];

  const lines: string[] = [];
  lines.push(header.join(';'));

  for (const r of rows) {
    lines.push(
      [
        meta.date,
        r.warehouseId,
        r.supplierKey,
        r.poNumber,
        r.grnId,
        r.sku,
        r.productName,
        r.orderedQty.toString().replace('.', ','),
        r.receivedQty.toString().replace('.', ','),
        r.remainingQty.toString().replace('.', ','),
        r.unit || '',
        r.receivedByUserId,
        r.receivedAt.toISOString(), // ya da locale string
      ].join(';')
    );
  }

  return lines.join('\n');
}
