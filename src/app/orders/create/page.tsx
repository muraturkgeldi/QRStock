'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import TopBar from '@/components/ui/TopBar';
import { CreateOrderClient } from './CreateOrderClient';
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
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

function CreateOrderPageContent() {
  const mode = useLayoutMode(1024);
  const pathname = usePathname();

  if (mode === undefined) {
    return (
      <div className="p-4 text-center">
        <TopBar title="Sipariş Hazırla" />
        Yükleniyor...
      </div>
    );
  }

  // 📱 MOBİL LAYOUT
  if (mode === 'mobile') {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Sipariş Hazırla" />
        <main>
          <CreateOrderClient />
        </main>
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
      <div className="flex-1 flex flex-col lg:ml-60">
        <TopBar title="Sipariş Hazırla" />
        <main className="flex-1 p-6">
          <div className="bg-surface border rounded-2xl shadow-sm p-4">
            <CreateOrderClient />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <CreateOrderPageContent />
    </Suspense>
  );
}

    
