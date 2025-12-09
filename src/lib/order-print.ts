
'use client';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PurchaseOrder } from '@/lib/types';

export async function exportPurchaseOrderPdf(order: PurchaseOrder) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = height - margin;

  const drawText = (
    text: string,
    options: { size?: number; bold?: boolean } = {},
  ) => {
    const size = options.size ?? 10;
    const f = options.bold ? bold : font;
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: f,
      color: rgb(0, 0, 0),
    });
    y -= size + 6;
  };

  // Başlık
  drawText('SATIN ALMA SIPARIS FORMU', { size: 16, bold: true });
  y -= 10;

  // Temel bilgiler
  drawText(`Sipariş No: ${order.orderNumber || order.id}`, { bold: true });
  drawText(
    `Durum: ${order.status || '-'}`,
  );
  if (order.orderDate) {
    const d =
      typeof (order as any).orderDate?.toDate === 'function'
        ? (order as any).orderDate.toDate()
        : new Date(order.orderDate as any);
    if (!Number.isNaN(d.getTime())) {
      drawText(`Tarih: ${d.toLocaleString('tr-TR')}`);
    }
  }
  if (order.createdBy) {
    drawText(
      `Oluşturan: ${
        order.createdBy.displayName ||
        order.createdBy.email ||
        order.createdBy.uid
      }`,
    );
  }

  y -= 10;
  drawText('Sipariş Kalemleri', { bold: true });
  y -= 4;

  // Basit tablo başlığı
  const headerY = y;
  page.drawText('Stok Kodu', {
    x: margin,
    y: headerY,
    size: 9,
    font: bold,
  });
  page.drawText('Ürün Adı', {
    x: margin + 120,
    y: headerY,
    size: 9,
    font: bold,
  });
  page.drawText('Adet', {
    x: width - margin - 40,
    y: headerY,
    size: 9,
    font: bold,
  });
  y = headerY - 12;

  // Satırlar
  for (const item of order.items ?? []) {
    if (y < margin + 40) {
      // Yeni sayfaya geç
      y = height - margin;
    }

    page.drawText(item.productSku || '-', {
      x: margin,
      y,
      size: 9,
      font,
    });
    page.drawText(item.productName || '-', {
      x: margin + 120,
      y,
      size: 9,
      font,
    });
    page.drawText(String(item.quantity ?? '-'), {
      x: width - margin - 40,
      y,
      size: 9,
      font,
    });

    y -= 12;

    if (item.description) {
      page.drawText(`Not: ${item.description}`, {
        x: margin + 20,
        y,
        size: 8,
        font,
      });
      y -= 12;
    }
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${order.orderNumber || order.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
