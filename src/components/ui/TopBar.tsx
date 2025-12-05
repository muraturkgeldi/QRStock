'use client';
import React from 'react';
import Image from 'next/image';
import { useUser } from '@/firebase';
import { AppMenu } from '@/components/AppMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Home, Settings } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


export default function TopBar({ title }: { title?: string }) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' });
      toast({
        title: 'Çıkış Başarılı',
        description: 'Güvenli bir şekilde çıkış yaptınız.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Çıkış yapılırken bir sorun oluştu.',
      });
    }
  };
  
    const initial =
    user?.displayName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    'N';

    const email = user?.email ?? '';

  return (
    <header className="h-16 flex items-center justify-between px-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      {/* Sol: başlık + ana sayfa linki */}
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-lg">{title}</span>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Home className="w-3 h-3 mr-1" />
          Ana sayfaya dön
        </Link>
      </div>

      {/* Sağ: avatar (masaüstü+mobil) + mobilde app menü */}
      <div className="flex items-center gap-3">
        {/* Avatar + kullanıcı menüsü */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white text-sm hover:bg-emerald-500 hover:ring-2 hover:ring-emerald-300/70 hover:ring-offset-2 hover:ring-offset-background transition">
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-medium">Hesap</span>
              {email && (
                <span className="text-xs text-muted-foreground truncate">
                  {email}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Ayarlar &amp; Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* App menü sadece mobilde */}
        <div className="lg:hidden">
          <AppMenu />
        </div>
      </div>
    </header>
  );
}
