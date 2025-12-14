
// src/utils/reportId.ts

export type ReportKind =
  | 'DAILY_RECEIVING'
  | 'DAILY_SHIPPING'
  | 'DAILY_PRODUCTION';

export type ReceivingReportIdParts = {
  kind: 'DAILY_RECEIVING';
  date: string;           // YYYY-MM-DD
  warehouseKey: string;   // WHS:<...> içi
  supplierKey: string;    // SUP:<...> içi
  poKey: string;          // PO:<...> içi
};

export type ShippingReportIdParts = {
  kind: 'DAILY_SHIPPING';
  date: string;           // YYYY-MM-DD
  warehouseKey: string;   // WHS:<...> içi
  customerKey: string;    // CUS:<...> içi
  orderKey: string;       // ORD:<...> içi
};

export type ProductionReportIdParts = {
  kind: 'DAILY_PRODUCTION';
  date: string;           // YYYY-MM-DD
  lineKey: string;        // LINE:<...> içi
  skuKey: string;         // SKU:<...> içi
};

export type ParsedReportId =
  | ReceivingReportIdParts
  | ShippingReportIdParts
  | ProductionReportIdParts;

/**
 * Boş / undefined / null ise ALL, doluysa:
 * - trim
 * - büyük harf
 * - boşlukları at
 */
export function normalizeKey(raw?: string | null): string {
  const v = (raw ?? '').trim();
  if (!v) return 'ALL';
  return v.toUpperCase().replace(/\s+/g, '');
}

/**
 * PO numaralarını da aynı normalize mantığıyla toparlayalım.
 */
export function normalizePoNo(raw?: string | null): string {
  return normalizeKey(raw);
}

function toDateKey(input: string | Date): string {
  if (typeof input === 'string') {
    // Kabul: "2025-01-02T12:34:00Z" veya "2025-01-02"
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    return d.toISOString().slice(0, 10);
  }
  return input.toISOString().slice(0, 10);
}

/* ---------- BUILD HELPERS ---------- */

export function buildReceivingReportId(args: {
  date: string | Date;
  warehouseKey?: string | null;
  supplierKey?: string | null;
  poKey?: string | null;
}): string {
  const date = toDateKey(args.date);
  const whs = normalizeKey(args.warehouseKey);
  const sup = normalizeKey(args.supplierKey);
  const po = normalizePoNo(args.poKey);

  return [
    'DAILY_RECEIVING',
    date,
    `WHS:${whs}`,
    `SUP:${sup}`,
    `PO:${po}`,
  ].join('|');
}

export function buildShippingReportId(args: {
  date: string | Date;
  warehouseKey?: string | null;
  customerKey?: string | null;
  orderKey?: string | null;
}): string {
  const date = toDateKey(args.date);
  const whs = normalizeKey(args.warehouseKey);
  const cus = normalizeKey(args.customerKey);
  const ord = normalizeKey(args.orderKey);

  return [
    'DAILY_SHIPPING',
    date,
    `WHS:${whs}`,
    `CUS:${cus}`,
    `ORD:${ord}`,
  ].join('|');
}

export function buildProductionReportId(args: {
  date: string | Date;
  lineKey?: string | null;
  skuKey?: string | null;
}): string {
  const date = toDateKey(args.date);
  const line = normalizeKey(args.lineKey);
  const sku = normalizeKey(args.skuKey);

  return [
    'DAILY_PRODUCTION',
    date,
    `LINE:${line}`,
    `SKU:${sku}`,
  ].join('|');
}

/* ---------- PARSE HELPERS ---------- */

function stripPrefix(value: string, prefix: string): string | null {
  if (!value.startsWith(prefix)) return null;
  return value.slice(prefix.length) || null;
}

export function parseReportId(id: string): ParsedReportId | null {
  const parts = id.split('|');
  if (parts.length < 3) return null;

  const [kind, date, third, fourth, fifth] = parts;

  if (!kind || !date) return null;

  if (kind === 'DAILY_RECEIVING') {
    // DAILY_RECEIVING|YYYY-MM-DD|WHS:...|SUP:...|PO:...
    if (!third || !fourth || !fifth) return null;
    const whs = stripPrefix(third, 'WHS:');
    const sup = stripPrefix(fourth, 'SUP:');
    const po = stripPrefix(fifth, 'PO:');
    if (!whs || !sup || !po) return null;

    return {
      kind: 'DAILY_RECEIVING',
      date,
      warehouseKey: whs,
      supplierKey: sup,
      poKey: po,
    };
  }

  if (kind === 'DAILY_SHIPPING') {
    // DAILY_SHIPPING|YYYY-MM-DD|WHS:...|CUS:...|ORD:...
    if (!third || !fourth || !fifth) return null;
    const whs = stripPrefix(third, 'WHS:');
    const cus = stripPrefix(fourth, 'CUS:');
    const ord = stripPrefix(fifth, 'ORD:');
    if (!whs || !cus || !ord) return null;

    return {
      kind: 'DAILY_SHIPPING',
      date,
      warehouseKey: whs,
      customerKey: cus,
      orderKey: ord,
    };
  }

  if (kind === 'DAILY_PRODUCTION') {
    // DAILY_PRODUCTION|YYYY-MM-DD|LINE:...|SKU:...
    if (!third || !fourth) return null;
    const line = stripPrefix(third, 'LINE:');
    const sku = stripPrefix(fourth, 'SKU:');
    if (!line || !sku) return null;

    return {
      kind: 'DAILY_PRODUCTION',
      date,
      lineKey: line,
      skuKey: sku,
    };
  }

  return null;
}
