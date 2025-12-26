
'use client';

import { Suspense, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { PackageSearch, UploadCloud, FileText } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { safeFrom } from '@/lib/nav';

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

function ImportOrderContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ParsedDraft | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const fallbackUrl = safeFrom(searchParams.get('from'), '/orders');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Geçersiz dosya türü',
        description: 'Lütfen PDF formatında bir sipariş dosyası yükleyin.',
      });
      setFile(null);
      return;
    }
    setFile(f);
    setResult(null);
    setServerMessage(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Dosya seçilmedi',
        description: 'Önce bir PDF dosyası seçmelisiniz.',
      });
      return;
    }

    try {
      setIsUploading(true);
      setResult(null);
      setServerMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Sipariş parse edilemedi.');
      }

      setResult(data.draft as ParsedDraft);
      setServerMessage(data.message || null);

      toast({
        title: 'PDF okundu',
        description: 'Sipariş taslağı başarıyla oluşturuldu (iskelet).',
      });
    } catch (e: any) {
      console.error('IMPORT_ERROR', e);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: e.message || 'Sipariş import edilirken bir hata oluştu.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-app-bg">
      <PageHeader title="PDF Sipariş İçe Aktar" fallback={fallbackUrl} />
      <div className="p-4 pt-0 max-w-4xl mx-auto w-full space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>PDF Yükle</CardTitle>
            <CardDescription>
              Logo'dan / satın almadan çıkan onay PDF'ini buraya yükleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="max-w-md"
              />
              {file && (
                <div className="text-xs text-muted-foreground">
                  Seçilen dosya: <span className="font-semibold">{file.name}</span>
                </div>
              )}
            </div>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              <UploadCloud className="w-4 h-4 mr-2" />
              {isUploading ? 'Yükleniyor...' : 'Yükle ve Çözümle'}
            </Button>
            {serverMessage && (
              <p className="text-xs text-muted-foreground">
                Sunucu notu: <span className="font-mono">{serverMessage}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Ayrıştırılan Sipariş Taslağı
              </CardTitle>
              <CardDescription>
                Bu ekran şu anda taslak (iskelet). Bir sonraki adımda gerçek PDF parse mantığını
                yazıp buradaki verileri Logo formatına göre dolduracağız.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Tedarikçi</span>
                  <p className="font-semibold">{result.supplierName || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sipariş No</span>
                  <p className="font-semibold">{result.orderNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tarih</span>
                  <p className="font-semibold">{result.orderDate || '-'}</p>
                </div>
              </div>

              <div className="border rounded-md">
                <div className="px-3 py-2 border-b bg-muted/60 text-xs font-medium">
                  Satırlar (şimdilik demo / iskelet)
                </div>
                <ScrollArea className="max-h-72">
                  <table className="w-full text-[11px]">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left px-2 py-1">Stok Kodu</th>
                        <th className="text-left px-2 py-1">Ürün Adı</th>
                        <th className="text-right px-2 py-1">Miktar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-2 py-3 text-center text-muted-foreground text-[11px]"
                          >
                            Şu anda parser iskelet aşamasında, satır bulunamadı. Bir sonraki adımda
                            bu tablo Logo sipariş satırlarıyla dolacak.
                          </td>
                        </tr>
                      ) : (
                        result.items.map((it, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="px-2 py-1 whitespace-nowrap">{it.productSku}</td>
                            <td className="px-2 py-1">{it.productName}</td>
                            <td className="px-2 py-1 text-right">{it.quantity}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ImportOrdersPage() {
    return (
        <Suspense>
            <ImportOrderContent />
        </Suspense>
    )
}
