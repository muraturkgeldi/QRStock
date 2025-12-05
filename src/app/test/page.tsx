'use client';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp } from '@/firebase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import TopBar from '@/components/ui/TopBar';

export default function TestPage() {
  const { toast } = useToast();
  const app = useFirebaseApp();
  const [sku, setSku] = useState('ELM-1KG');
  const [loc, setLoc] = useState('wh-1-a01');
  const [delta, setDelta] = useState(5);
  const [type, setType] = useState<'in'|'out'>('in');
  const [isLoading, setIsLoading] = useState(false);

  const run = async () => {
    setIsLoading(true);
    toast({ title: 'Gönderiliyor...', description: 'Cloud Function tetikleniyor.' });
    try {
      const functions = getFunctions(app, 'europe-west1'); // veya bölgeniz
      const adjustStock = httpsCallable(functions, 'adjustStock');
      
      const result = await adjustStock({ 
        sku, 
        locationId: loc, 
        delta: type ==='in' ? Math.abs(delta) : -Math.abs(delta), 
        type 
      });

      if ((result.data as any).ok) {
        toast({ title: 'Başarılı!', description: `Stok güncellendi: ${type} ${delta}` });
      } else {
        throw new Error('Cloud function returned not ok.');
      }
    } catch (error: any) {
        console.error("Cloud function error:", error);
        toast({
            variant: 'destructive',
            title: 'Hata!',
            description: error.message || 'Bilinmeyen bir hata oluştu.'
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <main>
      <TopBar title="Cloud Function Test" />
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={sku} onChange={e=>setSku(e.target.value)} placeholder="SKU"/>
        </div>
        <div className="space-y-2">
            <Label htmlFor="loc">Location ID</Label>
            <Input id="loc" value={loc} onChange={e=>setLoc(e.target.value)} placeholder="Location"/>
        </div>
        <div className="flex items-center gap-2">
            <select value={type} onChange={e=>setType(e.target.value as any)} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="in">Giriş (+)</option>
            <option value="out">Çıkış (-)</option>
            </select>
            <Input type="number" value={delta} onChange={e=>setDelta(+e.target.value)} className="w-24"/>
        </div>
        <Button onClick={run} disabled={isLoading} className="w-full">
            {isLoading ? 'Gönderiliyor...' : 'Fonksiyonu Çalıştır'}
        </Button>
      </div>
    </main>
  );
}
