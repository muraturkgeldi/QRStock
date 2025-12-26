
'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ScanLine, Plus, Boxes, Package, AlertTriangle, XCircle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import LinkWithFrom from '@/components/ui/LinkWithFrom';
import Link from 'next/link';

type StockStatusFilter = 'all' | 'low' | 'outOfStock' | 'sufficient';

interface EnrichedProduct extends Product {
    currentStock: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
}

export const filterButtonClasses = "inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-sm transition-colors";

export function StockClient({ initialProducts }: { initialProducts: EnrichedProduct[] }) {
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get('filter') as StockStatusFilter | null;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StockStatusFilter>(filterQuery || 'all');

  useEffect(() => {
    if (filterQuery) {
        setFilterStatus(filterQuery);
    }
  }, [filterQuery]);


  const { totalQuantity, criticalStockCount, outOfStockCount } = useMemo(() => {
      let totalQty = 0;
      let critical = 0;
      let out = 0;
      initialProducts.forEach(p => {
          totalQty += p.currentStock;
          if (p.isOutOfStock) {
              out++;
          } else if (p.isLowStock) {
              critical++;
          }
      });
      return { totalQuantity: totalQty, criticalStockCount: critical, outOfStockCount: out };
  }, [initialProducts]);


  const filteredProducts = useMemo(() => {
    let productsToFilter = initialProducts;

    if (filterStatus === 'low') {
        productsToFilter = productsToFilter.filter(p => p.isLowStock && !p.isOutOfStock);
    } else if (filterStatus === 'outOfStock') {
        productsToFilter = productsToFilter.filter(p => p.isOutOfStock);
    } else if (filterStatus === 'sufficient') {
        productsToFilter = productsToFilter.filter(p => !p.isLowStock && !p.isOutOfStock);
    }
    
    if (!searchTerm) {
      return productsToFilter;
    }

    const q = searchTerm.trim().toLowerCase();
    return productsToFilter.filter(product => {
        const name = (product.name || '').toLowerCase();
        const sku = (product.sku || '').toLowerCase();
        const tags = Array.isArray(product.tags) ? product.tags.map(t => String(t).toLowerCase()) : [];

        const matchesName = name.includes(q);
        const matchesSku = sku.includes(q);
        const matchesTag = tags.some(tag => tag.includes(q));

        return matchesName || matchesSku || matchesTag;
    });
  }, [initialProducts, searchTerm, filterStatus]);

  const getBadgeVariant = (product: EnrichedProduct) => {
      if (product.isOutOfStock) return 'danger';
      if (product.isLowStock) return 'warn';
      return 'success';
  }

  const getBadgeText = (product: EnrichedProduct) => {
      if (product.isOutOfStock) return 'Tükendi';
      if (product.isLowStock) return 'Düşük Stok';
      return 'Yeterli Stok';
  }

  return (
    <>
      <div className="p-4 bg-background z-10 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <Card>
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-xs font-medium">Toplam Çeşit</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex items-center justify-center gap-1">
                <Boxes className="w-5 h-5 text-primary" />
                <p className="text-xl font-bold">{initialProducts.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-xs font-medium">Toplam Adet</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex items-center justify-center gap-1">
                <Package className="w-5 h-5 text-primary" />
                <p className="text-xl font-bold">{totalQuantity}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-500">Kritik Stok</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                <p className="text-xl font-bold">{criticalStockCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-xs font-medium text-destructive">Tükenmiş</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="w-5 h-5 text-destructive" />
                <p className="text-xl font-bold">{outOfStockCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Ürün adı, stok kodu (SKU) veya etiket ile ara..."
            className="w-full pl-10 pr-12 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button asChild variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
            <Link href="/scan">
              <ScanLine className="h-5 w-5 text-primary" />
              <span className="sr-only">QR Kod Tara</span>
            </Link>
          </Button>
        </div>
        
         <div className="flex justify-center items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                filterButtonClasses,
                "border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500 dark:text-emerald-50 dark:bg-transparent dark:hover:bg-emerald-500/20",
                filterStatus === 'all' && "bg-emerald-600 text-white dark:bg-emerald-500"
              )}
            >
              Tümü
            </button>
             <button
              onClick={() => setFilterStatus('low')}
              className={cn(
                filterButtonClasses,
                "border-amber-400 text-amber-800 bg-white hover:bg-amber-50 hover:text-amber-900 dark:border-amber-500 dark:text-amber-50 dark:bg-transparent dark:hover:bg-amber-500/20",
                filterStatus === 'low' && "bg-amber-500 text-white dark:bg-amber-500"
              )}
            >
              Düşük Stok
            </button>
             <button
              onClick={() => setFilterStatus('outOfStock')}
              className={cn(
                filterButtonClasses,
                "border-red-400 text-red-800 bg-white hover:bg-red-50 hover:text-red-900 dark:border-red-500 dark:text-red-50 dark:bg-transparent dark:hover:bg-red-500/20",
                filterStatus === 'outOfStock' && "bg-red-600 text-white dark:bg-red-500"
              )}
            >
              Tükenmiş
            </button>
            <Button asChild size="sm" className="bg-emerald-600 text-primary-foreground hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 rounded-full">
                <LinkWithFrom href="/products/new">
                    <Plus className="mr-2 h-4 w-4" /> Yeni
                </LinkWithFrom>
            </Button>
        </div>
      </div>
      <div className="p-4 pt-0 space-y-4">
        {initialProducts.length === 0 ? (
           <p className="text-center text-muted-foreground pt-8">Sistemde kayıtlı ürün bulunmuyor.</p>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <LinkWithFrom href={`/product/${product.id}`} key={product.id}>
              <Card className="rounded-2xl border border-transparent hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="rounded-lg object-cover"
                    data-ai-hint={product.imageHint}
                  />
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <span>{product.sku || product.id}</span>
                    </div>
                    <Badge variant={getBadgeVariant(product)}>
                      {getBadgeText(product)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xl font-bold", { "text-destructive": product.isOutOfStock, "text-amber-600 dark:text-amber-500": product.isLowStock && !product.isOutOfStock })}>
                        {product.currentStock}
                    </p>
                    <p className="text-xs text-muted-foreground">adet</p>
                  </div>
                </CardContent>
              </Card>
            </LinkWithFrom>
          ))
        ) : (
          <p className="text-center text-muted-foreground pt-8">
            {searchTerm || filterStatus !== 'all' ? `Arama kriterlerine uygun sonuç bulunamadı.` : 'Sistemde kayıtlı ürün bulunmuyor.'}
          </p>
        )}
      </div>
    </>
  );
}
