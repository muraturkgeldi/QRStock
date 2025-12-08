
"use client";

import { useState, useMemo } from 'react';
import { notFound, useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { updateStock } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product, Location } from '@/lib/types';
import { useDoc, useCollection, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';


export default function UpdateStockPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id: productId } = params;
  const { user, loading: userLoading } = useUser();

  const { data: product, loading: productLoading } = useDoc<Product>(`products/${productId}`);
  const { data: locations, loading: locationsLoading } = useCollection<Location>('locations', user?.uid);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>();
  const [selectedCorridor, setSelectedCorridor] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  
  const isLoading = userLoading || productLoading || locationsLoading;
  
  // Bind the server action with the user's UID
  const updateStockWithUid = user?.uid ? updateStock.bind(null, user.uid) : undefined;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!updateStockWithUid) {
        toast({
            variant: "destructive",
            title: "Hata",
            description: "İşlem yapmak için giriş yapmalısınız."
        });
        return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
        const result = await updateStockWithUid(formData);
        if (result.ok) {
            toast({
                title: "Başarılı!",
                description: "Stok başarıyla güncellendi."
            });
            router.push(`/product/${productId}`);
            router.refresh();
        } else {
            throw new Error(result.error || "Bilinmeyen bir hata oluştu.");
        }
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Hata",
            description: error.message || "Stok güncellenirken bir hata oluştu."
        });
        setIsSubmitting(false); // Keep form enabled on error
    }
  }

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

  const corridors = useMemo(() => {
    if (!selectedWarehouse) return [];
    return corridorsByWarehouse.get(selectedWarehouse) || [];
  }, [selectedWarehouse, corridorsByWarehouse]);

  const shelves = useMemo(() => {
    if (!selectedCorridor) return [];
    return shelvesByCorridor.get(selectedCorridor) || [];
  }, [selectedCorridor, shelvesByCorridor]);

  if (isLoading) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Stok Güncelle" />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <TopBar title="Stok Güncelle" />
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={80}
              height={80}
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
            <CardTitle>Stok Hareketi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="hidden" name="productId" value={product.id} />
              
              <div className="space-y-2">
                <Label>Hareket Tipi</Label>
                <RadioGroup 
                    name="type" 
                    value={movementType} 
                    onValueChange={(value: 'in' | 'out') => setMovementType(value)} 
                    className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in" id="in" />
                    <Label htmlFor="in" className="font-normal">Giriş</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="out" id="out" />
                    <Label htmlFor="out" className="font-normal">Çıkış</Label>
                  </div>
                </RadioGroup>
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
                  className="text-base"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="warehouseId">Depo</Label>
                  <Select 
                    onValueChange={(value) => {
                      setSelectedWarehouse(value);
                      setSelectedCorridor(undefined);
                    }}
                    disabled={isLoading || warehouses.length === 0}
                  >
                      <SelectTrigger id="warehouseId">
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
                    <Label htmlFor="corridorId">Koridor</Label>
                    <Select 
                        onValueChange={setSelectedCorridor}
                        disabled={corridors.length === 0}
                    >
                        <SelectTrigger id="corridorId">
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
                    <Label htmlFor="locationId">Raf</Label>
                    <Select name="locationId" required disabled={shelves.length === 0}>
                        <SelectTrigger id="locationId">
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
              
              {movementType === 'out' && (
                <div className="space-y-2">
                  <Label htmlFor="requester">Talep Eden</Label>
                  <Input
                    id="requester"
                    name="requester"
                    type="text"
                    placeholder="Talep eden kişinin adı soyadı"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="İşlemle ilgili bir not ekleyin..."
                />
              </div>


              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !selectedCorridor || (shelves && shelves.length === 0) || !updateStockWithUid}>
                {isSubmitting ? 'Güncelleniyor...' : 'Stok Güncelle'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
