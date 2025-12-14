
'use server';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { parseReportId } from '@/utils/reportId';
import {
  buildDailyReceivingReportData,
  type DailyReceivingRow,
} from './exportDailyReceivingExcel';

export async function exportDailyReceivingPdf(
  reportId: string
): Promise<Uint8Array> {
  const parsed = parseReportId(reportId);
  if (!parsed || parsed.kind !== 'DAILY_RECEIVING') {
    throw new Error('Geçersiz DAILY_RECEIVING reportId');
  }

  const { meta, rows } = await buildDailyReceivingReportData(parsed);

  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]); // A4 portrait (pt)
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let x = margin;
  let y = page.getHeight() - margin;

  const title = `GÜNLÜK TESLİM ALMA RAPORU (${meta.date})`;
  page.drawText(title, {
    x,
    y,
    font: bold,
    size: 14,
  });

  y -= 24;
  page.drawText(`Depo: ${meta.warehouseId}`, { x, y, font, size: 10 });
  y -= 14;
  page.drawText(`Tedarikçi: ${meta.supplierKey}`, { x, y, font, size: 10 });
  y -= 20;

  // Header
  const header = [
    'PO',
    'GRN',
    'Stok',
    'Ürün',
    'Sipariş',
    'Teslim',
    'Kalan',
  ];

  const colWidths = [60, 60, 60, 140, 50, 50, 50];
  const headerHeight = 14;
  const rowHeight = 12;

  // Header bg
  page.drawRectangle({
    x,
    y: y - headerHeight + 3,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: headerHeight,
    color: rgb(0.95, 0.95, 0.95),
  });

  let colX = x;
  for (let i = 0; i < header.length; i++) {
    page.drawText(header[i], {
      x: colX + 2,
      y: y,
      font: bold,
      size: 8,
    });
    colX += colWidths[i];
  }

  y -= headerHeight + 4;

  const drawRow = (r: DailyReceivingRow) => {
    const cells = [
      r.poNumber,
      r.grnId,
      r.sku,
      r.productName,
      r.orderedQty.toString(),
      r.receivedQty.toString(),
      r.remainingQty.toString(),
    ];

    let cx = x;
    for (let i = 0; i < cells.length; i++) {
      const text = cells[i] ?? '';
      page.drawText(text.length > 20 ? text.slice(0, 20) + '…' : text, {
        x: cx + 2,
        y,
        font,
        size: 7,
      });
      cx += colWidths[i];
    }
  };

  for (const r of rows) {
    if (y < margin + rowHeight) {
      // Yeni sayfa
      const newPage = doc.addPage([595.28, 841.89]);
      y = newPage.getHeight() - margin;
      x = margin;
      page = newPage;
    }
    drawRow(r);
    y -= rowHeight;
  }

  const bytes = await doc.save();
  return bytes;
}
