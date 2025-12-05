'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, LayoutDashboard, Boxes, Package2, Warehouse, History as HistoryIcon, ShoppingCart, Printer, Settings } from 'lucide-react';
import { useCollection, useUser } from '@/firebase';
import type { Product } from '@/lib/types';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

function ProductsPageInner() {
  const mode = useLayoutMode(1024);
  const pathname = usePathname();
  const { user, loading: userLoading } = useUser();
  const { data: products, loading: productsLoading } = useCollection<Product>('products', user?.uid);
  const [search, setSearch] = useState('');

  const isLoading = userLoading || productsLoading;

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
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

  if (mode === undefined || isLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-app-bg">
        <TopBar title="Ürünler" />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  // 📱 MOBİL LAYOUT
  if (mode === 'mobile') {
    return (
      <div className="flex flex-col min-h-dvh bg-app-bg">
        <TopBar title="Ürünler" />
        <div className="p-4 space-y-4">
          <div className="flex justify-between gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İsim, stok kodu, açıklama veya etiket ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button asChild>
              <Link href="/products/new">
                <Plus className="h-4 w-4 mr-1" /> Yeni Ürün
              </Link>
            </Button>
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
                  className="hover:border-emerald-500 hover:border-2"
                >
                  <Link href={`/product/${p.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex justify-between items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.sku}
                        </span>
                      </CardTitle>
                      {p.description && (
                        <CardDescription className="line-clamp-1">
                          {p.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      {p.tags && p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[11px]">
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

  // 🖥️ MASAÜSTÜ LAYOUT
  const navItems = [
    {
      label: 'Ana Panel',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Stoklar',
      href: '/stock',
      icon: Boxes,
    },
    {
      label: 'Ürünler',
      href: '/products',
      icon: Package2,
    },
    {
      label: 'Lokasyonlar',
      href: '/locations',
      icon: Warehouse,
    },
    {
      label: 'Hareketler',
      href: '/history',
      icon: HistoryIcon,
    },
    {
      label: 'Siparişler',
      href: '/orders',
      icon: ShoppingCart,
    },
    {
      label: 'Etiketler',
      href: '/labels/maker',
      icon: Printer,
    },
    {
      label: 'Ayarlar',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Sol sidebar – masaüstü navigasyon */}
      <aside className="hidden lg:flex lg:flex-col w-60 border-r bg-surface/80 fixed inset-y-0 left-0">
        <div className="h-16 flex items-center px-4 border-b">
          <span className="font-bold text-lg">Stok Takip Sistemi</span>
        </div>
        <div className="flex-1 p-2">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                  'text-muted-foreground',
                  isActive &&
                    'bg-emerald-50 text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.4)] dark:bg-emerald-500/15 dark:text-emerald-100',
                  'hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-500/40 dark:hover:text-emerald-50'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </aside>

      {/* Sağ taraf – içerik */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        <TopBar title="Ürünler" />
        <main className="flex-1 p-6 space-y-4">
          <div className="flex justify-between gap-2 items-center mb-4">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İsim, stok kodu, açıklama veya etiket ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
             <Button
                asChild
                className="rounded-full border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 dark:border-emerald-500 dark:bg-transparent dark:text-emerald-50 dark:hover:bg-emerald-500/20"
              >
              <Link href="/products/new">
                <Plus className="h-4 w-4 mr-1" /> Yeni Ürün
              </Link>
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground mt-8">
              Ürün bulunamadı. Filtreyi temizleyin veya yeni ürün ekleyin.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <Card
                  key={p.id}
                  className="border border-border/60 hover:border-emerald-500 hover:border-2"
                >
                  <Link href={`/product/${p.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex justify-between items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {p.sku}
                        </span>
                      </CardTitle>
                      {p.description && (
                        <CardDescription className="line-clamp-2 text-sm">
                          {p.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      {p.tags && p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[11px]">
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
        </main>
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

    
