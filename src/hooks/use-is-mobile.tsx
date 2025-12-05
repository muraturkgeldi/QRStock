'use client';

import { Suspense, useMemo } from 'react';
import TopBar from '@/components/ui/TopBar';
import { useCollection, useUser } from '@/firebase';
import type { Product, StockItem } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import {
  Boxes,
  Package,
  AlertTriangle,
  XCircle,
  ScanLine,
  FileUp,
  Settings,
  Plus,
  ShoppingCart,
  History,
  MapPin,
  Printer,
  ListOrdered,
  QrCode,
  Package2,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import Section from '@/components/Section';
import ListItem from '@/components/ui/ListItem';
import { IconGrid } from '@/components/ui/IconGrid';
import { AppMenu } from '@/components/AppMenu';
import { Button } from '@/components/ui/button';
import { useLayoutMode } from '@/hooks/use-layout-mode';

interface EnrichedProduct extends Product {
  currentStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

// 🎯 Core data and logic hook
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
    if (loading)
      return {
        enrichedProducts: [],
        stats: {
          totalVariety: 0,
          totalQuantity: 0,
          criticalStockCount: 0,
          outOfStockCount: 0,
        },
      };

    const productStockTotals = new Map<string, number>();
    stockItems.forEach((item) => {
      const currentTotal =
        (productStockTotals.get(item.productId) || 0) + item.quantity;
      productStockTotals.set(item.productId, currentTotal);
    });

    const ep = products.map((product) => {
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
      .slice(0, 5); // Show top 5 most critical items
  }, [enrichedProducts]);

  const quickActions = [
    { label: 'Stok Giriş/Çıkış', icon: <Plus />, href: '/stock' },
    { label: 'Yeni Ürün', icon: <Package />, href: '/products/new' },
    { label: 'Sipariş Oluştur', icon: <ShoppingCart />, href: '/orders/create' },
    { label: 'Tara', icon: <ScanLine />, href: '/scan' },
    { label: 'Rapor', icon: <History />, href: '/history' },
    { label: 'Lokasyonlar', icon: <MapPin />, href: '/locations' },
    { label: 'Etiket', icon: <Printer />, href: '/labels/maker' },
    { label: 'Ayarlar', icon: <Settings />, href: '/settings' },
  ];

  return {
    loading,
    stats,
    lowStockProducts,
    quickActions,
  };
}

/**
 * MASAÜSTÜ DASHBOARD
 *
 * Buradaki div'in İÇİNE şu an kullandığın mevcut dashboard kodunu
 * (istatistik kartları, tablolar vs ne varsa) aynen taşı.
 * Sadece className'leri elleme, hidden/lg:flex kısmı kalsın.
 */
function DesktopDashboard() {
  const { loading, stats, lowStockProducts, quickActions } = useDashboardCore();

  if (loading) {
    return (
      <div className="min-h-dvh flex-col bg-app-bg">
        <div className="flex-1 flex flex-col">
          <TopBar title="Ana Panel" />
          <main className="flex-1 p-6 text-center">
            Ana panel yükleniyor...
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <aside className="w-60 border-r bg-surface/80 hidden lg:flex flex-col fixed inset-y-0 left-0">
        <div className="h-16 flex items-center px-4 border-b">
          <span className="font-bold text-lg">StockPilot</span>
        </div>
        <div className="flex-1 p-2">
          {quickActions.map((item) => (
            <Link
              key={item.label}
              href={item.href || '#'}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-60">
        <TopBar title="Ana Panel" />

        <main className="flex-1 p-6 space-y-6">
          <section className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-subtext">
                  <Boxes className="w-4 h-4" />
                  Ürün Çeşidi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalVariety}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-subtext">
                  <Package className="w-4 h-4" />
                  Toplam Stok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalQuantity}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-subtext text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  Kritik Stok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.criticalStockCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-subtext text-destructive">
                  <XCircle className="w-4 h-4" />
                  Tükenmiş
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.outOfStockCount}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-3 gap-6">
            <div className="col-span-3">
              <Section
                title="Kritik Stoktaki Ürünler"
                rightLabel="Tümünü Gör"
                rightHref="/stock?filter=low"
              >
                <Card>
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.map((p) => (
                      <ListItem
                        key={p.id}
                        title={p.name}
                        subtitle={`${p.currentStock} adet kaldı`}
                        thumb={p.imageUrl}
                        status={p.isOutOfStock ? 'out' : 'low'}
                        statusLabel={p.isOutOfStock ? 'Tükendi' : 'Düşük'}
                        href={`/product/${p.id}`}
                        chevron
                      />
                    ))
                  ) : (
                    <p className="p-4 text-center text-sm text-subtext">
                      Kritik seviyede ürün bulunmuyor.
                    </p>
                  )}
                </Card>
              </Section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/**
 * MOBİL DASHBOARD
 *
 * Burada tamamen yeni, sade bir mobil tasarım var.
 * İstersen zamanla genişletiriz.
 */
function MobileDashboard() {
  return (
    <div className="min-h-dvh flex flex-col bg-app-bg">
      {/* Üst bar */}
      <TopBar title="StockPilot" />

      <div className="flex-1 p-4 space-y-4">
        {/* Hızlı Tara kartı */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex flex-col gap-4">
             <div>
              <p className="text-xs text-muted-foreground">
                Depoda hızlı işlem
              </p>
              <h1 className="text-xl font-bold">QR Kod Tara</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Ürün detayı veya stok hareketi için kodu okut.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="w-full h-14 rounded-full flex items-center justify-center gap-2 text-base"
            >
              <Link href="/scan">
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
            <Link href="/stock">
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
            <Link href="/products">
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
            <Link href="/locations">
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
            <Link href="/history">
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

        {/* Son hareketler – şimdilik dummy, sonra gerçek veri çekeriz */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Son hareketler</span>
              <Link
                href="/history"
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