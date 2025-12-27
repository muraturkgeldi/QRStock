'use client';

import { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Location } from '@/lib/types';
import { addLocation } from '@/app/actions';
import { useCollection, useUser } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/PageHeader';
import { EditActionBar } from '@/components/EditActionBar';
import { safeFrom } from '@/lib/nav';

function NewLocationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  const { data: locations, loading: locationsLoading } = useCollection<Location>('locations', user?.uid);
  const [locationType, setLocationType] = useState<'warehouse' | 'corridor' | 'shelf'>('warehouse');
  const [parentWarehouse, setParentWarehouse] = useState<string | undefined>();
  const [parentCorridor, setParentCorridor] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isLoading = userLoading || locationsLoading;
  
  const warehouses = useMemo(() => locations.filter(l => l.type === 'warehouse'), [locations]);
  const corridors = useMemo(() => locations.filter(l => l.type === 'corridor' && l.parentId === parentWarehouse), [locations, parentWarehouse]);

  const isSaveDisabled = () => {
    if (isLoading || isSubmitting) return true;
    if (locationType === 'corridor' && !parentWarehouse) return true;
    if (locationType === 'shelf' && !parentCorridor) return true;
    return false;
  }

  const handleSave = async () => {
    if (isSaveDisabled()) return;

    const form = document.getElementById('new-location-form') as HTMLFormElement;
    if(!form) return;
    const formData = new FormData(form);

    if (!user) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Lokasyon eklemek için giriş yapmalısınız.' });
      return;
    }
    
    setIsSubmitting(true);

    try {
      await addLocation(formData);
      toast({ title: 'Başarılı!', description: `Lokasyonlar başarıyla eklendi.` });
      const backTo = safeFrom(searchParams.get('from'), '/locations');
      router.push(backTo);
      router.refresh();
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Hata', description: error.message || "Lokasyon eklenirken bir hata oluştu." });
       setIsSubmitting(false);
    }
  };

  const renderNameInput = () => {
    switch (locationType) {
        case 'warehouse':
            return <Input id="name" name="name" placeholder="Ana Depo" required disabled={isSubmitting} />;
        case 'corridor':
            return (
                <>
                    <Textarea id="name" name="name" placeholder="Koridor 1&#10;Koridor 2" required rows={5} disabled={isSubmitting} />
                    <p className="text-xs text-muted-foreground">Her koridoru yeni bir satıra yazın.</p>
                </>
            );
        case 'shelf':
             return (
                <>
                    <Textarea id="name" name="name" placeholder="A-01-30&#10;B-01-15" required rows={5} disabled={isSubmitting} />
                    <p className="text-xs text-muted-foreground">Seri oluşturmak için `A-01-30` gibi bir kalıp veya her rafı yeni bir satıra yazın.</p>
                </>
            );
    }
  }
  
  const parentIdValue = locationType === 'shelf' ? parentCorridor : (locationType === 'corridor' ? parentWarehouse : undefined);

  if (isLoading) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <PageHeader title="Yeni Lokasyon Ekle" fallback={safeFrom(searchParams.get('from'), '/locations')} />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <PageHeader title="Yeni Lokasyon Ekle" fallback={safeFrom(searchParams.get('from'), '/locations')} />
      <div className="p-4">
        <form id="new-location-form">
          <input type="hidden" name="type" value={locationType} />
          {parentIdValue && <input type="hidden" name="parentId" value={parentIdValue} />}
          <Card>
            <CardHeader>
              <CardTitle>Lokasyon Detayları</CardTitle>
              <CardDescription>Yeni depo, koridor veya raf bilgilerini girin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Lokasyon Tipi</Label>
                <RadioGroup
                  value={locationType}
                  onValueChange={(value: 'warehouse' | 'corridor' | 'shelf') => {
                      setLocationType(value);
                      setParentCorridor(undefined);
                      if(value === 'warehouse') setParentWarehouse(undefined);
                  }}
                  className="flex gap-4"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2"><RadioGroupItem value="warehouse" id="warehouse" /><Label htmlFor="warehouse" className="font-normal">Depo</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="corridor" id="corridor" /><Label htmlFor="corridor" className="font-normal">Koridor</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="shelf" id="shelf" /><Label htmlFor="shelf" className="font-normal">Raf</Label></div>
                </RadioGroup>
              </div>

              {(locationType === 'corridor' || locationType === 'shelf') && (
                <div className="space-y-2">
                  <Label htmlFor="parentWarehouse">Ait Olduğu Depo</Label>
                   <Select required onValueChange={(value) => { setParentWarehouse(value); setParentCorridor(undefined); }} disabled={isLoading || warehouses.length === 0 || isSubmitting} value={parentWarehouse}>
                      <SelectTrigger id="parentWarehouse"><SelectValue placeholder={warehouses.length > 0 ? "Depo seçin..." : "Önce bir depo eklemelisiniz."} /></SelectTrigger>
                      <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {locationType === 'shelf' && (
                <div className="space-y-2">
                  <Label htmlFor="parentCorridor">Ait Olduğu Koridor</Label>
                   <Select required onValueChange={setParentCorridor} disabled={isLoading || corridors.length === 0 || isSubmitting || !parentWarehouse} value={parentCorridor}>
                      <SelectTrigger id="parentCorridor"><SelectValue placeholder={corridors.length > 0 ? "Koridor seçin..." : "Bu depoda koridor yok."} /></SelectTrigger>
                      <SelectContent>{corridors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">{locationType === 'warehouse' ? 'Depo Adı' : locationType === 'corridor' ? 'Koridor Adları' : 'Raf Adları'}</Label>
                {renderNameInput()}
              </div>
            </CardContent>
          </Card>
        </form>
        <EditActionBar
          fallback={safeFrom(searchParams.get('from'), '/locations')}
          onSave={handleSave}
          saving={isSubmitting}
          disabled={isSaveDisabled()}
        />
      </div>
    </div>
  );
}


export default function NewLocationPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <NewLocationPageContent />
    </Suspense>
  )
}
