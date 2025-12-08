'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import TopBar from '@/components/ui/TopBar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { useUser, useCollection } from '@/firebase';
import type { PurchaseOrderItem, PurchaseOrder } from '@/lib/types';
import {
  ShoppingCart,
  Search,
  Package,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';


function formatDate(ts: any | undefined): string {
  if (!ts) return '-';
  try {
    const d =
      typeof ts.toDate === 'function'
        ? ts.toDate()
        : ts instanceof Date
        ? ts
        : new Date(ts);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
}

function StatusBadge({ status }: { status: PurchaseOrder['status'] }) {
  let label = '';
  let className = '';

  switch (status) {
    case 'draft':
      label = 'Taslak';
      className =
        'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200 border-slate-200 dark:border-slate-700';
      break;
    case 'ordered':
      label = 'Sipariş Verildi';
      className =
        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      break;
    case 'partially-received':
      label = 'Kısmi Teslim';
      className =
        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-700';
      break;
    case 'received':
      label = 'Tamamlandı';
      className =
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700';
      break;
    case 'cancelled':
        label = 'İptal Edildi';
        className = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-700';
        break;
    case 'archived':
        label = 'Arşivlendi';
        className = 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700';
        break;
  }

  return (
    <Badge variant="outline" className={cn(className)}>
      {label}
    </Badge>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();

  const {
    data: orders,
    loading: ordersLoading,
    error,
  } = useCollection<PurchaseOrder>('purchaseOrders', user?.uid);

  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = userLoading || ordersLoading;

  const filtered = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const list = [...orders]
      .filter(o => o.status !== 'archived') // Arşivlenmişleri gösterme
      .sort((a, b) => {
      const da =
        a.orderDate && typeof a.orderDate.toDate === 'function'
          ? a.orderDate.toDate()
          : new Date(0);
      const db =
        b.orderDate && typeof b.orderDate.toDate === 'function'
          ? b.orderDate.toDate()
          : new Date(0);
      return db.getTime() - da.getTime();
    });

    if (!searchTerm) return list;

    const q = searchTerm.toLowerCase();

    return list.filter((order) => {
      const orderNumberMatch = order.orderNumber
        ?.toLowerCase()
        .includes(q);

      const anyItemMatch = (order.items || []).some((it: any) => {
        const n = it.productName?.toLowerCase() || '';
        const s = it.productSku?.toLowerCase() || '';
        return n.includes(q) || s.includes(q);
      });

      return orderNumberMatch || anyItemMatch;
    });
  }, [orders, searchTerm]);

  if (error) {
    console.error('ORDERS_LIST_ERROR:', error);
    toast({
      variant: 'destructive',
      title: 'Hata',
      description:
        'Siparişler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.',
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-app-bg">
        <TopBar title="Siparişler" />
        <div className="p-4 text-center text-sm text-muted-foreground">
          Siparişler yükleniyor...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-dvh bg-app-bg">
        <TopBar title="Siparişler" />
        <div className="p-4 text-center text-sm text-muted-foreground">
          Siparişleri görmek için giriş yapmalısınız.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-app-bg">
      <TopBar title="Siparişler" />
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Satın Alma Siparişleri
                </CardTitle>
                <CardDescription>
                  Oluşturduğunuz siparişleri görüntüleyin, durumlarını takip
                  edin.
                </CardDescription>
              </div>
              <Button asChild size="sm" className="md:px-4 md:py-2">
                <Link href="/orders/create">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Yeni Sipariş Oluştur
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Sipariş numarası, ürün adı veya stok kodu ile ara..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Mobil görünüm: kart kart */}
            <div className="space-y-3 md:hidden">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchTerm
                    ? 'Aramanıza uygun sipariş bulunamadı.'
                    : 'Henüz sipariş oluşturulmamış.'}
                </p>
              ) : (
                filtered.map((order) => {
                  const itemCount = order.items?.length ?? 0;
                  const dateLabel = formatDate(order.orderDate);

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="w-full text-left border rounded-lg bg-card hover:bg-accent/50 transition-colors p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">
                            {order.orderNumber || order.id}
                          </span>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{dateLabel}</span>
                        <span>{itemCount} kalem ürün</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Masaüstü görünüm: tablo */}
            <div className="hidden md:block">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchTerm
                    ? 'Aramanıza uygun sipariş bulunamadı.'
                    : 'Henüz sipariş oluşturulmamış.'}
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left">
                        <th className="px-4 py-2">Sipariş No</th>
                        <th className="px-4 py-2">Durum</th>
                        <th className="px-4 py-2">Tarih</th>
                        <th className="px-4 py-2">Ürün Adedi</th>
                        <th className="px-4 py-2 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((order) => {
                        const itemCount = order.items?.length ?? 0;
                        const dateLabel = formatDate(order.orderDate);
                        return (
                          <tr
                            key={order.id}
                            className="border-t hover:bg-accent/40 transition-colors"
                          >
                            <td className="px-4 py-2 align-middle font-medium">
                              {order.orderNumber || order.id}
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-4 py-2 align-middle">
                              {dateLabel}
                            </td>
                            <td className="px-4 py-2 align-middle">
                              {itemCount}
                            </td>
                            <td className="px-4 py-2 align-middle text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(`/orders/${order.id}`)
                                }
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Detay
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
