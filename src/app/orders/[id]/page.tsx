'use client';

import { notFound, useRouter } from 'next/navigation';
import { useState, useMemo, Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDoc, useUser, useCollection } from '@/firebase';
import type { PurchaseOrder, Location, PurchaseOrderItem, AppUser } from '@/lib/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Package,
  Hash,
  Calendar,
  Pencil,
  MessageSquare,
  Truck,
  CheckCircle2,
  LayoutDashboard,
  Boxes,
  Package2,
  Warehouse,
  History as HistoryIcon,
  ShoppingCart,
  Printer,
  Settings,
  Save,
  Trash2,
  Ban,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { receivePurchaseOrderItem } from '@/app/actions';
import Link from 'next/link';
import TopBar from '@/components/ui/TopBar';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import { usePathname } from 'next/navigation';
import {
  updateOrderMetaAction,
  cancelOrderAction,
  archiveOrderAction,
  hardDeleteOrderAction,
} from './order-actions';


function normalizeOrderDate(raw: any): Date | null {
  if (!raw) return null;

  // Firestore Timestamp (server SDK / client SDK)
  if (typeof raw.toDate === 'function') {
    try {
      const d = raw.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  
  // ISO String
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // Unix ms (number) ise
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // zaten Date ise
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  return null;
}


// 🔹 Status badge stilini üstte fonksiyon olarak tuttuk
function getStatusBadgeClass(status: PurchaseOrder['status']) {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'ordered':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'partially-received':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'received':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-300 line-through';
    case 'archived':
      return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function translateStatus(status: PurchaseOrder['status']) {
  const map: Record<string, string> = {
    draft: 'Taslak',
    ordered: 'Sipariş Verildi',
    'partially-received': 'Kısmen Teslim Alındı',
    received: 'Tamamı Teslim Alındı',
    cancelled: 'İptal Edildi',
    archived: 'Arşivlendi'
  };
  return map[status] || status;
}

/* 🔔 ÜRÜN TESLİM AL DİALOGU (Aynen korunuyor) */
function ReceiveItemDialog({
  order,
  item,
  locations,
  isOpen,
  onOpenChange,
}: {
  order: PurchaseOrder;
  item: PurchaseOrderItem;
  locations: Location[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();
  const [selectedCorridor, setSelectedCorridor] = useState<string | undefined>();
  const [selectedShelf, setSelectedShelf] = useState<string | undefined>();
  const [quantity, setQuantity] = useState<number>(item.remainingQuantity);

  const { warehouses, corridorsByWarehouse, shelvesByCorridor } = useMemo(() => {
    const wh: Location[] = [];
    const cwh = new Map<string, Location[]>();
    const sc = new Map<string, Location[]>();

    locations.forEach((loc) => {
      if (loc.type === 'warehouse') {
        wh.push(loc);
      } else if (loc.type === 'corridor' && loc.parentId) {
        const list = cwh.get(loc.parentId) || [];
        list.push(loc);
        cwh.set(
          loc.parentId,
          list.sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else if (loc.type === 'shelf' && loc.parentId) {
        const list = sc.get(loc.parentId) || [];
        list.push(loc);
        sc.set(
          loc.parentId,
          list.sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
    });
    wh.sort((a, b) => a.name.localeCompare(b.name));
    return {
      warehouses: wh,
      corridorsByWarehouse: cwh,
      shelvesByCorridor: sc,
    };
  }, [locations]);

  const corridors = useMemo(() => {
    if (!selectedWarehouse) return [];
    return corridorsByWarehouse.get(selectedWarehouse) || [];
  }, [selectedWarehouse, corridorsByWarehouse]);

  const shelves = useMemo(() => {
    if (!selectedCorridor) return [];
    return shelvesByCorridor.get(selectedCorridor) || [];
  }, [selectedCorridor, shelvesByCorridor]);

  const handleSubmit = async () => {
    if (!selectedShelf || quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Lokasyon seçimi ve miktar zorunludur.',
      });
      return;
    }
    if (quantity > item.remainingQuantity) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: `En fazla ${item.remainingQuantity} adet teslim alabilirsiniz.`,
      });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('orderId', order.id);
    formData.append('productId', item.productId);
    formData.append('receivedQuantity', String(quantity));
    formData.append('locationId', selectedShelf);

    try {
      await receivePurchaseOrderItem(formData);
      toast({
        title: 'Başarılı!',
        description: `${quantity} adet ${item.productName} stoğa eklendi.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error.message || 'İşlem sırasında bir hata oluştu.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ürün Teslim Al: {item.productName}</DialogTitle>
          <DialogDescription>
            Bu ürünü stoğa eklemek için teslim alınan adedi ve konulacağı rafı
            seçin. Kalan Miktar: {item.remainingQuantity}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Teslim Alınan Miktar</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              max={item.remainingQuantity}
              min={1}
            />
          </div>
          <div className="space-y-4">
            <Label>Konulacağı Lokasyon</Label>
            <div className="space-y-2">
              <Select
                onValueChange={(value) => {
                  setSelectedWarehouse(value);
                  setSelectedCorridor(undefined);
                  setSelectedShelf(undefined);
                }}
                value={selectedWarehouse}
                disabled={warehouses.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      warehouses.length > 0
                        ? 'Depo seçin...'
                        : 'Önce bir depo oluşturun'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedWarehouse && (
              <div className="space-y-2">
                <Select
                  onValueChange={(value) => {
                    setSelectedCorridor(value);
                    setSelectedShelf(undefined);
                  }}
                  value={selectedCorridor}
                  disabled={corridors.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        corridors.length > 0
                          ? 'Koridor seçin...'
                          : 'Bu depoda koridor yok'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {corridors.map((corridor) => (
                      <SelectItem key={corridor.id} value={corridor.id}>
                        {corridor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCorridor && (
              <div className="space-y-2">
                <Select
                  onValueChange={setSelectedShelf}
                  value={selectedShelf}
                  disabled={shelves.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        shelves.length > 0
                          ? 'Raf seçin...'
                          : 'Bu koridorda raf yok'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {shelves.map((shelf) => (
                      <SelectItem key={shelf.id} value={shelf.id}>
                        {shelf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">İptal</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedShelf || quantity <= 0}
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Stoğa Ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* 🧱 Ortak içerik – hem mobilden hem masaüstünden bunu kullanacağız */
function OrderDetailContent({
  order,
  locations,
  currentUser
}: {
  order: PurchaseOrder & { internalNote?: string };
  locations: Location[];
  currentUser: AppUser | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PurchaseOrderItem | null>(
    null
  );

  const totalQuantity = useMemo(
    () => order.items.reduce((acc, item) => acc + item.quantity, 0),
    [order.items]
  );
  
  const safeOrderDate = normalizeOrderDate(order.orderDate);
  const isActionable = order.status !== 'received' && order.status !== 'cancelled' && order.status !== 'archived';
  const isArchivable = order.status !== 'archived';
  const isAdmin = currentUser?.role === 'admin';


  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <CardTitle>Genel Bilgiler</CardTitle>
              <Badge
                variant="outline"
                className={cn(getStatusBadgeClass(order.status))}
              >
                {translateStatus(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-2">
                <Hash className="w-4 h-4" /> Sipariş Numarası
              </span>
              <span className="font-mono">{order.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Sipariş Tarihi
              </span>
              <span className="font-medium">
                {safeOrderDate
                  ? format(safeOrderDate, 'dd MMMM yyyy, HH:mm', { locale: tr })
                  : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" /> Toplam Ürün
              </span>
              <span className="font-medium">
                {totalQuantity} adet ({order.items.length} çeşit)
              </span>
            </div>
             {order.internalNote && (
                <div className="flex items-start justify-between gap-4 pt-2 border-t">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> İç Not
                    </span>
                    <p className="font-medium text-right whitespace-pre-wrap">{order.internalNote}</p>
                </div>
            )}
          </CardContent>
           {isActionable && (
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/orders/${order.id}/edit`}>
                  <Pencil className="w-4 h-4 mr-2" /> Siparişi Düzenle
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sipariş Kalemleri</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {order.items.map((item) => (
                <li
                  key={item.productId}
                  className={cn(
                    'p-3 rounded-lg flex flex-col gap-3',
                    item.remainingQuantity > 0
                      ? 'bg-muted/30'
                      : 'bg-green-50 dark:bg-green-900/20'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {item.productSku}
                      </p>
                      <div className="text-sm space-x-4">
                        <span className="font-bold text-primary">
                          Sipariş Miktarı: {item.quantity}
                        </span>
                        <span
                          className="font-semibold text-amber-600"
                          title="Bu satınalma siparişinden henüz teslim alınmamış miktar"
                        >
                          Teslim Bekleyen: {item.remainingQuantity}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.remainingQuantity > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedItem(item)}
                          disabled={!isActionable}
                        >
                          <Truck className="w-4 h-4 mr-2" /> Teslim Al
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-white border-green-600 text-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Tamamlandı
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 bg-background/50 p-2 rounded-md">
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="italic">{item.description}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {isActionable && (
          <Card>
            <CardHeader>
                <CardTitle>Sipariş Notu</CardTitle>
                <CardDescription>Siparişe özel not ekleyin.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData) => {
                  const note = formData.get('note');
                  setIsNoteSubmitting(true);
                  await updateOrderMetaAction(order.id, { note: typeof note === 'string' ? note : '' });
                  toast({ title: 'Not Kaydedildi' });
                  setIsNoteSubmitting(false);
                }}
                className="flex flex-col sm:flex-row gap-2 items-start"
              >
                <div className='flex-1 w-full'>
                    <Label htmlFor="note" className="sr-only">İç Not</Label>
                    <Input
                        id="note"
                        name="note"
                        defaultValue={order.internalNote ?? ''}
                        placeholder="Bu siparişe özel iç not..."
                        className="text-sm"
                        disabled={isNoteSubmitting}
                    />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={isNoteSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isNoteSubmitting ? 'Kaydediliyor...' : 'Notu Kaydet'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
             <CardTitle>Diğer İşlemler</CardTitle>
          </CardHeader>
           <CardContent className="space-y-2">
            {isActionable && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full text-amber-600 border-amber-600/50 hover:bg-amber-100/50 hover:text-amber-700 dark:hover:bg-amber-900/20">
                        <Ban className="mr-2 h-4 w-4" /> Siparişi İptal Et
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Siparişi iptal etmek istediğinize emin misiniz?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>Bu işlem geri alınamaz. Siparişin durumu "İptal Edildi" olarak değiştirilecektir.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            await cancelOrderAction(order.id, 'Kullanıcı panelinden iptal edildi');
                            toast({ title: "Sipariş İptal Edildi" });
                        }}>Evet, İptal Et</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {isArchivable && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full text-neutral-600 border-neutral-600/50 hover:bg-neutral-100/50 hover:text-neutral-700 dark:hover:bg-neutral-900/20">
                        <Archive className="mr-2 h-4 w-4" /> Siparişi Arşive Taşı
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Siparişi arşivlemek istediğinize emin misiniz?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>Sipariş listeden kaldırılacak ancak silinmeyecektir. Bu işlem geri alınamaz.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            await archiveOrderAction(order.id);
                            toast({ title: "Sipariş Arşivlendi" });
                            router.push('/orders');
                        }}>Evet, Arşivle</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {isAdmin && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" /> Siparişi Kalıcı Sil (Admin)
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Siparişi kalıcı olarak silmek istediğinize emin misiniz?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>Bu işlem geri alınamaz. Bu siparişe ait tüm veriler sistemden kalıcı olarak silinecektir.</AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => {
                            const res = await hardDeleteOrderAction(order.id);
                            if(res.ok){
                            toast({ title: "Sipariş Silindi" });
                            router.push('/orders');
                            }
                        }}>Evet, Kalıcı Olarak Sil</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
           </CardContent>
        </Card>
      </div>

      {selectedItem && (
        <ReceiveItemDialog
          order={order}
          item={selectedItem}
          locations={locations}
          isOpen={!!selectedItem}
          onOpenChange={(open) => {
            if (!open) setSelectedItem(null);
          }}
        />
      )}
    </>
  );
}

/* 🔀 Ana sayfa – burada mobile / desktop ayrımı yapıyoruz */
export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const orderId = params.id;
  const mode = useLayoutMode(1024);
  const pathname = usePathname();

  const { user, loading: userLoading } = useUser();
  const {
    data: order,
    loading: orderLoading,
  } = useDoc<PurchaseOrder>(`purchaseOrders/${orderId}`);
  const {
    data: locations,
    loading: locationsLoading,
  } = useCollection<Location>('locations', user?.uid);

  const isLoading =
    userLoading || orderLoading || locationsLoading || mode === undefined;

  if (isLoading) {
    // Basit bir loading, hem mobilden hem masaüstünden idare eder
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Sipariş Detayı" />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!order) {
    notFound();
  }

  if (user && order.uid !== user.uid) {
    notFound();
  }

  const safeLocations = locations || [];

  // 📱 MOBİL LAYOUT
  if (mode === 'mobile') {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title={`Sipariş #${order.orderNumber}`} />
        <main className="p-4">
          <OrderDetailContent order={order as any} locations={safeLocations} currentUser={user} />
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

      {/* Sağ taraf – asıl içerik */}
      <div className="flex-1 flex flex-col lg:ml-60">
        <TopBar title={`Sipariş #${order.orderNumber}`} />
        <main className="flex-1 p-6">
          <OrderDetailContent order={order as any} locations={safeLocations} currentUser={user} />
        </main>
      </div>
    </div>
  );
}
