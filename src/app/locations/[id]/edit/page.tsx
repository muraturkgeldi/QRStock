
'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateLocation } from '@/app/actions';
import type { Location } from '@/lib/types';
import { useDoc, useUser } from '@/firebase';
import { PageHeader } from '@/components/PageHeader';
import { EditActionBar } from '@/components/EditActionBar';
import { safeFrom } from '@/lib/nav';

function EditLocationPageContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { id: locationId } = params;
  const { user, loading: userLoading } = useUser();
  const { data: location, loading: locationLoading } = useDoc<Location>(`locations/${locationId}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isLoading = userLoading || locationLoading;
  const fallbackUrl = safeFrom(searchParams.get('from'), '/locations');

  const handleSave = async () => {
    const form = document.getElementById('edit-location-form') as HTMLFormElement;
    if (!form || !location || !user) return;
    
    setIsSubmitting(true);
    const formData = new FormData(form);
    
    try {
      await updateLocation(formData);
      toast({
        title: 'Lokasyon Güncellendi!',
        description: `"${formData.get('name')}" başarıyla güncellendi.`,
      });
      router.push(fallbackUrl);
      router.refresh();
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
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <PageHeader title="Lokasyonu Düzenle" fallback={fallbackUrl} />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!location) {
    notFound();
  }
  
  if (user && location.uid !== user.uid) {
    notFound();
  }

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <PageHeader title="Lokasyonu Düzenle" fallback={fallbackUrl} />
      <div className="p-4">
        <form id="edit-location-form">
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
            </CardContent>
          </Card>
        </form>
         <EditActionBar 
            fallback={fallbackUrl}
            onSave={handleSave}
            saving={isSubmitting}
        />
      </div>
    </div>
  );
}


export default function EditLocationPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <EditLocationPageContent params={params} />
    </Suspense>
  )
}
