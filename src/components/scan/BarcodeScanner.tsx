'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { useToast } from '@/hooks/use-toast';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export type TorchState = {
  isAvailable: boolean;
  isOn: boolean;
};

export type BarcodeScannerProps = {
  onResult: (text: string) => void;
  onTorchStateChange?: (state: TorchState) => void;
  torchOn?: boolean;
};

export default function BarcodeScanner({ onResult, onTorchStateChange, torchOn = false }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Prop'tan gelen torchOn değiştiğinde flaşı güncelle
  useEffect(() => {
    if (trackRef.current && trackRef.current.getCapabilities().torch) {
      trackRef.current.applyConstraints({
        advanced: [{ torch: torchOn }]
      }).catch(e => {
        console.error("Failed to toggle torch:", e);
        toast({ variant: 'destructive', title: 'Flaş Kontrol Edilemedi', description: 'Flaş açılamadı veya kapatılamadı.'});
      });
    }
  }, [torchOn, toast]);

  useEffect(() => {
    const startScanner = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not supported');
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Desteklenmeyen Tarayıcı',
          description: 'Tarayıcınız kamera erişimini desteklemiyor.',
        });
        return;
      }
      
      try {
        // Optimize edilmiş video kısıtlamaları
        const constraints: MediaStreamConstraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 },
                aspectRatio: { ideal: 1 },
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setHasCameraPermission(true);

        const videoTrack = stream.getVideoTracks()[0];
        trackRef.current = videoTrack;

        const capabilities = videoTrack.getCapabilities();
        const hasTorch = !!capabilities.torch;
        onTorchStateChange?.({ isAvailable: hasTorch, isOn: videoTrack.getSettings().torch ?? false });
        
        if (videoRef.current) {
           const codeReader = new BrowserMultiFormatReader();
           controlsRef.current = await codeReader.decodeFromStream(stream, videoRef.current, (result, error) => {
            if (result) {
                onResult(result.getText());
            }
            if (error && error.name !== 'NotFoundException') {
                console.error('QR/Barcode scan error:', error);
            }
          });
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Kamera Erişimi Reddedildi',
          description: 'Bu uygulamayı kullanmak için lütfen tarayıcı ayarlarından kamera izinlerini etkinleştirin.',
        });
      }
    };

    startScanner();

    return () => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
        if (trackRef.current) {
           trackRef.current.stop();
           trackRef.current = null;
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full text-white relative bg-black">
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
            
            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gray-900">
                <Alert variant="destructive">
                    <AlertTitle>Kamera Erişimi Gerekli</AlertTitle>
                    <AlertDescription>
                    Bu özelliği kullanmak için lütfen kamera erişimine izin verin.
                    </AlertDescription>
                </Alert>
                </div>
            )}
            {/* Tarama Alanı ve Animasyon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[70vw] max-w-[300px] aspect-square relative">
                {/* Köşe elemanları */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-white/80 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-white/80 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-white/80 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-white/80 rounded-br-lg"></div>
                {/* Tarama çizgisi animasyonu */}
                <div className="absolute top-0 left-0 w-full h-1 bg-accent/80 shadow-[0_0_10px_2px_theme(colors.accent.DEFAULT)] animate-scan"></div>
              </div>
            </div>
        </div>
        <style jsx>{`
        @keyframes scan {
            0% { transform: translateY(0); }
            50% { transform: translateY(calc(70vw - 4px)); }
            100% { transform: translateY(0); }
        }
        @media (min-width: 430px) {
            @keyframes scan {
                0% { transform: translateY(0); }
                50% { transform: translateY(calc(300px - 4px)); }
                100% { transform: translateY(0); }
            }
        }
        .animate-scan {
            animation: scan 3s ease-in-out infinite;
            opacity: 0.7;
        }
        `}</style>
    </div>
  );
}
