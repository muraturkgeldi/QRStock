import { NextRequest, NextResponse } from 'next/server';

type ParsedItem = {
  productSku: string;
  productName: string;
  quantity: number;
};

type ParsedDraft = {
  supplierName?: string;
  orderNumber?: string;
  orderDate?: string;
  items: ParsedItem[];
  rawText?: string;
};

// İLERDE GERÇEK PARSE BURAYA GELECEK
// Şimdilik sadece iskelet: dosyanın varlığını kontrol edip
// demo bir çıktı döndürüyoruz.
async function parseOrderPdf(buffer: ArrayBuffer): Promise<ParsedDraft> {
  // TODO (Adım 3):
  //  - pdf metnini extract et
  //  - tedarikçi / tarih / sipariş no headerlarını yakala
  //  - satır tablosunu regex / split ile çöz
  //  - Logo formatına uygun { productSku, productName, quantity } dizisi döndür

  // Şimdilik sadece demo / iskelet:
  return {
    supplierName: '',
    orderNumber: '',
    orderDate: '',
    items: [],
    rawText: 'PARSER_NOT_IMPLEMENTED',
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'PDF dosyası bulunamadı.' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { ok: false, error: 'Lütfen PDF formatında bir dosya yükleyin.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const draft = await parseOrderPdf(arrayBuffer);

    return NextResponse.json({
      ok: true,
      draft,
      message:
        'Şu anda sadece iskelet çalışıyor. Bir sonraki adımda gerçek PDF parse mantığı eklenecek.',
    });
  } catch (e: any) {
    console.error('ORDER_IMPORT_FAIL', e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'Sipariş import edilirken beklenmeyen bir hata oluştu.',
      },
      { status: 500 }
    );
  }
}
