

"use client";

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { XCircle } from 'lucide-react';
import BarcodeScanner from '@/components/scan/BarcodeScanner';
import { findProductBySku } from '@/lib/data';
import { useUser } from '@/firebase';


function ScannerContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const handleScan = async (scannedValue: string) => {
     if (!user) {
         toast({
            variant: 'destructive',
            title: 'Hata',
            description: `Arama yapmadan önce giriş yapmalısınız.`,
        });
        return;
     }
     try {
        // We use findProductBySku which can find by SKU or fallback to ID
        const product = await findProductBySku(user.uid, scannedValue);
        if (product) {
            toast({
                title: 'Ürün Bulundu!',
                description: `${product.name} stok detay sayfasına yönlendiriliyor.`,
            });
            router.push(`/product/${product.id}`);
        } else {
            toast({
                variant: 'destructive',
                title: 'Bilinmeyen Ürün',
                description: `Okunan kod (${scannedValue}) bir ürünle eşleşmedi.`,
            });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Hata',
            description: error.message || `Ürün aranırken bir hata oluştu.`,
        });
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-gray-900/90">
      <TopBar title="QR Kod Tara" />
      <div className="flex-1 flex flex-col text-white relative">
        <BarcodeScanner onResult={handleScan} />
        <div className="p-4 bg-card text-card-foreground rounded-t-2xl">
            <p className="text-center text-sm text-muted-foreground mb-4">Ürün detayını veya stok hareketini görmek için QR kodu okutun.</p>
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
                <XCircle className="mr-2" /> Vazgeç
            </Button>
        </div>
      </div>
    </div>
  );
}


export default function ScanPage() {
    return (
        <Suspense fallback={<div className="text-center p-4">Yükleniyor...</div>}>
            <ScannerContent />
        </Suspense>
    )
}

    