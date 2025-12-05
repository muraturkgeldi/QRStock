

'use client';

import { useEffect, useState, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateLocation } from '@/app/actions';
import type { Location } from '@/lib/types';
import { Pencil } from 'lucide-react';
import { useDoc, useUser } from '@/firebase';
import Link from 'next/link';

export default function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id: locationId } = use(params);
  const { user, loading: userLoading } = useUser();
  const { data: location, loading: locationLoading } = useDoc<Location>(`locations/${locationId}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isLoading = userLoading || locationLoading;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!location || !user) return;
    
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    
    try {
      await updateLocation(formData);
      toast({
        title: 'Lokasyon Güncellendi!',
        description: `"${formData.get('name')}" başarıyla güncellendi.`,
      });
      // Redirect is handled by the server action
    } catch(error: any) {
       toast({
        variant: 'destructive',
        title: 'Hata',
        description: error.message || 'Lokasyon güncellenirken bir hata oluştu.',
      });
       setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Lokasyonu Düzenle" />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>;
  }

  if (!location) {
    notFound();
  }
  
  if (user && location.uid !== user.uid) {
    notFound();
  }

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
       <TopBar title="Lokasyonu Düzenle" />
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Lokasyon Detayları</CardTitle>
              <CardDescription>Lokasyon adını güncelleyebilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <input type="hidden" name="locationId" value={location.id} />
              
              <div className="space-y-2">
                <Label htmlFor="name">Lokasyon Adı</Label>
                <Input id="name" name="name" defaultValue={location.name} required disabled={isSubmitting}/>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || isSubmitting}>
                <Pencil className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
