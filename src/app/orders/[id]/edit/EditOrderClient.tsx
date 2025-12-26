'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { PurchaseOrderItem, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, Search } from 'lucide-react';
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
import { updateOrderItemsClient } from "@/lib/orders.client";
import { PageHeader } from '@/components/PageHeader';
import { EditActionBar } from '@/components/EditActionBar';
import { safeFrom } from '@/lib/nav';

type EditOrderClientProps = {
  orderId: string;
  initialItems: EditableItem[];
  allProducts: Product[];
};

type EditableItem = PurchaseOrderItem & { _deleted?: boolean };

function AddProductDialog({ 
    allProducts, 
    currentItems,
    onAdd,
    isOpen, 
    onOpenChange 
}: { 
    allProducts: Product[],
    currentItems: EditableItem[],
    onAdd: (products: Product[]) => void,
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void 
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

    const availableProducts = (allProducts || []).filter(p => !currentItems.some(item => !item._deleted && item.productId === p.id));
    
    const filteredProducts = availableProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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

export default function EditOrderClient({ orderId, initialItems, allProducts }: EditOrderClientProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();

  const [items, setItems] = useState<EditableItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);

  const handleQtyChange = (index: number, value: string) => {
    const n = Number(String(value).replace(',', '.'));
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              quantity: Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0,
            }
          : it,
      ),
    );
  };

  const handleNoteChange = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, description: value } : it,
      ),
    );
  };

  const handleRemoveLine = (index: number) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, _deleted: true } : it,
      ),
    );
  };

  const handleAddItems = (productsToAdd: Product[]) => {
    const newItems: EditableItem[] = productsToAdd.map(p => ({
        productId: p.id,
        productName: p.name,
        productSku: p.sku,
        quantity: 1,
        receivedQuantity: 0,
        remainingQuantity: 1,
        description: '',
        _deleted: false,
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const onSave = async () => {
    const payload = items
      .filter((it) => !it._deleted && (it.quantity ?? 0) > 0)
      .map((clean) => {
        const received = Number(clean.receivedQuantity) || 0;
        const ordered = Number(clean.quantity) || 0;
        return {
           productId: clean.productId,
           productName: clean.productName,
           productSku: clean.productSku,
           quantity: ordered,
           description: clean.description || '',
           receivedQuantity: received,
           remainingQuantity: Math.max(0, ordered - received)
        };
      });

    if (payload.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Geçerli satır yok',
        description: 'En az bir satırda miktar 1 veya üzeri olmalı.',
      });
      return;
    }

    setSaving(true);
    try {
      await updateOrderItemsClient(orderId, payload);
      toast({
        title: 'Sipariş güncellendi',
        description: 'Değişiklikler kaydedildi.',
      });
      const backTo = safeFrom(sp.get("from"), `/orders/${orderId}`);
      router.push(backTo);
      router.refresh();
    } catch (e: any) {
      console.error('UPDATE_ORDER_ITEMS_FAIL', e);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: e?.message || 'Değişiklikler kaydedilemedi.',
      });
       setSaving(false);
    }
  };

  return (
    <div className="p-4">
        <PageHeader title="Siparişi Düzenle" fallback={`/orders/${orderId}`} />

        <div className="space-y-3">
          {items.map((item, idx) =>
            item._deleted ? null : (
              <div
                key={item.productId + String(idx)}
                className="border rounded-lg p-3 space-y-2 bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.productSku}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    onClick={() => handleRemoveLine(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">
                      Miktar
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={item.quantity ?? 0}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                    />
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-xs text-muted-foreground mb-1">
                      Ürün Notu
                    </label>
                    <Input
                      value={item.description ?? ''}
                      onChange={(e) => handleNoteChange(idx, e.target.value)}
                      placeholder="Bu ürüne özel not..."
                    />
                  </div>
                </div>
              </div>
            ),
          )}

           <Button type="button" onClick={() => setIsAddProductDialogOpen(true)} variant="outline" className="w-full">
                <PlusCircle className="w-4 h-4 mr-2" />
                Yeni Ürün Ekle
            </Button>
        </div>
      
        <EditActionBar
            fallback={`/orders/${orderId}`}
            onSave={onSave}
            saving={saving}
        />
      
      <AddProductDialog 
        allProducts={allProducts || []}
        currentItems={items}
        onAdd={handleAddItems}
        isOpen={isAddProductDialogOpen}
        onOpenChange={setIsAddProductDialogOpen}
      />
    </div>
  );
}
