
'use client';

import { PageHeader } from '@/components/PageHeader';
import { EditActionBar } from '@/components/EditActionBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';
import { X } from 'lucide-react';
import { useDoc, useUser } from '@/firebase';
import { useState, FormEvent, useEffect, Suspense } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { safeFrom } from '@/lib/nav';

function ProductEditForm({ productId, onSaveSuccess }: { productId: string; onSaveSuccess: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: product, loading: productLoading } = useDoc<Product>(`products/${productId}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('0');

  useEffect(() => {
    if (product) {
      setTags(product.tags ?? []);
      setName(product.name);
      setSku(product.sku);
      setDescription(product.description);
      setMinStockLevel(String(product.minStockLevel || 0));
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

  async function handleSave() {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Veritabanı bağlantısı bulunamadı.' });
      return;
    }
    if (!product) return;

    setIsSubmitting(true);
    
    try {
      const ref = doc(firestore, 'products', productId);
      await updateDoc(ref, {
        name,
        description,
        sku,
        minStockLevel: Number(minStockLevel) || 0,
        tags,
      });

      toast({
        title: 'Başarılı!',
        description: 'Ürün bilgileri başarıyla güncellendi.',
      });
      onSaveSuccess();
    } catch (error: any) {
      console.error('Product update failed:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error?.message || 'Ürün güncellenirken bir hata oluştu.',
      });
      setIsSubmitting(false);
    }
  }


  if (productLoading) {
    return <div className="p-4 text-center">Yükleniyor...</div>;
  }

  if (!product) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Ürünü Düzenle" fallback={safeFrom(useSearchParams().get('from'), `/product/${productId}`)} />
      <Card>
        <CardHeader>
          <CardTitle>Ürün Detayları</CardTitle>
          <CardDescription>Ürün bilgilerini güncelleyin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sku">Stok Kodu (SKU)</Label>
            <Input id="sku" name="sku" value={sku} onChange={e => setSku(e.target.value)} required disabled={isSubmitting}/>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Ürün Adı</Label>
            <Input id="name" name="name" value={name} onChange={e => setName(e.target.value)} required disabled={isSubmitting}/>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" name="description" value={description} onChange={e => setDescription(e.target.value)} disabled={isSubmitting}/>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags-input">Etiketler (Enter ile ekle)</Label>
            <Input id="tags-input" placeholder="Yeni etiket ekle..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} disabled={isSubmitting} />
            <div className="flex gap-2 flex-wrap pt-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minStockLevel">Minimum Stok Seviyesi</Label>
            <Input id="minStockLevel" name="minStockLevel" type="number" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} required disabled={isSubmitting} />
          </div>

        </CardContent>
      </Card>
      <EditActionBar
        fallback={safeFrom(useSearchParams().get('from'), `/product/${productId}`)}
        onSave={handleSave}
        saving={isSubmitting}
      />
    </>
  );
}

function PageContent({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const sp = useSearchParams();

  const handleSuccess = () => {
     const backTo = safeFrom(sp.get("from"), `/product/${id}`);
     router.push(backTo);
     router.refresh();
  }

  return (
    <div className="p-4">
        <ProductEditForm productId={id} onSaveSuccess={handleSuccess} />
    </div>
  );
}

export default function Page({ params }: { params: { id: string } }) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
            <PageContent params={params} />
        </Suspense>
      </div>
    )
}
