'use client';

import { Suspense, useState, useMemo } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useUser } from '@/firebase';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Boxes } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { EditActionBar } from '@/components/EditActionBar';
import { safeFrom } from '@/lib/nav';
import type { Product, Location } from '@/lib/types';
import { updateStock } from '@/app/actions';

function BatchUpdateContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();

    const productIds = useMemo(() => {
        const p = searchParams.get('products');
        return p ? p.split(',') : [];
    }, [searchParams]);

    const { data: allProducts, loading: productsLoading } = useCollection<Product>('products', user?.uid);
    const { data: locations, loading: locationsLoading } = useCollection<Location>('locations', user?.uid);

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isLoading = userLoading || productsLoading || locationsLoading;
    const fallbackUrl = safeFrom(searchParams.get('from'), '/stock');

    const products = useMemo(() => {
        if (!allProducts || productIds.length === 0) return [];
        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        return productIds.map(id => productsMap.get(id)).filter((p): p is Product => !!p);
    }, [allProducts, productIds]);
    
    const updateStockWithUid = user?.uid ? updateStock.bind(null, user.uid) : null;

    const handleSave = async () => {
        const form = document.getElementById('batch-update-form') as HTMLFormElement;
        if (!form || !updateStockWithUid) return;

        const formData = new FormData(form);
        const type = formData.get('type') as 'in' | 'out';
        const quantity = Number(formData.get('quantity'));
        const locationId = formData.get('locationId') as string;

        if (!type || !quantity || !locationId || quantity <= 0) {
            toast({
                variant: 'destructive',
                title: 'Eksik Bilgi',
                description: 'Lütfen tüm alanları (tip, miktar > 0, lokasyon) doldurun.'
            });
            return;
        }
        
        setIsSubmitting(true);
        toast({ title: 'Toplu Güncelleme Başladı', description: `${products.length} ürün güncelleniyor...` });

        try {
            for (const productId of productIds) {
                const singleProductFormData = new FormData();
                singleProductFormData.append('productId', productId);
                singleProductFormData.append('type', type);
                singleProductFormData.append('quantity', String(quantity));
                singleProductFormData.append('locationId', locationId);
                await updateStockWithUid(singleProductFormData);
            }
            toast({ title: 'Başarılı!', description: `${products.length} ürünün stoğu başarıyla güncellendi.` });
            router.push(fallbackUrl);
            router.refresh();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Toplu güncelleme sırasında bir hata oluştu.' });
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
             <div className="flex flex-col bg-app-bg min-h-dvh">
                <PageHeader title="Toplu Stok Güncelle" fallback={fallbackUrl} />
                <div className="p-4 text-center">Yükleniyor...</div>
            </div>
        );
    }
    
    if (productIds.length === 0) {
        notFound();
    }

    return (
        <div className="flex flex-col bg-app-bg min-h-dvh">
            <PageHeader title="Toplu Stok Güncelle" fallback={fallbackUrl} />
            <div className="p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Boxes className="w-5 h-5" />
                            Güncellenecek Ürünler
                        </CardTitle>
                        <CardDescription>{products.length} adet ürün güncellenecek.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-48">
                            <div className="space-y-2 pr-4">
                            {products.map(product => (
                                <div key={product.id} className="flex items-center gap-3 p-2 bg-muted rounded-md">
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      width={40}
                                      height={40}
                                      className="rounded-md object-cover"
                                      data-ai-hint={product.imageHint}
                                    />
                                    <p className="font-medium text-sm flex-1">{product.name}</p>
                                    <Badge variant="outline">{product.sku}</Badge>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stok Hareketi Detayları</CardTitle>
                    <CardDescription>Tüm seçili ürünler için ortak hareket bilgilerini girin.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form id="batch-update-form" className="space-y-6">
                      <div className="space-y-2">
                        <Label>Hareket Tipi</Label>
                        <RadioGroup name="type" defaultValue="in" className="flex gap-4">
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
                        <Label htmlFor="quantity">Adet (Her ürün için)</Label>
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

                      <div className="space-y-2">
                        <Label htmlFor="locationId">Lokasyon</Label>
                        <Select name="locationId" required >
                            <SelectTrigger id="locationId">
                                <SelectValue placeholder="Raf veya lokasyon seçin..." />
                            </SelectTrigger>
                            <SelectContent>
                                {locations
                                .filter(l => l.type === 'shelf')
                                .map(location => (
                                    <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                <EditActionBar
                  fallback={fallbackUrl}
                  onSave={handleSave}
                  saving={isSubmitting}
                  disabled={isLoading || productIds.length === 0}
                />
            </div>
        </div>
    );
}

export default function BatchUpdateStockPage() {
    return (
        <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
            <BatchUpdateContent />
        </Suspense>
    )
}
