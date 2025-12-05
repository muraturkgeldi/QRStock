'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { XCircle, Zap, ZapOff } from 'lucide-react';
import BarcodeScanner, { type TorchState } from '@/components/scan/BarcodeScanner';
import { useUser } from '@/firebase';
import { Switch } from '@/components/ui/switch';

function ScannerContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();
  
  const lastCodeRef = useRef<string | null>(null);
  const lastTimeRef = useRef<number>(0);
  const hasNavigatedRef = useRef(false);

  const [isHandling, setIsHandling] = useState(false);
  const [torchState, setTorchState] = useState<TorchState>({ isAvailable: false, isOn: false });
  const [torchOn, setTorchOn] = useState(false);

  const [scanPrefs, setScanPrefs] = useState({
    beep: true,
    vibrate: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('scan-prefs');
      if (raw) {
        const parsed = JSON.parse(raw);
        setScanPrefs((prev) => ({
          beep: typeof parsed.beep === 'boolean' ? parsed.beep : prev.beep,
          vibrate: typeof parsed.vibrate === 'boolean' ? parsed.vibrate : prev.vibrate,
        }));
      }
    } catch {
      // Boşver, default kalsın
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('scan-prefs', JSON.stringify(scanPrefs));
  }, [scanPrefs]);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Giriş Gerekli',
        description: 'QR ile arama yapmadan önce giriş yapmalısınız.',
      });
      router.replace('/?next=/scan');
    }
  }, [user, userLoading, router, toast]);

  let sharedAudioCtx: AudioContext | null = null;
  let sharedGainNode: GainNode | null = null;

  const playBeep = () => {
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtx();
        sharedGainNode = sharedAudioCtx.createGain();
        sharedGainNode.gain.value = 0.08;
        sharedGainNode.connect(sharedAudioCtx.destination);
      }

      const ctx = sharedAudioCtx;
      const gain = sharedGainNode!;
      const osc = ctx.createOscillator();

      osc.type = 'square';
      osc.frequency.value = 1200;

      osc.connect(gain);
      osc.start();
      setTimeout(() => {
        osc.stop();
      }, 120);
    } catch (e) {
      console.warn('Beep failed:', e);
    }
  };


  const normalizeCode = (raw: string | null | undefined): string => {
    if (!raw) return '';
    let v = String(raw).trim();
    v = v.replace(/^SKU[:\s]*/i, '');
    if (v.startsWith('http://') || v.startsWith('https://')) {
      try {
        const u = new URL(v);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length > 0) v = parts[parts.length - 1];
      } catch {}
    }
    return v;
  };

  const handleScan = (rawValue: string | null) => {
    if (!rawValue) return;
    if (hasNavigatedRef.current) return;
    if (isHandling) return;

    const code = normalizeCode(rawValue);
    if (!code) {
      toast({
        variant: 'destructive',
        title: 'Geçersiz kod',
        description: 'Okunan QR kodunda geçerli bir değer bulunamadı.',
      });
      return;
    }

    const now = Date.now();
    const DEBOUNCE_MS = 800;
    if (lastCodeRef.current === code && now - lastTimeRef.current < DEBOUNCE_MS) {
      return;
    }

    lastCodeRef.current = code;
    lastTimeRef.current = now;
    hasNavigatedRef.current = true;

    if (scanPrefs.vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(80);
    }
    if (scanPrefs.beep) {
      playBeep();
    }

    setIsHandling(true);

    try {
      router.push(`/product/${encodeURIComponent(code)}`);
    } catch (error: any) {
      console.error('QR handle error:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error?.message || `QR kod işlenirken bir hata oluştu.`,
      });
      hasNavigatedRef.current = false;
      setIsHandling(false);
    }
  };

  if (userLoading || !user) {
    return (
        <div className="flex flex-col h-dvh bg-app-bg">
            <TopBar title="QR Kod Tara" />
            <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Giriş durumu kontrol ediliyor...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-gray-900/90">
      <TopBar title="QR Kod Tara" />
      <div className="flex-1 flex flex-col text-white relative">
        <BarcodeScanner 
          onResult={handleScan}
          torchOn={torchOn}
          onTorchStateChange={setTorchState}
        />
        <div className="p-4 bg-card text-card-foreground rounded-t-2xl space-y-4">
            <p className="text-center text-sm text-muted-foreground">Ürün detayını veya stok hareketini görmek için QR kodu okutun.</p>
            
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={scanPrefs.beep}
                  onCheckedChange={(val) =>
                    setScanPrefs((prev) => ({ ...prev, beep: val }))
                  }
                />
                <span>Bip sesi</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={scanPrefs.vibrate}
                  onCheckedChange={(val) =>
                    setScanPrefs((prev) => ({ ...prev, vibrate: val }))
                  }
                />
                <span>Titreşim</span>
              </label>
            </div>
            
            {torchState.isAvailable && (
              <Button variant="outline" className="w-full" onClick={() => setTorchOn(prev => !prev)}>
                  {torchOn ? <ZapOff className="mr-2" /> : <Zap className="mr-2" />}
                  {torchOn ? 'Feneri Kapat' : 'Feneri Aç'}
              </Button>
            )}

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
