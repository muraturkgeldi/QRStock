
'use client';

import { useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
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
import { useState, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';

export default function NewLocationPage() {
  const router = useRouter();
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Lokasyon eklemek için giriş yapmalısınız.' });
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await addLocation(formData);
      toast({ title: 'Başarılı!', description: `Lokasyonlar başarıyla eklendi.` });
      router.push('/locations');
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Hata', description: error.message || "Lokasyon eklenirken bir hata oluştu." });
    } finally {
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
  
  const isSubmitDisabled = () => {
    if (isSubmitting || isLoading) return true;
    if (locationType === 'corridor' && !parentWarehouse) return true;
    if (locationType === 'shelf' && !parentCorridor) return true;
    return false;
  }
  
  const parentIdValue = locationType === 'shelf' ? parentCorridor : (locationType === 'corridor' ? parentWarehouse : undefined);

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <TopBar title="Yeni Lokasyon Ekle" />
      <div className="p-4">
        <form onSubmit={handleSubmit}>
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
              
              <Button type="submit" className="w-full" disabled={isSubmitDisabled()}>
                {isSubmitting ? 'Ekleniyor...' : 'Lokasyonları Ekle'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
