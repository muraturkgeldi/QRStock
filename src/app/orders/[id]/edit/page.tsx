
'use client';

import { use, useMemo, useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useDoc, useUser, useCollection } from '@/firebase';
import type { PurchaseOrder, PurchaseOrderItem, Product } from '@/lib/types';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updatePurchaseOrder } from '@/app/actions';
import { Save, Trash2, PlusCircle, Search } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

function AddProductDialog({ 
    allProducts, 
    currentItems,
    onAdd,
    isOpen, 
    onOpenChange 
}: { 
    allProducts: Product[],
    currentItems: PurchaseOrderItem[],
    onAdd: (products: Product[]) => void,
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void 
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

    const availableProducts = useMemo(() => {
        const currentIds = new Set(currentItems.map(item => item.productId));
        return allProducts.filter(p => !currentIds.has(p.id));
    }, [allProducts, currentItems]);
    
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return availableProducts;
        const lowerTerm = searchTerm.toLowerCase();
        return availableProducts.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            (p.sku && p.sku.toLowerCase().includes(lowerTerm))
        );
    }, [availableProducts, searchTerm]);

    const handleToggle = (productId: string) => {
        setSelectedProductIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    const handleConfirm = () => {
        const productsToAdd = allProducts.filter(p => selectedProductIds.has(p.id));
        onAdd(productsToAdd);
        onOpenChange(false);
        setSelectedProductIds(new Set());
        setSearchTerm('');
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Siparişe Ürün Ekle</DialogTitle>
                    <DialogDescription>
                        Eklemek istediğiniz ürünleri seçin.
                    </DialogDescription>
                </DialogHeader>
                 <div className="relative my-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Ürün adı veya kodu ile ara..."
                        className="w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <ScrollArea className="h-72">
                    <div className="space-y-2 pr-4">
                    {filteredProducts.map(product => (
                        <div key={product.id} onClick={() => handleToggle(product.id)}
                            className={`flex items-center gap-3 p-2 border rounded-md cursor-pointer transition-colors ${selectedProductIds.has(product.id) ? 'bg-accent border-primary' : 'hover:bg-muted/50'}`}>
                            <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="rounded-md object-cover"/>
                            <div className="flex-1">
                               <p className="font-semibold text-sm">{product.name}</p>
                               <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">İptal</Button>
                    </DialogClose>
                    <Button onClick={handleConfirm} disabled={selectedProductIds.size === 0}>
                        {selectedProductIds.size} Ürün Ekle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type EditOrderPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditOrderPage({ params }: EditOrderPageProps) {
    const { id: orderId } = use(params);
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();

    const { data: order, loading: orderLoading } = useDoc<PurchaseOrder>(`purchaseOrders/${orderId}`);
    const { data: allProducts, loading: productsLoading } = useCollection<Product>('products', user?.uid);
    
    const [items, setItems] = useState<PurchaseOrderItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);

    useEffect(() => {
        if (order) {
            setItems(order.items);
        }
    }, [order]);

    const isLoading = userLoading || orderLoading || productsLoading;
    
    const handleQuantityChange = (productId: string, value: string) => {
        const quantity = parseInt(value, 10);
        setItems(prevItems =>
            prevItems.map(item =>
                item.productId === productId ? { ...item, quantity: isNaN(quantity) ? 0 : quantity } : item
            )
        );
    };
    
    const handleDescriptionChange = (productId: string, description: string) => {
        setItems(prevItems =>
            prevItems.map(item =>
                item.productId === productId ? { ...item, description } : item
            )
        );
    };
    
    const handleRemoveItem = (productId: string) => {
        setItems(prevItems => prevItems.filter(item => item.productId !== productId));
    };

    const handleAddItems = (productsToAdd: Product[]) => {
        const newItems: PurchaseOrderItem[] = productsToAdd.map(p => ({
            productId: p.id,
            productName: p.name,
            productSku: p.sku,
            quantity: 1,
            receivedQuantity: 0,
            remainingQuantity: 1,
            description: ''
        }));
        setItems(prev => [...prev, ...newItems]);
    };
    
    const cleanedItemsForSave = useMemo(() =>
      (items ?? [])
        .filter(it => (it.quantity ?? 0) > 0)
        .map(it => ({
          productId: it.productId,
          productName: it.productName,
          productSku: it.productSku,
          quantity: it.quantity,
          receivedQuantity: it.receivedQuantity,
          remainingQuantity: 0, // This will be recalculated on the server
          description: it.description ?? '',
        })),
    [items]);
    
    const handleFormSubmit = async () => {
        if (cleanedItemsForSave.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Geçersiz İşlem',
                description: 'Siparişte en az 1 satır kalmalı. Tüm satırları sildiyseniz siparişi iptal edin.',
            });
            return;
        }
        
        setIsSubmitting(true);
        toast({ title: 'Kaydediliyor...', description: 'Sipariş güncelleniyor, lütfen bekleyin.' });

        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('items', JSON.stringify(cleanedItemsForSave));
        
        try {
            await updatePurchaseOrder(formData);
            toast({ title: 'Başarılı!', description: 'Sipariş başarıyla güncellendi.' });
            router.push(`/orders/${orderId}`);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: error.message || 'Sipariş güncellenirken bir hata oluştu.',
            });
             setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col">
                <TopBar title="Sipariş Düzenle" />
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

    if(order.status === 'received' || order.status === 'cancelled') {
        return (
             <div className="flex flex-col">
                <TopBar title="Sipariş Düzenlenemez" />
                <div className="p-4 text-center">Tamamlanmış veya iptal edilmiş siparişler düzenlenemez.</div>
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            <TopBar title={`Sipariş Düzenle: #${order.orderNumber}`} />
            <div className="p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sipariş Kalemleri</CardTitle>
                        <CardDescription>Miktarları değiştirin, not ekleyin veya ürünleri silin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.map(item => (
                            <div key={item.productId} className="flex flex-col gap-3 p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">{item.productSku}</p>
                                    </div>
                                     <Button type="button" onClick={() => handleRemoveItem(item.productId)} variant="ghost" size="icon" className="text-destructive h-8 w-8">
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </div>
                                <div className="flex items-end gap-2">
                                     <div className="w-24">
                                        <Label htmlFor={`qty-${item.productId}`} className="text-xs">Miktar</Label>
                                         <Input
                                            id={`qty-${item.productId}`}
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            step={1}
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                                            className="w-full text-center text-base"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label htmlFor={`desc-${item.productId}`} className="text-xs">Ürün Notu</Label>
                                        <Input 
                                            id={`desc-${item.productId}`}
                                            value={item.description}
                                            onChange={(e) => handleDescriptionChange(item.productId, e.target.value)}
                                            placeholder="Bu ürüne özel not..."
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                         <Button type="button" onClick={() => setIsAddProductDialogOpen(true)} variant="outline" className="w-full">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Yeni Ürün Ekle
                        </Button>
                    </CardContent>
                </Card>
                 <div className="sticky bottom-4 pb-4">
                    <Button onClick={handleFormSubmit} disabled={isSubmitting} className="w-full" size="lg">
                        <Save className="mr-2 h-5 w-5" />
                        {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </Button>
                </div>
            </div>
            {user && (
                <AddProductDialog 
                    allProducts={allProducts}
                    currentItems={items}
                    onAdd={handleAddItems}
                    isOpen={isAddProductDialogOpen}
                    onOpenChange={setIsAddProductDialogOpen}
                />
            )}
        </div>
    );
}


    

    