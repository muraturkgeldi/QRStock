'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import TopBar from '@/components/ui/TopBar';
import { useCollection, useUser } from '@/firebase';
import type { Product, StockItem } from '@/lib/types';
import { StockClient } from './StockClient';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import {
  LayoutDashboard,
  Boxes,
  Package2,
  Warehouse,
  History as HistoryIcon,
  ShoppingCart,
  Printer,
  Settings,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface EnrichedProduct extends Product {
  currentStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

function StockPageInner() {
  const mode = useLayoutMode(1024);
  const pathname = usePathname();
  const { user, loading: userLoading } = useUser();

  const { data: products, loading: productsLoading } =
    useCollection<Product>('products', user?.uid);
  const { data: stockItems, loading: stockItemsLoading } =
    useCollection<StockItem>('stockItems', user?.uid);

  const loading = userLoading || productsLoading || stockItemsLoading;

  const enrichedProducts: EnrichedProduct[] = useMemo(() => {
    if (loading || !products || !stockItems) return [];

    const productStockTotals = new Map<string, number>();
    stockItems.forEach((item) => {
      const currentTotal =
        (productStockTotals.get(item.productId) || 0) + item.quantity;
      productStockTotals.set(item.productId, currentTotal);
    });

    const ep = products
      .map((product) => {
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
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return ep;
  }, [products, stockItems, loading]);

  if (mode === undefined || loading) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Stok ve Ürünler" />
        <div className="p-4 text-center">Ürünler yükleniyor...</div>
      </div>
    );
  }

  // 📱 MOBİL LAYOUT
  if (mode === 'mobile') {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Stok ve Ürünler" />
        <StockClient initialProducts={enrichedProducts} />
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
    { label: 'Stoklar', href: '/stock', icon: Boxes },
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
        <TopBar title="Stok ve Ürünler" />
        <main className="flex-1">
          <StockClient initialProducts={enrichedProducts} />
        </main>
      </div>
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <StockPageInner />
    </Suspense>
  );
}

    
