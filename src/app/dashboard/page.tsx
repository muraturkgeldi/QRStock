
'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import TopBar from '@/components/ui/TopBar';
import { useCollection, useUser } from '@/firebase';
import type { Product, StockItem } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import {
  Boxes,
  Package2,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  ListOrdered,
  Printer,
  Settings,
  LayoutDashboard,
  Warehouse,
  QrCode,
  History
} from 'lucide-react';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import ListItem from '@/components/ui/ListItem';
import { AppMenu } from '@/components/AppMenu';
import { usePathname } from 'next/navigation';

interface EnrichedProduct extends Product {
  currentStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

/**
 * Ortak dashboard verileri
 */
function useDashboardCore() {
  const { user, loading: userLoading } = useUser();

  const {
    data: products,
    loading: productsLoading,
  } = useCollection<Product>('products', user?.uid);
  const {
    data: stockItems,
    loading: stockItemsLoading,
  } = useCollection<StockItem>('stockItems', user?.uid);

  const loading = userLoading || productsLoading || stockItemsLoading;

  const { enrichedProducts, stats } = useMemo(() => {
    if (loading) {
      return {
        enrichedProducts: [] as EnrichedProduct[],
        stats: {
          totalVariety: 0,
          totalQuantity: 0,
          criticalStockCount: 0,
          outOfStockCount: 0,
        },
      };
    }

    const productStockTotals = new Map<string, number>();
    stockItems.forEach((item) => {
      const currentTotal =
        (productStockTotals.get(item.productId) || 0) + item.quantity;
      productStockTotals.set(item.productId, currentTotal);
    });

    const ep: EnrichedProduct[] = products.map((product) => {
      const currentStock = productStockTotals.get(product.id) || 0;
      const minStockLevel = product.minStockLevel || 0;
      const isOutOfStock = currentStock <= 0;
      const isLowStock =
        !isOutOfStock && minStockLevel > 0 && currentStock < minStockLevel;

      return {
        ...product,
        currentStock,
        isLowStock,
        isOutOfStock,
      };
    });

    const newStats = {
      totalVariety: products.length,
      totalQuantity: Array.from(productStockTotals.values()).reduce(
        (a, b) => a + b,
        0
      ),
      criticalStockCount: ep.filter((p) => p.isLowStock && !p.isOutOfStock)
        .length,
      outOfStockCount: ep.filter((p) => p.isOutOfStock).length,
    };

    return { enrichedProducts: ep, stats: newStats };
  }, [products, stockItems, loading]);

  const lowStockProducts = useMemo(() => {
    return enrichedProducts
      .filter((p) => p.isLowStock || p.isOutOfStock)
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 8);
  }, [enrichedProducts]);
  
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
      icon: History,
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

  return {
    loading,
    stats,
    lowStockProducts,
    navItems
  };
}

/**
 * MASAÜSTÜ DASHBOARD – Pixa WMS tarzı layout
 */
