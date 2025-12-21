'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { useCollection, useUser } from '@/firebase';
import type { Product } from '@/lib/types';
import { usePathname } from 'next/navigation';
import { withFrom } from '@/lib/nav';

function ProductsPageInner() {
  const pathname = usePathname();
  const { user, loading: userLoading } = useUser();
  const { data: products, loading: productsLoading } = useCollection<Product>('products', user?.uid);
  const [search, setSearch] = useState('');

  const isLoading = userLoading || productsLoading;

  const filtered = useMemo(() => {
    if (!products) return [];
    const sorted = [...products].sort((a,b) => a.name.localeCompare(b.name));
    const q = search.trim().toLowerCase();
    if (!q) return sorted;

    return sorted.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const tags = (p.tags || []).map((t) => t.toLowerCase());

      return (
        name.includes(q) ||
        sku.includes(q) ||
        desc.includes(q) ||
        tags.some((t) => t.includes(q))
      );
    });
  }, [products, search]);

  const headerActions = (
    <Button asChild size="sm">
      <Link href={withFrom('/products/new', pathname)}>
        <Plus className="h-4 w-4 mr-1" /> Yeni Ürün
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <PageHeader title="Ürünler" fallback="/dashboard" right={headerActions} />
        <div className="text-center py-10">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader title="Ürünler" fallback="/dashboard" right={headerActions} />
      <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="İsim, stok kodu, açıklama veya etiket ara..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground mt-8">
            Ürün bulunamadı. Filtreyi temizleyin veya yeni ürün ekleyin.
          </p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="hover:border-primary transition-colors"
              >
                <Link href={withFrom(`/product/${p.id}`, pathname)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between items-center gap-2">
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {p.sku}
                      </span>
                    </CardTitle>
                    {p.description && (
                      <CardDescription className="line-clamp-1 text-sm">
                        {p.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[11px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <ProductsPageInner />
    </Suspense>
  );
}
