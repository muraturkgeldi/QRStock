'use client';

import React, { useMemo, useState, useEffect } from 'react';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useUser } from '@/firebase';
import type { PurchaseOrderItem } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PackageSearch, FilePlus2, ArrowRight, ChevronRight } from 'lucide-react';

// Eğer lib/types içinde PurchaseOrder tipin varsa onu kullan:
// import type { PurchaseOrder } from '@/lib/types';
// yoksa bu minimal tanım iş görür:
type PurchaseOrder = {
  id: string;
  uid: string;
  orderNumber: string;
  orderDate?: string;
  status: 'draft' | 'ordered' | 'partially-received' | 'received';
  items: PurchaseOrderItem[] | any[];
};

// Basit breakpoint hook'u – sadece client tarafında çalışır
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);

  return isMobile;
}

function StatusBadge({ status }: { status: PurchaseOrder['status'] }) {
  const map: Record<PurchaseOrder['status'], { label: string; className: string }> = {
    draft: {
      label: 'Taslak',
      className:
        'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    },
    ordered: {
      label: 'Sipariş Verildi',
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    },
    'partially-received': {
      label: 'Kısmi Teslim',
      className:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    },
    received: {
      label: 'Tamamlandı',
      className:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    },
  };

  const cfg = map[status] || map.draft;
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('tr-TR');
}

function calcTotals(order: PurchaseOrder) {
  const items = order.items || [];
  let lineCount = items.length;
  let totalQty = 0;

  for (const it of items) {
    const q = Number((it as any).quantity ?? 0);
    if (!Number.isNaN(q)) totalQty += q;
  }

  return { lineCount, totalQty };
}

/**
 * MOBİL LİSTE GÖRÜNÜMÜ
 * => Terminal mantığı: sadece liste + detay ekranına git.
 * => Yeni sipariş oluşturma / CRUD yok.
 */
function MobileOrdersView({ orders, loading }: { orders: PurchaseOrder[]; loading: boolean }) {
  const router = useRouter();

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <TopBar title="Satın Alma Siparişleri" />
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <PackageSearch className="w-5 h-5" />
            Siparişler (Terminal)
          </h1>
          {/* Mobilde yeni sipariş oluşturma yok */}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Henüz sipariş yok. Siparişler masaüstünden oluşturulacaktır.
              </div>
            ) : (
              <div className="divide-y">
                {orders.map((o) => {
                  const { lineCount, totalQty } = calcTotals(o);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => router.push(`/orders/${o.id}`)}
                      className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm">{o.orderNumber}</p>
                          <StatusBadge status={o.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(o.orderDate)} • {lineCount} satır • Toplam {totalQty} adet
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * MASAÜSTÜ GÖRÜNÜMÜ
 * => Full: Liste + detay + Yeni Sipariş butonu
 */
function DesktopOrdersView({ orders, loading }: { orders: PurchaseOrder[]; loading: boolean }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId]
  );

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <TopBar title="Satın Alma Siparişleri" />
      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <PackageSearch className="w-5 h-5" />
              Satın Alma Siparişleri
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Logo mantığına yakın masaüstü görünüm: liste + durum + satır toplamları.
            </p>
          </div>
          <Button asChild>
            <Link href="/orders/create">
              <FilePlus2 className="w-4 h-4 mr-2" />
              Yeni Sipariş Oluştur
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)] gap-4 min-h-0 flex-1">
          {/* Sol: Liste */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Sipariş Listesi</CardTitle>
              <CardDescription className="text-xs">
                Tüm siparişleri durumlarına göre görüntüleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Henüz sipariş yok. Üstteki{' '}
                  <span className="font-semibold">Yeni Sipariş Oluştur</span> butonuyla başlayın.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <table className="w-full text-xs">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">No</th>
                        <th className="text-left px-3 py-2 font-medium">Tarih</th>
                        <th className="text-left px-3 py-2 font-medium">Durum</th>
                        <th className="text-right px-3 py-2 font-medium">Satır</th>
                        <th className="text-right px-3 py-2 font-medium">Toplam Adet</th>
                        <th className="text-right px-3 py-2 font-medium">Detay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const { lineCount, totalQty } = calcTotals(o);
                        const isSelected = selectedId === o.id;
                        return (
                          <tr
                            key={o.id}
                            className={
                              'border-b text-[11px] hover:bg-muted/60 cursor-pointer ' +
                              (isSelected ? 'bg-muted/80' : '')
                            }
                            onClick={() => setSelectedId(o.id)}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">{o.orderNumber}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatDate(o.orderDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <StatusBadge status={o.status} />
                            </td>
                            <td className="px-3 py-2 text-right">{lineCount}</td>
                            <td className="px-3 py-2 text-right">{totalQty}</td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/orders/${o.id}`);
                                }}
                              >
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Sağ: Detay paneli */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                {selectedOrder ? selectedOrder.orderNumber : 'Sipariş Detayı'}
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedOrder
                  ? 'Satırları ve durumunu Logo benzeri bir görünümle takip edin.'
                  : 'Soldan bir sipariş seçtiğinizde detayları burada göreceksiniz.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-3">
              {!selectedOrder ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Bir sipariş seçin.
                </div>
              ) : (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Tarih: <strong>{formatDate(selectedOrder.orderDate)}</strong>
                    </span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>

                  <div className="border rounded-md p-2 bg-muted/30">
                    <p className="text-[11px] text-muted-foreground">
                      <strong>Sipariş Özeti:</strong>
                    </p>
                    {(() => {
                      const { lineCount, totalQty } = calcTotals(selectedOrder);
                      return (
                        <p className="text-[11px] mt-1">
                          {lineCount} satır • Toplam{' '}
                          <span className="font-semibold">{totalQty}</span> adet.
                        </p>
                      );
                    })()}
                  </div>

                  <ScrollArea className="flex-1 border rounded-md">
                    <table className="w-full text-[11px]">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="text-left px-2 py-1 font-medium">Stok Kodu</th>
                          <th className="text-left px-2 py-1 font-medium">Ürün Adı</th>
                          <th className="text-right px-2 py-1 font-medium">Miktar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedOrder.items || []).map((it: any, idx: number) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="px-2 py-1 whitespace-nowrap">{it.productSku}</td>
                            <td className="px-2 py-1">
                              <span className="line-clamp-2">{it.productName}</span>
                            </td>
                            <td className="px-2 py-1 text-right">{it.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>

                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/orders/${selectedOrder.id}`)}
                    >
                      Detayı Aç
                    </Button>
                    {/* İleride masaüstüne özel “Siparişi Düzenle”, “Teslim Al” vs. buraya gelir */}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * ANA SAYFA: mobil / masaüstü ayrımı
 */
export default function OrdersPage() {
  const { user, loading: userLoading } = useUser();
  const { data: orders = [], loading } = useCollection<PurchaseOrder>('purchaseOrders', user?.uid);
  const isMobile = useIsMobile();

  if (userLoading || loading) {
    return isMobile ? (
      <MobileOrdersView orders={orders} loading={true} />
    ) : (
      <DesktopOrdersView orders={orders} loading={true} />
    );
  }

  return isMobile ? (
    <MobileOrdersView orders={orders} loading={false} />
  ) : (
    <DesktopOrdersView orders={orders} loading={false} />
  );
}
