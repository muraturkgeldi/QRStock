
'use client';

import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';
import { Pencil, X } from 'lucide-react';
import { useDoc, useUser } from '@/firebase';
import { useState, FormEvent, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';

function ProductEditForm({ productId }: { productId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const { data: product, loading: productLoading } = useDoc<Product>(`products/${productId}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (product) {
      setTags(product.tags ?? []);
    }
  }, [product]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const value = tagInput.trim().toLowerCase();
      if (!tags.includes(value)) {
        setTags(prev => [...prev, value]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Veritabanı bağlantısı bulunamadı.',
      });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const sku = String(formData.get('sku') || '').trim();
    const minStockRaw = String(formData.get('minStockLevel') || '').trim();
    const minStockLevel = minStockRaw ? Number(minStockRaw) : 0;

    try {
      const ref = doc(firestore, 'products', productId);
      await updateDoc(ref, {
        name,
        description,
        sku,
        minStockLevel,
        tags,
      });

      toast({
        title: 'Başarılı!',
        description: 'Ürün bilgileri başarıyla güncellendi.',
      });
    } catch (error: any) {
      console.error('Product update failed:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error?.message || 'Ürün güncellenirken bir hata oluştu.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = userLoading || productLoading;

  if (isLoading) {
    return <div className="p-4 text-center">Yükleniyor...</div>;
  }

  if (!product) {
    notFound();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Ürün Detayları</CardTitle>
          <CardDescription>Ürün bilgilerini güncelleyin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sku">Stok Kodu (SKU)</Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={product!.sku}
              placeholder="Örn: 150.02.006.0179"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Ürün Adı</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product!.name}
              placeholder="Örn: Kırmızı Kalem"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product!.description}
              placeholder="Ürünle ilgili kısa bir açıklama..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags-input">Etiketler (Enter ile ekle)</Label>
            <Input
              id="tags-input"
              placeholder="Yeni etiket ekle..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={isSubmitting}
            />
            <div className="flex gap-2 flex-wrap pt-2">
              {tags.map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Örn: <strong>boru</strong>, <strong>alüminyum</strong>, <strong>jet50</strong>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minStockLevel">Minimum Stok Seviyesi</Label>
            <Input
              id="minStockLevel"
              name="minStockLevel"
              type="number"
              defaultValue={product!.minStockLevel}
              placeholder="Örn: 10"
              required
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || isSubmitting}>
            <Pencil className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <TopBar title="Ürünü Düzenle" />
      <div className="p-4">
        <ProductEditForm productId={id} />
      </div>
    </div>
  );
}
