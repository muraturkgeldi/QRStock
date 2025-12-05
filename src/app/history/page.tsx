'use client';

import type { Product, StockMovement } from '@/lib/types';
import { HistoryClient } from './HistoryClient';
import { useCollection, useUser } from '@/firebase';
import { useMemo, Suspense } from 'react';
import TopBar from '@/components/ui/TopBar';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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

type EnrichedMovement = StockMovement & { product: Product };

function HistoryPageInner() {
  const mode = useLayoutMode(1024);
  const pathname = usePathname();

  const { user, loading: userLoading } = useUser();
  const { data: movements, loading: movementsLoading } = useCollection<StockMovement>('stockMovements', user?.uid);
  const { data: products, loading: productsLoading } = useCollection<Product>('products', user?.uid);

  const loading = userLoading || movementsLoading || productsLoading;

  const enrichedMovements = useMemo(() => {
    if (loading || !movements.length || !products.length) return [];

    const productsMap = new Map(products.map(p => [p.id, p]));

    return movements
      .map(movement => {
        const product = productsMap.get(movement.productId);
        if (!product) return null;
        return {
          ...movement,
          product,
        } as EnrichedMovement;
      })
      .filter((m): m is EnrichedMovement => !!m);
  }, [movements, products, loading]);

  if (loading || mode === undefined) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Hareket Raporu" />
        <div className="p-4 text-center">Raporlar yükleniyor...</div>
      </div>
    );
  }

  // 📱 MOBİL LAYOUT
  if (mode === 'mobile') {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Hareket Raporu" />
        <div className="flex-1">
          <HistoryClient initialMovements={enrichedMovements} />
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
                key={item.href}
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
        <TopBar title="Hareket Raporu" />
        <main className="flex-1 p-6">
          {/* İstersen buraya ekstra filtre kartları vs ekleriz sonra */}
          <div className="bg-surface border rounded-2xl shadow-sm p-4">
            <HistoryClient initialMovements={enrichedMovements} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <HistoryPageInner />
    </Suspense>
  );
}

    