function DesktopDashboard() {
  const { loading, stats, lowStockProducts, navItems } = useDashboardCore();
  const pathname = usePathname();

  const dashCardClass =
    "rounded-2xl border border-border/60 bg-surface shadow-[0_14px_35px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.75)]";


  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg text-text flex">
        <aside className="hidden lg:flex lg:flex-col w-60 border-r bg-surface/80 fixed inset-y-0 left-0">
            <div className="h-16 flex items-center px-4 border-b">
              <span className="font-bold text-lg">Stok Takip Sistemi</span>
            </div>
            <div className="flex-1 p-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted',
                    pathname === item.href && 'bg-muted text-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
        </aside>
        <div className="flex-1 flex flex-col lg:ml-60">
          <TopBar title="Ana Panel" />
          <main className="flex-1 flex items-center justify-center text-sm text-subtext">
            Ana panel yükleniyor...
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-text flex">
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
                  href={`${item.href}?from=/dashboard`}
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

      {/* SAĞ TARAF – içerik */}
      <div className="flex-1 flex flex-col lg:ml-60">
        {/* Üst bar (profil vs için) */}
        <TopBar title="Ana Panel" />

        <main className="flex-1 px-8 py-6 space-y-6">
          {/* Sayfa başlığı + kısa açıklama */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Ana Panel
              </h1>
              <p className="text-sm text-subtext mt-1">
                Depo özetini, kritik stokları ve son durumu buradan takip et.
              </p>
            </div>

            <div className="hidden xl:flex items-center gap-2">
              <Button
                asChild
                variant="outline"
              >
                <Link href="/scan?from=/dashboard">
                  <QrCode className="h-4 w-4 mr-1" />
                  Hızlı Tara
                </Link>
              </Button>
              <Button asChild>
                <Link href="/orders/create?from=/dashboard">
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Sipariş Oluştur
                </Link>
              </Button>
            </div>
          </div>

          {/* ÖZET KARTLAR */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className={dashCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-subtext flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  Ürün Çeşidi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {stats.totalVariety}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sistemde tanımlı toplam ürün sayısı
                </p>
              </CardContent>
            </Card>

            <Card className={dashCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-subtext flex items-center gap-2">
                  <Package2 className="h-4 w-4 text-primary" />
                  Toplam Stok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {stats.totalQuantity}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tüm depolardaki toplam adet
                </p>
              </CardContent>
            </Card>

            <Card className={dashCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-subtext flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Kritik Stok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {stats.criticalStockCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Minimum seviyenin altına yaklaşan ürün
                </p>
              </CardContent>
            </Card>

            <Card className={dashCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-subtext flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Tükenmiş
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {stats.outOfStockCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Stokta hiç kalmamış ürün sayısı
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ALT BLOK – solda placeholder, sağda kritik stoklar */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Solda: ileride grafik/rapor koyacağımız alan (şimdilik iskelet) */}
            <Card className={cn("lg:col-span-2", dashCardClass)}>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Genel Bakış
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-subtext">
                  Buraya ileride satış / hareket grafikleri, ısı haritası
                  veya özet raporlar koyabiliriz. Şimdilik Pixa tarzı boş
                  bir panel olarak dursun pampa.
                </p>
              </CardContent>
            </Card>

            {/* Sağda: kritik stok listesi */}
            <Card className={dashCardClass}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold">
                  Kritik stoktaki ürünler
                </CardTitle>
                <Link
                  href="/stock?filter=low"
                  className="text-xs text-primary hover:underline"
                >
                  Tümünü gör
                </Link>
              </CardHeader>
              <CardContent className="space-y-1">
                {lowStockProducts.length === 0 && (
                  <p className="text-xs text-subtext text-center py-4">
                    Şu anda kritik seviyede ürün yok. Takipte kal. ✨
                  </p>
                )}

                {lowStockProducts.map((p) => (
                  <ListItem
                    key={p.id}
                    title={p.name}
                    subtitle={`${p.currentStock} adet kaldı`}
                    thumb={p.imageUrl}
                    status={p.isOutOfStock ? 'out' : 'low'}
                    statusLabel={p.isOutOfStock ? 'Tükendi' : 'Düşük'}
                    href={`/product/${p.id}?from=/dashboard`}
                    chevron
                    className="
                      hover:ring-2 hover:ring-emerald-300 hover:bg-emerald-50
                      dark:hover:ring-emerald-400 dark:hover:bg-emerald-500/10
                    "
                  />
                ))}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

/**
 * MOBİL DASHBOARD – önceki sade tasarım
 */
function MobileDashboard() {
    const dashCardClass =
    "rounded-2xl border border-border/60 bg-surface shadow-[0_14px_35px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.75)]";


  return (
    <div className="min-h-dvh flex flex-col bg-app-bg">
      <TopBar title="Stok Takip Sistemi" />

      <div className="flex-1 p-4 space-y-4">
        {/* Hızlı Tara kartı */}
        <Card className={dashCardClass}>
          <CardContent className="p-4 flex flex-col gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Depoda hızlı işlem</p>
              <h1 className="text-xl font-bold">QR Kod Tara</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Ürün detayı veya stok hareketi için kodu okut.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="w-full h-14 rounded-full flex items-center justify-center gap-2 text-base bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/scan?from=/dashboard">
                <QrCode className="h-5 w-5" />
                Hemen Tara
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Hızlı aksiyonlar */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            asChild
            variant="outline"
            className="h-24 rounded-2xl flex flex-col items-start justify-center px-3"
          >
            <Link href="/stock?from=/dashboard">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                <span className="font-semibold text-sm">Stoklar</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                Giriş / çıkış kayıtları
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-24 rounded-2xl flex flex-col items-start justify-center px-3"
          >
            <Link href="/products?from=/dashboard">
              <div className="flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                <span className="font-semibold text-sm">Ürünler</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                Ara, düzenle, etiket bas
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-24 rounded-2xl flex flex-col items-start justify-center px-3"
          >
            <Link href="/locations?from=/dashboard">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                <span className="font-semibold text-sm">Depolar</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                Depo / koridor / raf
              </span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-24 rounded-2xl flex flex-col items-start justify-center px-3"
          >
            <Link href="/history?from=/dashboard">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                <span className="font-semibold text-sm">Hareketler</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                Son işlemleri gör
              </span>
            </Link>
          </Button>
        </div>

        {/* Son hareketler placeholder */}
        <Card className={dashCardClass}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Son hareketler</span>
              <Link
                href="/history?from=/dashboard"
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                Tümünü gör
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Buraya sonra gerçek son hareket listesini koyarız. Şimdilik
              tasarım iskeleti dursun pampa.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Ana sayfa – layout seçici
 */
export default function DashboardPage() {
  const mode = useLayoutMode(1024);

  if (mode === undefined) {
    return <div className="p-4 text-center">Yükleniyor...</div>;
  }

  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      {mode === 'mobile' ? <MobileDashboard /> : <DesktopDashboard />}
    </Suspense>
  );
}
