
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { withFrom } from '@/lib/nav';

import {
  Card,
  CardContent,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { useUser, useCollection } from '@/firebase';
import type { PurchaseOrder } from '@/lib/types';
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { archiveOrderAction, hardDeleteOrderAction } from './[id]/order-actions';


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

type StatusFilter = 'all' | PurchaseOrder['status'];

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const isLoading = userLoading || ordersLoading;

  const filtered = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    let list = [...orders]
      .filter((o) => o.status !== 'archived')
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

    if (statusFilter !== 'all') {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (!searchTerm) return list;

    const q = searchTerm.toLowerCase();

    return list.filter((order) => {
      const orderNumberMatch = order.orderNumber?.toLowerCase().includes(q);
      const anyItemMatch = (order.items || []).some((it: any) => {
        const n = it.productName?.toLowerCase() || '';
        const s = it.productSku?.toLowerCase() || '';
        return n.includes(q) || s.includes(q);
      });
      return orderNumberMatch || anyItemMatch;
    });
  }, [orders, searchTerm, statusFilter]);

  if (error) {
    console.error('ORDERS_LIST_ERROR:', error);
    toast({
      variant: 'destructive',
      title: 'Hata',
      description:
        'Siparişler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.',
    });
  }

  const headerActions = (
    <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
            <Link href={withFrom('/orders/import', '/orders')}>
                <FileUp className="mr-2 h-4 w-4" />
                İçe Aktar
            </Link>
        </Button>
        <Button asChild size="sm">
            <Link href={withFrom('/orders/create', '/orders')}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Yeni Sipariş
            </Link>
        </Button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh bg-app-bg">
        <PageHeader title="Satın Alma Siparişleri" fallback="/dashboard" right={headerActions} />
        <div className="p-4 pt-0 space-y-4">
            <Card>
            <CardContent className="pt-6 space-y-4">
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
                <div className="flex flex-wrap gap-2 text-xs pt-1">
                {[
                    { key: 'all', label: 'Tümü' },
                    { key: 'ordered', label: 'Sipariş Verildi' },
                    { key: 'partially-received', label: 'Kısmi Teslim' },
                    { key: 'received', label: 'Tamamlandı' },
                    { key: 'cancelled', label: 'İptal' },
                ].map((opt) => (
                    <Button
                    key={opt.key}
                    type="button"
                    size="sm"
                    variant={statusFilter === opt.key ? 'default' : 'outline'}
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setStatusFilter(opt.key as StatusFilter)}
                    >
                    {opt.label}
                    </Button>
                ))}
                </div>
                
                {isLoading && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Siparişler yükleniyor...
                    </div>
                )}
                
                {!isLoading && (
                  <>
                    <div className="hidden md:block">
                      {filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {searchTerm || statusFilter !== 'all'
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
                                      <Link href={withFrom(`/orders/${order.id}`, '/orders')} className="hover:underline">
                                        {order.orderNumber || order.id}
                                      </Link>
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
                                        <div className="flex items-center justify-end gap-2">
                                        <Button asChild size="sm" variant="outline">
                                           <Link href={withFrom(`/orders/${order.id}`, '/orders')}>
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                Detay
                                            </Link>
                                        </Button>
                                        </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
            </CardContent>
            </Card>
        </div>
    </div>
  );
}
