'use client';

import { useState } from 'react';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { addProduct } from '@/app/actions';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

/**
 * Basit tag alanı
 */
function TagField({
  tags,
  setTags,
  disabled,
}: {
  tags: string[];
  setTags: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [tagInput, setTagInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const value = tagInput.trim().toLowerCase();
      if (!tags.includes(value)) {
        setTags([...tags, value]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="tags-input">Etiketler (Enter ile ekle)</Label>
      <Input
        id="tags-input"
        placeholder="Yeni etiket ekle..."
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      {/* server action'a gidecek gizli alan */}
      <input type="hidden" name="tags" value={tags.join(',')} />
      <div className="flex gap-2 flex-wrap pt-2">
        {tags.map((tag) => (
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
  );
}

export default function NewProductPage() {
  const { user, loading: userLoading } = useUser();
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);

    try {
        await addProduct(formData);
        toast({
          title: 'Ürün Oluşturuldu!',
          description: `"${formData.get('name')}" başarıyla eklendi.`,
        });
        router.push('/stock');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Hata!',
            description: error.message || 'Ürün oluşturulurken bir hata oluştu.',
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Yeni Ürün Ekle" />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Yeni Ürün Ekle" />
        <div className="p-4 text-center">
          Oturum bulunamadı. Lütfen tekrar giriş yap.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <TopBar title="Yeni Ürün Ekle" />
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Yeni Ürün</CardTitle>
            <CardDescription>Stok sistemine yeni bir ürün ekleyin.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Server action */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* 🔥 UID'i forma gömüyoruz */}
              <input type="hidden" name="uid" value={user.uid} />

              <div className="space-y-2">
                <Label htmlFor="sku">Stok Kodu (SKU)</Label>
                <Input
                  id="sku"
                  name="sku"
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
                  placeholder="Örn: Kırıcı Çubuk Sabitleyici-Q8"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Ürünle ilgili kısa bir açıklama..."
                  disabled={isSubmitting}
                />
              </div>

              <TagField tags={tags} setTags={setTags} disabled={isSubmitting}/>

              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Minimum Stok Seviyesi</Label>
                <Input
                  id="minStockLevel"
                  name="minStockLevel"
                  type="number"
                  placeholder="Örn: 10"
                  defaultValue={0}
                  disabled={isSubmitting}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet ve Stoka Dön'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
