
'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useUser, useCollection } from '@/firebase';
import type { Product, PurchaseOrderItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { firestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function CreateOrderClient() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: allProducts, loading: productsLoading } = useCollection<Product>('products', user?.uid);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [qtyById, setQtyById] = useState<{ [id: string]: number | string }>({});
  const [noteById, setNoteById] = useState<{ [id: string]: string }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = userLoading || productsLoading;

  // 🔹 İlk yüklemede bulk_po_ids varsa onu kullan, yoksa TÜM ürünleri aday yap
  useEffect(() => {
    const raw = sessionStorage.getItem('bulk_po_ids');
    const ids = raw ? JSON.parse(raw) : [];

    if (Array.isArray(ids) && ids.length > 0) {
      setSelectedProductIds(ids);
    } else {
      // hiçbir seçim yoksa, tüm ürünler sipariş adayı
      setSelectedProductIds([]); // boş kalsın, aşağıda allProducts’a düşeceğiz
    }

    sessionStorage.removeItem('bulk_po_ids');
  }, []);

  // 🔹 Sipariş adayları:
  // - Eğer selectedProductIds doluysa sadece onlar
  // - Boşsa: TÜM ürünler
  const orderCandidates = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];

    if (!selectedProductIds || selectedProductIds.length === 0) {
      // hiç seçim yapılmamış → tüm ürünler aday
      return allProducts;
    }

    const productsMap = new Map(allProducts.map((p) => [p.id, p]));
    return selectedProductIds
      .map((id) => productsMap.get(id))
      .filter((p): p is Product => !!p);
  }, [selectedProductIds, allProducts]);

  // 🔹 Arama: name + sku + tags hepsini aynı yerde arıyoruz
  const filteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return orderCandidates;

    const q = searchTerm.trim().toLowerCase();

    return orderCandidates.filter((p) => {
      const parts: string[] = [];
      if (p.name) parts.push(p.name);
      if (p.sku) parts.push(p.sku);
      if (Array.isArray(p.tags) && p.tags.length > 0) {
        parts.push(...p.tags);
      }

      const haystack = parts.join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [orderCandidates, searchTerm]);

  function toQty(v: unknown): number {
    const n = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? Math.floor(n) : NaN;
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Sipariş oluşturmak için giriş yapmalısınız.',
      });
      return;
    }
  
    const payload = orderCandidates
      .map((p) => {
        const q = toQty(qtyById[p.id]);
        return {
          productId: p.id,
          productName: p.name?.trim() || '',
          productSku: (p.sku || p.id).trim(),
          description: (noteById[p.id] ?? '').toString(),
          quantity: q,
        };
      })
      .filter(
        (it) =>
          it.productId &&
          it.productName &&
          it.productSku &&
          Number.isFinite(it.quantity) &&
          it.quantity > 0,
      );
  
    if (payload.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Geçerli Ürün Yok',
        description: 'Adet girilen en az bir ürün olmalı (Adet ≥ 1).',
      });
      return;
    }
  
    setIsSubmitting(true);
    toast({
      title: 'Sipariş Oluşturuluyor...',
      description: 'Lütfen bekleyin.',
    });
  
    try {
      // Firestore: /purchaseOrders koleksiyonuna tek doküman
      const ordersCol = collection(firestore, 'purchaseOrders');
      const now = serverTimestamp();
  
      await addDoc(ordersCol, {
        uid: user.uid,
        orderNumber: `PO-${Date.now()}`,
        orderDate: now,
        status: 'draft',
        items: payload.map(it => ({
            ...it,
            receivedQuantity: 0,
            remainingQuantity: it.quantity
        })),
        createdAt: now,
        updatedAt: now,
        createdByUid: user.uid,
        createdByEmail: user.email ?? null,
        createdByName: user.displayName ?? null,
        requesterDepartment: null, // Şimdilik boş
        requesterRole: 'purchaser', // Şimdilik herkes purchaser
      });
  
      toast({
        title: 'Başarılı!',
        description: 'Satın alma siparişi başarıyla oluşturuldu.',
      });
  
      router.push('/orders');
    } catch (error: any) {
      console.error('PO_FAIL_CLIENT:', error);
      toast({
        variant: 'destructive',
        title: 'Sipariş Oluşturulamadı',
        description: error?.message || 'Bilinmeyen bir hata oluştu.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const validItemsToOrderCount = useMemo(
    () => Object.values(qtyById).filter((q) => toQty(q) > 0).length,
    [qtyById],
  );

  if (isLoading) {
    return <div className="p-4 text-center">Sipariş verileri yükleniyor...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sipariş Hazırlama</CardTitle>
          <CardDescription>
            Sipariş vermek istediğiniz ürünlerin miktarını girin. Miktar girilmeyen ürünler
            siparişe eklenmeyecektir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Arama kutusu */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Ürün adı, stok kodu veya etiket ile ara..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Ürün listesi */}
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-4">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="rounded-md object-cover"
                    data-ai-hint={item.imageHint}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Etiketler: {item.tags.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`qty-${item.id}`} className="sr-only">
                      Adet
                    </Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={qtyById[item.id] ?? ''}
                      onChange={(e) =>
                        setQtyById((s) => ({
                          ...s,
                          [item.id]: e.target.value === '' ? '' : e.target.valueAsNumber,
                        }))
                      }
                      placeholder="Adet"
                      className="w-full text-center text-base"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`desc-${item.id}`} className="sr-only">
                    Ürün Notu
                  </Label>
                  <Input
                    id={`desc-${item.id}`}
                    value={noteById[item.id] ?? ''}
                    onChange={(e) =>
                      setNoteById((s) => ({ ...s, [item.id]: e.target.value }))
                    }
                    placeholder="Bu ürüne özel not..."
                    className="text-sm"
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-6">
              {searchTerm
                ? 'Aramanıza uygun ürün bulunamadı.'
                : 'Sipariş listesi boş. Ürün seçimi ekranından ürün ekleyin.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alt siparişi tamamlama butonu */}
      <div className="sticky bottom-4 pb-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || validItemsToOrderCount === 0}
          className="w-full"
          size="lg"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          {isSubmitting
            ? 'Oluşturuluyor...'
            : `Siparişi Tamamla (${validItemsToOrderCount} Ürün)`}
        </Button>
      </div>
    </div>
  );
}
