'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, Settings, MapPin, FileUp, Wrench, LogOut, Home, Package, FileText, History, ShoppingCart, Printer, Users, Bell, ArrowRightLeft, Boxes } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function AppMenu() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

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

  const items = [
    { href: '/dashboard', label: 'Ana Panel', icon: Home },
    { href: '/stock', label: 'Stoklar', icon: Boxes },
    { href: '/products', label: 'Ürünler', icon: Package },
    { href: '/locations', label: 'Lokasyonlar', icon: MapPin },
    { href: '/history', label: 'Hareketler', icon: History },
    { href: '/orders', label: 'Siparişler', icon: ShoppingCart },
    { href: '/labels/maker', label: 'Etiketler', icon: Printer },
    { href: '/settings', label: 'Ayarlar', icon: Settings },
  ];
  
  
  const base = "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors";
  
  const active = "bg-emerald-100 text-emerald-900 font-semibold dark:bg-emerald-500/20 dark:text-emerald-50";
  
  const inactive = "text-muted-foreground hover:bg-emerald-200 hover:text-emerald-900 dark:hover:bg-emerald-500/25 dark:hover:text-emerald-50";


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
            <Menu className="w-5 h-5" />
            <span className="sr-only">Menüyü Aç</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Uygulama Menüsü</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          {items.map(item => (
            <DropdownMenuItem asChild key={item.href}>
              <Link href={item.href} className={cn(base, pathname === item.href ? active : inactive)}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Çıkış Yap</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
