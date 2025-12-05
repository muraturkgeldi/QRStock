
'use client';

import { useState, useMemo } from 'react';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser } from '@/firebase';
import { updateProduct } from '@/app/actions';
import type { Product } from '@/lib/types';
import { Save, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

function ProductRow({ product, user }: { product: Product; user: any }) {
    const { toast } = useToast();
    const [sku, setSku] = useState(product.sku || '');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanged, setHasChanged] = useState(false);

    const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSku = e.target.value;
        setSku(newSku);
        setHasChanged(newSku !== (product.sku || ''));
    }

    const handleUpdate = async () => {
        if (!user || !hasChanged) return;
        setIsSaving(true);
        const formData = new FormData();
        formData.set('id', product.id);
        // Pass original values for fields we are not changing to prevent them from being wiped out
        formData.set('name', product.name);
        formData.set('description', product.description || '');
        formData.set('minStockLevel', String(product.minStockLevel || 0));
        formData.set('sku', sku);

        try {
            await updateProduct(formData);
            toast({
                title: 'Başarılı!',
                description: `Ürün SKU'su güncellendi: ${sku}`,
            });
            setHasChanged(false); // Reset changed state after successful save
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Hata!',
                description: error.message || "SKU güncellenirken bir hata oluştu.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-2 p-2 border-b last:border-b-0">
            <div className="flex-1 space-y-1">
                <p className="font-semibold text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground">ID: {product.id}</p>
            </div>
            <Input
                value={sku}
                onChange={handleSkuChange}
                placeholder="Görünür Stok Kodu"
                className="w-48"
                disabled={isSaving}
            />
            <Button onClick={handleUpdate} size="icon" disabled={isSaving || !hasChanged}>
                <Save className="w-4 h-4" />
                <span className="sr-only">Kaydet</span>
            </Button>
        </div>
    );
}


export default function FixDataPage() {
    const { user, loading: userLoading } = useUser();
    const { data: products, loading: productsLoading } = useCollection<Product>('products', user?.uid);
    const [searchTerm, setSearchTerm] = useState('');
    
    const isLoading = userLoading || productsLoading;
    
    const filteredProducts = useMemo(() => {
        const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
        if (!searchTerm) {
            return sortedProducts;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return sortedProducts.filter(p => 
            p.name.toLowerCase().includes(lowercasedTerm) ||
            (p.sku && p.sku.toLowerCase().includes(lowercasedTerm)) ||
            p.id.toLowerCase().includes(lowercasedTerm)
        );
    }, [products, searchTerm]);

    return (
        <div className="flex flex-col h-dvh bg-app-bg">
            <TopBar title="Stok Kodu Düzenleme Aracı" />
            <div className="p-4 space-y-4 flex-1 flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>Ürün SKU'larını Düzenle</CardTitle>
                        <CardDescription>
                            Bu araç, ürünlerinizin görünür stok kodlarını (SKU) hızlıca düzenlemenizi sağlar. Hatalı veya eksik kodları buradan düzeltebilirsiniz.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col min-h-0">
                         <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Ürün adı veya kodu ile filtrele..."
                                className="w-full pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <ScrollArea className="flex-1 border rounded-md">
                            <div className="p-1">
                                {isLoading ? (
                                    <p className="p-4 text-center text-muted-foreground">Ürünler yükleniyor...</p>
                                ) : (
                                    <>
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map(product => (
                                            <ProductRow key={product.id} product={product} user={user} />
                                        ))
                                    ) : (
                                        <p className="p-4 text-center text-muted-foreground">Filtreye uygun ürün bulunamadı.</p>
                                    )}
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
