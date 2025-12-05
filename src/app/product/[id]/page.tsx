'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore } from '@/firebase/provider';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Pencil, ArrowRightLeft, Warehouse, DoorClosed, Archive } from 'lucide-react';
import type { Product, StockItem, Location } from '@/lib/types';
import { useCollection } from '@/firebase';
import { cn } from '@/lib/utils';

// ----------------- Küçük yardımcı bileşenler -----------------

const Spec = ({ label, value }: { label: string; value: string | number | undefined }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="py-3 border-b last:border-none">
      <p className="text-sm text-subtext">{label}</p>
      <p className="font-semibold text-text">{String(value)}</p>
    </div>
  );
};

type EnrichedItem = StockItem & {
  path: string;
  icon: typeof Warehouse;
};

function StockByLocation({
  items,
  locations,
}: {
  items: StockItem[];
  locations: Location[];
}) {
  const locationMap = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations]
  );

  const enrichedItems: EnrichedItem[] = useMemo(() => {
    const arr: EnrichedItem[] = [];

    items.forEach((item) => {
      const location = locationMap.get(item.locationId);
      if (!location) return;

      let path = location.name;

      if (location.parentId) {
        const parent = locationMap.get(location.parentId);
        if (parent) {
          path = `${parent.name} > ${path}`;

          if (parent.parentId) {
            const grandparent = locationMap.get(parent.parentId);
            if (grandparent) {
              path = `${grandparent.name} > ${path}`;
            }
          }
        }
      }

      const icon =
        location.type === 'warehouse'
          ? Warehouse
          : location.type === 'corridor'
          ? DoorClosed
          : Archive;

      arr.push({
        ...(item as StockItem),
        path,
        icon,
      });
    });

    arr.sort((a, b) => a.path.localeCompare(b.path));
    return arr;
  }, [items, locationMap]);

  if (enrichedItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stok Konumları</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Bu ürün stokta değil.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok Konumları</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {enrichedItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.path}</p>
                </div>
                <Badge variant="secondary">{item.quantity} adet</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


// ----------------- Asıl sayfa -----------------

export default function ProductDetailPage() {
  const firestore = useFirestore();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // locations artık uid'e göre filtrelenmiyor
  const { data: locations, loading: locationsLoading } =
    useCollection<Location>('locations');

  // /product/[id] → bu id stok kodu / barkod / docId olabilir
  const rawId = (params?.id ?? '') as string;

  useEffect(() => {
    if (!firestore || !rawId) return;

    const loadProduct = async () => {
      setLoading(true);
      try {
        let productData: Product | null = null;

        // 1) Önce doküman ID'si olarak dene: products/{rawId}
        try {
          const byIdRef = doc(firestore, 'products', rawId);
          const byIdSnap = await getDoc(byIdRef);
          if (byIdSnap.exists()) {
            productData = { id: byIdSnap.id, ...(byIdSnap.data() as any) };
          }
        } catch {
          // geç
        }

        // 2) ID ile bulunamadıysa stok kodu (sku) olarak ara
        if (!productData) {
          const skuQuery = query(
            collection(firestore, 'products'),
            where('sku', '==', rawId),
            limit(1)
          );
          const skuSnap = await getDocs(skuQuery);
          if (!skuSnap.empty) {
            const docSnap = skuSnap.docs[0];
            productData = { id: docSnap.id, ...(docSnap.data() as any) };
          }
        }

        setProduct(productData);

        // 3) Stok verilerini çek
        if (productData) {
          const stockQ = query(
            collection(firestore, 'stockItems'),
            where('productId', '==', productData.id)
            // quantity > 0 şartını kaldırdık, index istemesin
          );
          const stockSnap = await getDocs(stockQ);
          const items = stockSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) } as StockItem))
            .filter((item) => (item.quantity ?? 0) > 0); // 🔥 quantity > 0 filtresi artık client tarafında

          setStockItems(items);
        } else {
          setStockItems([]);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
        setStockItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [firestore, rawId]);

  const totalStock = useMemo(() => {
    return stockItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  }, [stockItems]);

  const status = useMemo(() => {
    if (!product)
      return {
        label: '...',
        variant: 'secondary' as const,
        isOutOfStock: false,
        isLowStock: false,
      };
    const isOutOfStock = totalStock <= 0;
    const minStock = (product as any).minStockLevel || 0;
    const isLowStock =
      !isOutOfStock && minStock > 0 && totalStock < minStock;
    if (isOutOfStock)
      return {
        label: 'Tükendi',
        variant: 'danger' as const,
        isOutOfStock: true,
        isLowStock: false,
      };
    if (isLowStock)
      return {
        label: 'Düşük Stok',
        variant: 'warn' as const,
        isOutOfStock: false,
        isLowStock: true,
      };
    return {
      label: 'Yeterli Stok',
      variant: 'success' as const,
      isOutOfStock: false,
      isLowStock: false,
    };
  }, [product, totalStock]);

  if (loading || locationsLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-app-bg">
        <TopBar title="Ürün Detayı" />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-dvh bg-app-bg">
        <TopBar title="Ürün bulunamadı" />
        <div className="p-4 text-center">
          Bu kodla eşleşen bir ürün bulunamadı:{' '}
          <strong>{rawId}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-app-bg">
      <TopBar title={product.name} />
      <div className="flex-1">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name || 'Ürün görseli'}
            width={800}
            height={480}
            className="w-full h-60 object-cover bg-muted-foreground/20"
            data-ai-hint={(product as any).imageHint}
            priority
          />
        )}
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold text-text">
                {product.name}
              </h1>
              <Badge
                variant={status.variant}
              >
                {status.label}
              </Badge>
            </div>
             {product.tags?.length ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="
                      inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium
                      border-emerald-200 bg-emerald-50 text-emerald-700
                      dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-100
                    "
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className="bg-surface rounded-xl border">
              <div className="p-4">
                <Spec
                  label="Stok Kodu (SKU)"
                  value={product.sku || (product as any).stockCode || product.id}
                />
                <Spec
                  label="Toplam Stok"
                  value={`${totalStock} adet`}
                />
                <Spec
                  label="Minimum Stok Seviyesi"
                  value={
                    (product as any).minStockLevel || 'Belirtilmemiş'
                  }
                />
                <Spec
                  label="Açıklama"
                  value={product.description || 'N/A'}
                />
              </div>
            </div>
          </div>

          <StockByLocation items={stockItems} locations={locations} />
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-2 sticky bottom-0 bg-gradient-to-t from-app-bg to-transparent">
        <Button asChild variant="outline" size="lg">
          <Link href={`/product/${product.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" /> Düzenle
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/product/${product.id}/transfer`}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer
          </Link>
        </Button>
        <Button asChild size="lg">
          <Link href={`/product/${product.id}/update`}>
            <Plus className="mr-2 h-4 w-4" /> Ekle/Çıkar
          </Link>
        </Button>
      </div>
    </div>
  );
}
