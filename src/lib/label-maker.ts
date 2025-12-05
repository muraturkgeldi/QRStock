'use client';

import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';

// --- Types ---
export const LABEL_SIZES = {
  '30x60': { w: 60, h: 30 },
  '75x100': { w: 100, h: 75 },
} as const;

export const PAGE_SIZES = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
} as const;

export type LabelSizeKey = keyof typeof LABEL_SIZES;
export type PageSizeKey = keyof typeof PAGE_SIZES;

export type LabelSpec = {
  title: string;
  sku?: string;
  qrValue: string;
};

// --- PDF helpers ---
const mmToPt = (mm: number) => (mm * 72) / 25.4;

function normalizeTrToAscii(input: string | undefined | null): string {
    if (!input) return '';
    const map: Record<string, string> = {
        'ı': 'i', 'İ': 'I', 'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U',
        'ş': 's', 'Ş': 'S', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
    };
    return input.split('').map(ch => map[ch] ?? ch).join('');
}


let logoPngBytes: Uint8Array | null = null;
async function getLogoBytes(): Promise<Uint8Array | null> {
    if (logoPngBytes) return logoPngBytes;
    try {
        const res = await fetch('/logo.png'); // assuming logo is in public folder
        if (!res.ok) throw new Error('Logo fetch failed');
        const buf = await res.arrayBuffer();
        logoPngBytes = new Uint8Array(buf);
        return logoPngBytes;
    } catch (e) {
        console.warn('Could not load logo.png from /public folder.', e);
        return null;
    }
}


const qrCache = new Map<string, string>();
async function getQrDataUrl(text: string): Promise<string> {
    const safeText = normalizeTrToAscii(text);
    if (qrCache.has(safeText)) {
        return qrCache.get(safeText)!;
    }
    try {
        const url = await QRCode.toDataURL(safeText, { margin: 1, scale: 4, errorCorrectionLevel: 'M' });
        qrCache.set(safeText, url);
        return url;
    } catch (err) {
        console.error("Failed to generate QR code for:", safeText, err);
        return '';
    }
}


async function drawLabelContent(
  doc: PDFDocument,
  page: PDFPage,
  box: { x: number; y: number; w: number; h: number },
  item: LabelSpec,
  isBig: boolean
) {
    const { x, y, w, h } = box;
    const pad = mmToPt(1.5);
    const borderWidth = isBig ? 1.3 : 1.0;

    page.drawRectangle({
        x: x + borderWidth / 2,
        y: y + borderWidth / 2,
        width: w - borderWidth,
        height: h - borderWidth,
        borderColor: rgb(0, 0, 0),
        borderWidth: borderWidth,
    });

    const innerX = x + pad;
    const innerW = w - (pad * 2);

    const qrSize = mmToPt(isBig ? 22 : 17);
    const qrX = x + w - pad - qrSize;
    const qrY = y + (h - qrSize) / 2;

    const qrDataUrl = await getQrDataUrl(item.qrValue);
    if (qrDataUrl) {
        const qrImage = await doc.embedPng(qrDataUrl);
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    }
    
    const safeName = normalizeTrToAscii(item.title);
    const safeSku = normalizeTrToAscii(item.sku);
    
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    
    const nameSize = isBig ? 10 : 8;
    const nameLineHeight = isBig ? 12 : 10;
    const skuSize = isBig ? 8 : 7;
    
    const textX = innerX;
    const textW = innerW - qrSize - (pad * 2);
    let currentY = y + h - pad - mmToPt(3);

    const words = safeName.split(' ');
    let line = '';
    const lines: string[] = [];

    for (const word of words) {
        const testLine = line.length > 0 ? `${line} ${word}` : word;
        const width = boldFont.widthOfTextAtSize(testLine, nameSize);
        if (width > textW && line.length > 0) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);

    for (const textLine of lines.slice(0, 2)) {
        page.drawText(textLine, {
            x: textX,
            y: currentY,
            font: boldFont,
            size: nameSize,
            maxWidth: textW,
        });
        currentY -= nameLineHeight;
    }
    
    if (safeSku) {
        currentY -= 2;
        page.drawText(safeSku, {
            x: textX,
            y: currentY,
            font: font,
            size: skuSize,
            maxWidth: textW,
        });
    }

    const logoBytes = await getLogoBytes();
    if (logoBytes) {
      const logo = await doc.embedPng(logoBytes);
      const logoH = mmToPt(isBig ? 6 : 5);
      const logoW = logoH * logo.width / logo.height;
      page.drawImage(logo, { x: x + pad, y: y + pad, width: logoW, height: logoH });
    }
}


function downloadPdf(pdfBytes: Uint8Array, filename: string) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


async function exportSingles(items: LabelSpec[], opts: { labelSize: LabelSizeKey }) {
    const sz = LABEL_SIZES[opts.labelSize];
    const isBig = opts.labelSize === '75x100';

    const doc = await PDFDocument.create();

    for (let i = 0; i < items.length; i++) {
        const page = doc.addPage([mmToPt(sz.w), mmToPt(sz.h)]);
        await drawLabelContent(doc, page, { x: 0, y: 0, w: mmToPt(sz.w), h: mmToPt(sz.h) }, items[i], isBig);
    }
    const bytes = await doc.save();
    downloadPdf(bytes, `${opts.labelSize}-etiketler.pdf`);
}

async function exportBatch(items: LabelSpec[], opts: { labelSize: LabelSizeKey; pageSize: PageSizeKey }) {
    const cell = LABEL_SIZES[opts.labelSize];
    const page = PAGE_SIZES[opts.pageSize];
    const isBig = opts.labelSize === '75x100';

    const doc = await PDFDocument.create();
    
    const marginX = 5;
    const marginY = 5;
    const gapMm = 2;

    const usableW = page.w - (2 * marginX);
    const usableH = page.h - (2 * marginY);

    const cols = Math.floor((usableW + gapMm) / (cell.w + gapMm));
    const rows = Math.floor((usableH + gapMm) / (cell.h + gapMm));
    const itemsPerPage = cols * rows;

    for (let i = 0; i < items.length; i++) {
        const pageIndex = Math.floor(i / itemsPerPage);
        let currentPage: PDFPage;

        if (i % itemsPerPage === 0) {
            currentPage = doc.addPage([mmToPt(page.w), mmToPt(page.h)]);
        } else {
            currentPage = doc.getPage(pageIndex);
        }

        const itemOnPageIndex = i % itemsPerPage;
        const col = itemOnPageIndex % cols;
        const row = Math.floor(itemOnPageIndex / cols);

        const x = marginX + col * (cell.w + gapMm);
        const y = page.h - marginY - cell.h - row * (cell.h + gapMm);

        await drawLabelContent(
            doc,
            currentPage,
            { x: mmToPt(x), y: mmToPt(y), w: mmToPt(cell.w), h: mmToPt(cell.h) },
            items[i],
            isBig
        );
    }

    const bytes = await doc.save();
    downloadPdf(bytes, `${opts.pageSize}-${opts.labelSize}-toplu.pdf`);
}

export async function exportPdf(items: LabelSpec[], opts: { labelSize: LabelSizeKey; pageSize: PageSizeKey; batch: boolean }) {
    if (opts.batch) {
        await exportBatch(items, opts);
    } else {
        await exportSingles(items, { labelSize: opts.labelSize });
    }
}
