
'use client';

import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDoc, useUser, useCollection } from '@/firebase';
import type { PurchaseOrder, Location, PurchaseOrderItem } from '@/lib/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollText, Package, Hash, Calendar, Pencil, MessageSquare, Check, Truck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { receivePurchaseOrderItem } from '@/app/actions';
import { AppMenu } from '@/components/AppMenu';
import Link from 'next/link';
import TopBar from '@/components/ui/TopBar';

function ReceiveItemDialog({
  user,
  order,
  item,
  locations,
  isOpen,
  onOpenChange,
}: {
  user: any;
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

    locations.forEach(loc => {
      if (loc.type === 'warehouse') {
        wh.push(loc);
      } else if (loc.type === 'corridor' && loc.parentId) {
        const list = cwh.get(loc.parentId) || [];
        list.push(loc);
        cwh.set(loc.parentId, list.sort((a, b) => a.name.localeCompare(b.name)));
      } else if (loc.type === 'shelf' && loc.parentId) {
        const list = sc.get(loc.parentId) || [];
        list.push(loc);
        sc.set(loc.parentId, list.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });
    wh.sort((a, b) => a.name.localeCompare(b.name));
    return { warehouses: wh, corridorsByWarehouse: cwh, shelvesByCorridor: sc };
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
    if (!user || !selectedShelf || quantity <= 0) {
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
                          <SelectValue placeholder={warehouses.length > 0 ? "Depo seçin..." : "Önce bir depo oluşturun"} />
                      </SelectTrigger>
                      <SelectContent>
                          {warehouses.map(warehouse => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
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
                            <SelectValue placeholder={corridors.length > 0 ? "Koridor seçin..." : "Bu depoda koridor yok"} />
                        </SelectTrigger>
                        <SelectContent>
                            {corridors.map(corridor => (
                                <SelectItem key={corridor.id} value={corridor.id}>{corridor.name}</SelectItem>
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
                        required 
                        disabled={shelves.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={shelves.length > 0 ? "Raf seçin..." : "Bu koridorda raf yok"} />
                        </SelectTrigger>
                        <SelectContent>
                            {shelves.map(shelf => (
                                <SelectItem key={shelf.id} value={shelf.id}>{shelf.name}</SelectItem>
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
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedShelf || quantity <= 0}>
            {isSubmitting ? 'Kaydediliyor...' : 'Stoğa Ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: userLoading } = useUser();

  const { data: order, loading: orderLoading } = useDoc<PurchaseOrder>(`purchaseOrders/${orderId}`);
  const { data: locations, loading: locationsLoading } = useCollection<Location>('locations', user?.uid);
  
  const [selectedItem, setSelectedItem] = useState<PurchaseOrderItem | null>(null);

  const isLoading = userLoading || orderLoading || locationsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <TopBar title="Sipariş Detayı"/>
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

  const getStatusBadgeClass = (status: PurchaseOrder['status']) => {
    switch (status) {
        case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
        case 'ordered': return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'partially-received': return 'bg-amber-100 text-amber-800 border-amber-300';
        case 'received': return 'bg-green-100 text-green-800 border-green-300';
        default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

    const translateStatus = (status: PurchaseOrder['status']) => {
        const map = {
            'draft': 'Taslak',
            'ordered': 'Sipariş Verildi',
            'partially-received': 'Kısmen Teslim Alındı',
            'received': 'Tamamı Teslim Alındı',
        };
        return map[status] || status;
    };
    
    const totalQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);


  return (
    <div className="flex flex-col">
      <TopBar title={`Sipariş #${order.orderNumber}`}/>
      <div className="p-4 space-y-4">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>Genel Bilgiler</CardTitle>
                    <Badge variant="outline" className={cn(getStatusBadgeClass(order.status))}>
                        {translateStatus(order.status)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-4 h-4" /> Sipariş Numarası</span>
                    <span className="font-mono">{order.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Sipariş Tarihi</span>
                    <span className="font-medium">{format(new Date(order.orderDate), 'dd MMMM yyyy, HH:mm', { locale: tr })}</span>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Toplam Ürün</span>
                    <span className="font-medium">{totalQuantity} adet ({order.items.length} çeşit)</span>
                </div>
            </CardContent>
             {order.status !== 'received' && (
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                      <Link href={`/orders/${order.id}/edit`}>
                          <Pencil className="w-4 h-4 mr-2"/> Siparişi Düzenle
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
                <li key={item.productId} className={cn("p-3 rounded-lg flex flex-col gap-3", item.remainingQuantity > 0 ? "bg-muted/30" : "bg-green-50 dark:bg-green-900/20")}>
                    <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-1">
                            <p className="font-semibold">{item.productName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.productSku}</p>
                             <div className="text-sm space-x-4">
                                <span className="font-bold text-primary">Sipariş Miktarı: {item.quantity}</span>
                                <span className="font-semibold text-amber-600" title="Bu satınalma siparişinden henüz teslim alınmamış miktar">Teslim Bekleyen: {item.remainingQuantity}</span>
                             </div>
                        </div>
                         <div className="flex items-center gap-2">
                             {item.remainingQuantity > 0 ? (
                                <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                                    <Truck className="w-4 h-4 mr-2"/> Teslim Al
                                </Button>
                             ) : (
                                <Badge variant="outline" className="bg-white border-green-600 text-green-700">
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
      </div>

       {selectedItem && user && (
            <ReceiveItemDialog 
                user={user}
                order={order}
                item={selectedItem}
                locations={locations}
                isOpen={!!selectedItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedItem(null);
                    }
                }}
            />
        )}
    </div>
  );
}
