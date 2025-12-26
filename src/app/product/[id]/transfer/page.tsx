
'use client';

import { useEffect, useState, useMemo } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { transferStock } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product, Location, StockItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft } from 'lucide-react';
import { useDoc, useCollection, useUser } from '@/firebase';
import { PageHeader } from '@/components/PageHeader';
import { safeFrom } from '@/lib/nav';
import { EditActionBar } from '@/components/EditActionBar';

export default function TransferStockPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { id: productId } = params;

  const { user, loading: userLoading } = useUser();
  const { data: product, loading: productLoading } = useDoc<Product>(`products/${productId}`);
  const { data: locations, loading: locationsLoading } = useCollection<Location>('locations', user?.uid);
  const { data: stockItemsData, loading: stockItemsLoading } = useCollection<StockItem>('stockItems', user?.uid);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourceLocationId, setSourceLocationId] = useState<string | undefined>();
  const [destWarehouseId, setDestWarehouseId] = useState<string | undefined>();
  const [destCorridorId, setDestCorridorId] = useState<string | undefined>();
  
  const isLoading = userLoading || productLoading || locationsLoading || stockItemsLoading;

  const stockItems = useMemo(() => {
    return stockItemsData.filter(item => item.productId === productId && item.quantity > 0);
  }, [stockItemsData, productId]);

  const { warehouses, corridorsByWarehouse, shelvesByCorridor } = useMemo(() => {
    const warehouses = locations.filter(l => l.type === 'warehouse').sort((a, b) => a.name.localeCompare(b.name));
    const corridorsByWarehouse = new Map<string, Location[]>();
    const shelvesByCorridor = new Map<string, Location[]>();

    locations.forEach(loc => {
        if (loc.type === 'corridor' && loc.parentId) {
            const list = corridorsByWarehouse.get(loc.parentId) || [];
            list.push(loc);
            corridorsByWarehouse.set(loc.parentId, list.sort((a, b) => a.name.localeCompare(b.name)));
        } else if (loc.type === 'shelf' && loc.parentId) {
            const list = shelvesByCorridor.get(loc.parentId) || [];
            list.push(loc);
            shelvesByCorridor.set(loc.parentId, list.sort((a, b) => a.name.localeCompare(b.name)));
        }
    });

    return { warehouses, corridorsByWarehouse, shelvesByCorridor };
  }, [locations]);
  
  const sourceLocationsWithDetails = useMemo(() => {
      const locationMap = new Map(locations.map(l => [l.id, l]));
      
      const getParentName = (location: Location) => {
        if (!location.parentId) return '';
        const parent = locationMap.get(location.parentId);
        if (!parent) return '';
        if (parent.type === 'corridor') {
            const grandparent = locationMap.get(parent.parentId!);
            return grandparent ? `${grandparent.name} > ${parent.name}` : parent.name;
        }
        return parent.name;
      }
      
      return stockItems.map(item => {
          const location = locationMap.get(item.locationId);
          if (!location) return null;
          const parentName = getParentName(location);
          return {
              ...item,
              displayName: parentName ? `${parentName} > ${location.name}` : location.name
          }
      }).filter(Boolean).sort((a, b) => a!.displayName.localeCompare(b!.displayName));
  }, [stockItems, locations]);


  const destCorridors = useMemo(() => {
    if (!destWarehouseId) return [];
    return corridorsByWarehouse.get(destWarehouseId) || [];
  }, [destWarehouseId, corridorsByWarehouse]);

  const destShelves = useMemo(() => {
    if (!destCorridorId) return [];
    return shelvesByCorridor.get(destCorridorId) || [];
  }, [destCorridorId, shelvesByCorridor]);


  const handleSave = async () => {
    const form = document.getElementById('transfer-stock-form') as HTMLFormElement;
    if (!form) return;

    if (!user) {
        toast({ variant: 'destructive', title: 'Hata', description: 'Bu işlemi yapmak için giriş yapmalısınız.'});
        return;
    }

    setIsSubmitting(true);
    const formData = new FormData(form);
    const quantity = Number(formData.get('quantity'));
    const sourceStockItem = stockItems.find(item => item.locationId === sourceLocationId);

    if (sourceStockItem && quantity > sourceStockItem.quantity) {
        toast({
            variant: 'destructive',
            title: 'Yetersiz Stok',
            description: `Kaynak lokasyonda sadece ${sourceStockItem.quantity} adet ürün var.`,
        });
        setIsSubmitting(false);
        return;
    }
    
    try {
        await transferStock(formData);
        toast({
            title: 'Transfer Başarılı!',
            description: `${quantity} adet ${product?.name} ürünü transfer edildi.`,
        });
        const backTo = safeFrom(searchParams.get('from'), `/product/${productId}`);
        router.push(backTo);
        router.refresh(); // Ensure data is refetched on the target page
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Hata",
            description: error.message || "Stok transferi sırasında bir hata oluştu."
        });
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <PageHeader title="Stok Transferi" fallback={`/product/${productId}`} />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const maxQuantity = stockItems.find(item => item.locationId === sourceLocationId)?.quantity;

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <PageHeader title="Stok Transferi" fallback={`/product/${productId}`} />
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={60}
              height={60}
              className="rounded-lg object-cover"
              data-ai-hint={product.imageHint}
            />
            <div>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>SKU: {product.sku || product.id}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="transfer-stock-form" className="space-y-6">
              <input type="hidden" name="productId" value={product.id} />
              
              <div className="space-y-2">
                  <Label htmlFor="sourceLocationId">Kaynak Lokasyon</Label>
                   <Select name="sourceLocationId" required onValueChange={setSourceLocationId}>
                      <SelectTrigger id="sourceLocationId">
                          <SelectValue placeholder="Bir lokasyon seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                          {sourceLocationsWithDetails.map(item => (
                              <SelectItem key={item!.locationId} value={item!.locationId}>
                                  {item!.displayName} (Stok: {item!.quantity})
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Adet</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  placeholder="0"
                  required
                  min="1"
                  max={maxQuantity}
                  className="text-base"
                  disabled={!sourceLocationId}
                />
              </div>

              <div className="space-y-4">
                <Label>Hedef Lokasyon</Label>
                <div className="space-y-2">
                  <Select onValueChange={(value) => { setDestWarehouseId(value); setDestCorridorId(undefined); }} disabled={isLoading || warehouses.length === 0 || isSubmitting}>
                      <SelectTrigger id="destWarehouseId">
                          <SelectValue placeholder="Önce depo seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                          {warehouses.map(warehouse => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                </div>
                
                 {destWarehouseId && (
                  <div className="space-y-2">
                    <Select onValueChange={setDestCorridorId} disabled={destCorridors.length === 0 || isSubmitting}>
                        <SelectTrigger id="destCorridorId">
                            <SelectValue placeholder={destCorridors.length > 0 ? "Şimdi koridor seçin..." : "Bu depoda koridor yok"} />
                        </SelectTrigger>
                        <SelectContent>
                            {destCorridors.map(corridor => (
                                <SelectItem key={corridor.id} value={corridor.id}>{corridor.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                )}
                
                {destCorridorId && (
                   <div className="space-y-2">
                    <Select name="destinationLocationId" required disabled={!destShelves || destShelves.length === 0 || isSubmitting}>
                        <SelectTrigger id="destinationLocationId">
                            <SelectValue placeholder={destShelves.length > 0 ? "Son olarak raf seçin..." : "Bu koridorda raf yok"} />
                        </SelectTrigger>
                        <SelectContent>
                            {destShelves.map(shelf => (
                                <SelectItem key={shelf.id} value={shelf.id}>{shelf.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <EditActionBar 
            fallback={safeFrom(searchParams.get('from'), `/product/${productId}`)}
            onSave={handleSave}
            saving={isSubmitting}
            disabled={!sourceLocationId || !destCorridorId || !destShelves || destShelves.length === 0}
        />
      </div>
    </div>
  );
}
