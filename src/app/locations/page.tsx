'use client';

import { useMemo, useState, Suspense } from 'react';
import TopBar from '@/components/ui/TopBar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from '@/components/ui/Card';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Location, StockItem, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, Warehouse, DoorClosed, Archive, Server, AppWindow, Pencil, Trash2,
  LayoutDashboard, Boxes, Package2, History as HistoryIcon, ShoppingCart, Printer, Settings
} from 'lucide-react';
import { useCollection, useUser } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteLocation } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useLayoutMode } from '@/hooks/use-layout-mode';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

// DeleteDialog Component
const DeleteDialog = ({ location, onConfirm }: { location: Location, onConfirm: () => void }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{location.name}</strong> lokasyonunu silmek üzeresiniz. Bu işlem, bu lokasyona bağlı
            <strong> tüm alt lokasyonları</strong> da (koridorlar, raflar) silecektir. Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Evet, Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


// LocationActions Component
const LocationActions = ({ location }: { location: Location }) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    const result = await deleteLocation(location.id);
    if (result.success) {
      toast({ title: "Başarılı!", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Hata!", description: result.message });
    }
  };

  return (
    <div className="flex items-center">
      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
        <Link href={`/locations/${location.id}/edit`}>
          <Pencil className="w-4 h-4" />
        </Link>
      </Button>
      <DeleteDialog location={location} onConfirm={handleDelete} />
    </div>
  );
};


// ShelfContent Component
const ShelfContent = ({
  shelf,
  items,
  productsMap,
}: {
  shelf: Location;
  items: StockItem[];
  productsMap: Map<string, Product>;
}) => {
  const header = (
    <div className="flex items-center justify-between mb-2">
      <Badge variant="secondary">{items.length} çeşit ürün</Badge>
      <LocationActions location={shelf} />
    </div>
  );

  if (items.length === 0) {
    return (
      <>
        {header}
        <p className="text-muted-foreground text-sm pl-2">Bu rafta ürün bulunmuyor.</p>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="space-y-2">
        {items.map((item) => {
          const product = productsMap.get(item.productId);
          if (!product) return null;

          return (
            <Link href={`/product/${product.id}`} key={item.id}>
              <Card className="border border-transparent hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5 active:bg-muted/80 transition-colors">
                <div className="p-3 flex items-center gap-3">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={40}
                    height={40}
                    className="rounded-md object-cover border"
                    data-ai-hint={product.imageHint}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <Badge>{item.quantity} adet</Badge>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
};

// CorridorContent Component
const CorridorContent = ({
  corridor,
  shelves,
  stockItems,
  productsMap,
}: {
  corridor: Location;
  shelves: Location[];
  stockItems: StockItem[];
  productsMap: Map<string, Product>;
}) => {
  const itemsByLocation = (locationId: string) =>
    stockItems.filter((item) => item.locationId === locationId);

  const header = (
    <div className="flex items-center justify-between mb-2 pb-2 border-b">
      <Badge variant="outline">{shelves.length} raf</Badge>
      <LocationActions location={corridor} />
    </div>
  );

  if (shelves.length === 0) {
    return (
      <>
        {header}
        <p className="text-muted-foreground text-sm pl-2 italic">
          Bu koridora ait raf bulunmuyor.
        </p>
      </>
    );
  }

  return (
    <>
      {header}
      <Accordion type="multiple" className="w-full space-y-2">
        {shelves.map((shelf) => {
          const items = itemsByLocation(shelf.id);
          return (
            <AccordionItem
              value={shelf.id}
              key={shelf.id}
              className="border-b-0 bg-background/50 rounded-md"
            >
              <AccordionTrigger className="p-3 hover:no-underline rounded-md">
                <div className="flex items-center gap-3 w-full">
                  <AppWindow className="w-5 h-5 text-secondary-foreground" />
                  <span className="font-semibold text-base flex-1 text-left">
                    {shelf.name}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 pt-0">
                <ShelfContent
                  shelf={shelf}
                  items={items}
                  productsMap={productsMap}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
};

function LocationsPageInner() {
  const mode = useLayoutMode(1024);
  const pathname = usePathname();
  const { user, loading: userLoading } = useUser();
  const { data: locations, loading: locationsLoading } = useCollection<Location>('locations', user?.uid);
  const { data: stockItems, loading: stockItemsLoading } = useCollection<StockItem>('stockItems', user?.uid);
  const { data: products, loading: productsLoading } = useCollection<Product>('products', user?.uid);

  const loading = userLoading || locationsLoading || stockItemsLoading || productsLoading;

  const { warehouses, corridorsByWarehouse, shelvesByCorridor } = useMemo(() => {
    if(!locations) return { warehouses: [], corridorsByWarehouse: new Map(), shelvesByCorridor: new Map() };
    const warehouses = locations
      .filter((l) => l.type === 'warehouse')
      .sort((a, b) => a.name.localeCompare(b.name));
    const corridorsByWarehouse = new Map<string, Location[]>();
    const shelvesByCorridor = new Map<string, Location[]>();

    locations.forEach((loc) => {
      if (loc.type === 'corridor' && loc.parentId) {
        const list = corridorsByWarehouse.get(loc.parentId) || [];
        list.push(loc);
        corridorsByWarehouse.set(
          loc.parentId,
          list.sort((a, b) => a.name.localeCompare(b.name))
        );
      } else if (loc.type === 'shelf' && loc.parentId) {
        const list = shelvesByCorridor.get(loc.parentId) || [];
        list.push(loc);
        shelvesByCorridor.set(
          loc.parentId,
          list.sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    });

    return { warehouses, corridorsByWarehouse, shelvesByCorridor };
  }, [locations]);

  const productsMap = useMemo(
    () => products ? new Map(products.map((p) => [p.id, p])) : new Map(),
    [products]
  );

  const getIconForWarehouse = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('arşiv')) return Archive;
    if (lowerName.includes('server')) return Server;
    return Warehouse;
  };

  if (loading || mode === undefined) {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Lokasyonlar" />
        <div className="p-4 text-center">Yükleniyor...</div>
      </div>
    );
  }

  // 📱 MOBİL LAYOUT
  if (mode === 'mobile') {
    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <TopBar title="Lokasyonlar" />
        <div className="p-4">
          <Button asChild className="w-full mb-4">
            <Link href="/locations/new">
              <Plus className="mr-2 h-4 w-4" /> Yeni Lokasyon Ekle
            </Link>
          </Button>
          {warehouses.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {warehouses.map((warehouse) => {
                const corridors = corridorsByWarehouse.get(warehouse.id) || [];
                const WarehouseIcon = getIconForWarehouse(warehouse.name);
                return (
                  <AccordionItem
                    value={warehouse.id}
                    key={warehouse.id}
                    className="border-b-0"
                  >
                    <Card className="transition-colors border border-transparent hover:border-emerald-400/70 dark:hover:border-emerald-300/80">
                      <AccordionTrigger className="p-4 hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <WarehouseIcon className="w-6 h-6 text-primary" />
                          <span className="font-semibold text-lg">
                            {warehouse.name}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b">
                          <Badge variant="outline">
                            {corridors.length} koridor
                          </Badge>
                          <LocationActions location={warehouse} />
                        </div>
                        {corridors.length > 0 ? (
                          <Accordion
                            type="multiple"
                            className="w-full space-y-3"
                          >
                            {corridors.map((corridor) => {
                              const shelves =
                                shelvesByCorridor.get(corridor.id) || [];
                              return (
                                <AccordionItem
                                  value={corridor.id}
                                  key={corridor.id}
                                  className="border border-transparent bg-muted/50 rounded-lg hover:border-emerald-400/70 dark:hover:border-emerald-300/80 transition-colors"
                                >
                                  <AccordionTrigger className="p-3 hover:no-underline rounded-lg">
                                    <div className="flex items-center gap-3 w-full">
                                      <DoorClosed className="w-5 h-5 text-muted-foreground" />
                                      <span className="font-semibold text-md">
                                        {corridor.name}
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="p-3 pt-0">
                                    <CorridorContent
                                      corridor={corridor}
                                      shelves={shelves}
                                      stockItems={stockItems}
                                      productsMap={productsMap}
                                    />
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            Bu depoya ait koridor bulunmuyor.
                          </p>
                        )}
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p>Henüz lokasyon oluşturulmamış.</p>
              <p className="text-sm">
                Yukarıdaki butondan yeni bir depo ekleyerek başlayın.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 🖥️ MASAÜSTÜ LAYOUT
  const navItems = [
    {
      label: 'Ana Panel',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Stoklar',
      href: '/stock',
      icon: Boxes,
    },
    {
      label: 'Ürünler',
      href: '/products',
      icon: Package2,
    },
    {
      label: 'Lokasyonlar',
      href: '/locations',
      icon: Warehouse,
    },
    {
      label: 'Hareketler',
      href: '/history',
      icon: HistoryIcon,
    },
    {
      label: 'Siparişler',
      href: '/orders',
      icon: ShoppingCart,
    },
    {
      label: 'Etiketler',
      href: '/labels/maker',
      icon: Printer,
    },
    {
      label: 'Ayarlar',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Sol sidebar – masaüstü navigasyon */}
      <aside className="hidden lg:flex lg:flex-col w-60 border-r bg-surface/80 fixed inset-y-0 left-0">
        <div className="h-16 flex items-center px-4 border-b">
          <span className="font-bold text-lg">Stok Takip Sistemi</span>
        </div>
        <div className="flex-1 p-2">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                  'text-muted-foreground',
                  isActive &&
                    'bg-emerald-50 text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.4)] dark:bg-emerald-500/15 dark:text-emerald-100',
                  'hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-500/40 dark:hover:text-emerald-50'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </aside>

      {/* Sağ taraf – içerik */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        <TopBar title="Lokasyonlar" />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Depo / Koridor / Raf Yapısı</h1>
            <Button asChild>
              <Link href="/locations/new">
                <Plus className="mr-2 h-4 w-4" /> Yeni Lokasyon Ekle
              </Link>
            </Button>
          </div>

          {warehouses.length > 0 ? (
            <div className="space-y-4">
              {warehouses.map((warehouse) => {
                const corridors = corridorsByWarehouse.get(warehouse.id) || [];
                const WarehouseIcon = getIconForWarehouse(warehouse.name);
                return (
                  <Card key={warehouse.id} className="border border-border/60 hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
                      <div className="flex items-center gap-3">
                        <WarehouseIcon className="w-6 h-6 text-primary" />
                        <div>
                          <p className="font-semibold text-base">
                            {warehouse.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {corridors.length} koridor
                          </p>
                        </div>
                      </div>
                      <LocationActions location={warehouse} />
                    </div>

                    <div className="p-4">
                      {corridors.length > 0 ? (
                        <Accordion
                          type="multiple"
                          className="w-full space-y-3"
                        >
                          {corridors.map((corridor) => {
                            const shelves =
                              shelvesByCorridor.get(corridor.id) || [];
                            return (
                              <AccordionItem
                                value={corridor.id}
                                key={corridor.id}
                                className="border border-transparent bg-muted/50 rounded-lg hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5 transition-colors"
                              >
                                <AccordionTrigger className="p-3 hover:no-underline rounded-lg">
                                  <div className="flex items-center gap-3 w-full">
                                    <DoorClosed className="w-5 h-5 text-muted-foreground" />
                                    <span className="font-semibold text-md">
                                      {corridor.name}
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-3 pt-0">
                                  <CorridorContent
                                    corridor={corridor}
                                    shelves={shelves}
                                    stockItems={stockItems}
                                    productsMap={productsMap}
                                  />
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      ) : (
                        <p className="text-muted-foreground text-center py-6">
                          Bu depoya ait koridor bulunmuyor.
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>Henüz lokasyon oluşturulmamış.</p>
              <p className="text-sm mt-1">
                Sağ üstteki butondan ilk deponu ekleyerek başlayabilirsin.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <LocationsPageInner />
    </Suspense>
  );
}

    
