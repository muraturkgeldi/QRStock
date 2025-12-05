
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

const PwaInstallButton = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsAppInstalled(true);
      }
    }
  };

  if (isAppInstalled) {
     return <p className="text-sm text-green-600 font-medium text-center">Uygulama zaten yüklü.</p>;
  }

  if (!installPrompt) {
    return <p className="text-sm text-muted-foreground text-center">Tarayıcınız bu özelliği desteklemiyor veya kurulum kriterleri karşılanmıyor.</p>;
  }

  return (
    <Button onClick={handleInstallClick} className="w-full">
      <Download className="mr-2 h-4 w-4" />
      Uygulamayı Cihaza Yükle
    </Button>
  );
};

export default PwaInstallButton;
