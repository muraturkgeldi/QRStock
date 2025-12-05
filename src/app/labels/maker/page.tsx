
'use client';

import { useState, useMemo } from 'react';
import TopBar from '@/components/ui/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useUser } from '@/firebase';
import type { Product, Location } from '@/lib/types';
import { Search, Plus, Trash2, Download, Settings2, LayoutDashboard, Boxes, Package2, Warehouse, History, ShoppingCart, Printer, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportPdf, type LabelSpec, type LabelSizeKey, type PageSizeKey } from '@/lib/label-maker';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';


type UiPrintListItem = {
    id: string;
    type: 'product' | 'location';
    item: any;
    copies: number;
}

function PrintList({ items, onUpdateCopies, onRemoveItem }: {
    items: UiPrintListItem[];
    onUpdateCopies: (id: string, copies: number) => void;
    onRemoveItem: (id: string) => void;
}) {
    const totalLabels = items.reduce((sum, item) => sum + item.copies, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Baskı Listesi</CardTitle>
                <CardDescription>{totalLabels} etiket basılacak ({items.length} çeşit).</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-64 border-y">
                   <div className="p-2 space-y-2">
                    {items.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">Baskı listesi boş.</p>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{item.item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.type === 'product' ? String((item.item as Product).sku ?? (item.item as Product).id) : (item.item as Location).type}</p>
                                </div>
                                <Input
                                    type="number"
                                    min={1}
                                    value={item.copies}
                                    onChange={(e) => onUpdateCopies(item.id, parseInt(e.target.value) || 1)}
                                    className="w-16 h-8 text-center"
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemoveItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                   </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function LabelMakerContent() {
    const { user, loading: userLoading } = useUser();
    const { data: products, loading: productsLoading } = useCollection<Product>('products', user?.uid);
    const { data: locations, loading: locationsLoading } = useCollection<Location>('locations', user?.uid);
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'products' | 'locations'>('products');
    const [printList, setPrintList] = useState<UiPrintListItem[]>([]);
    
    const [labelSize, setLabelSize] = useState<LabelSizeKey>('30x60');
    const [pageSize, setPageSize] = useState<PageSizeKey>('A4');
    const [bulk, setBulk] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const loading = userLoading || productsLoading || locationsLoading;

    const locationsMap = useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);
    
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const lower = searchTerm.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lower) || (p.sku && p.sku.toLowerCase().includes(lower)));
    }, [products, searchTerm]);

    const filteredLocations = useMemo(() => {
        const sorted = [...locations].sort((a,b) => a.name.localeCompare(b.name));
        if (!searchTerm) return sorted;
        const lower = searchTerm.toLowerCase();
        return sorted.filter(l => l.name.toLowerCase().includes(lower));
    }, [locations, searchTerm]);

    const handleAddToPrintList = (item: Product | Location, type: 'product' | 'location') => {
        if (printList.some(i => i.id === item.id)) {
            toast({ variant: 'destructive', title: 'Zaten Listede', description: `"${item.name}" zaten baskı listesinde.`});
            return;
        }
        
        const newItem: UiPrintListItem = {
            id: item.id,
            type: type,
            item: item,
            copies: 1,
        };
        setPrintList(prev => [...prev, newItem]);
    }
    
    const handleUpdateCopies = (id: string, copies: number) => {
        setPrintList(prev => prev.map(item => item.id === id ? { ...item, copies } : item));
    }
    
    const handleRemoveItem = (id: string) => {
        setPrintList(prev => prev.filter(item => item.id !== id));
    }
    
    const generateLabelSpec = (uiItem: UiPrintListItem): LabelSpec => {
        if (uiItem.type === 'product') {
             const product = uiItem.item as Product;
             return {
                title: product.name,
                sku: String(product.sku ?? product.id),
                qrValue: String(product.sku ?? product.id),
            };
        } else { // location
            const location = uiItem.item as Location;
            let current: Location | undefined = location;
            const hierarchy: string[] = [];
            
            while(current) {
                hierarchy.unshift(current.name);
                current = current.parentId ? locationsMap.get(current.parentId) : undefined;
            }

            return {
                title: hierarchy.join(' > '),
                sku: `Lokasyon: ${location.type}`,
                qrValue: location.id,
            };
        }
    };
    
    const handleGeneratePdf = async () => {
        if (printList.length === 0) {
            toast({ variant: 'destructive', title: 'Liste Boş', description: 'Lütfen en az bir etiket seçin.'});
            return;
        }
        
        setIsGenerating(true);
        toast({ title: 'PDF Oluşturuluyor...', description: 'Lütfen bekleyin, etiketleriniz hazırlanıyor.' });

        try {
            const itemsForPdf: LabelSpec[] = printList.flatMap(item => 
                Array(item.copies).fill(null).map(() => generateLabelSpec(item))
            );

            await exportPdf(itemsForPdf, { labelSize, pageSize, batch: bulk });
            
            toast({ title: 'Başarılı!', description: 'Etiketleriniz PDF olarak indirildi.' });

        } catch (error) {
            console.error('PDF generation failed:', error);
            toast({ variant: 'destructive', title: 'Hata!', description: `PDF oluşturulurken bir sorun oluştu: ${(error as Error).message}` });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-4 flex-1 overflow-auto">
            <div className="flex flex-col gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Kaynak Seçimi</CardTitle>
                        <CardDescription>Etiket basmak için ürün veya lokasyon seçin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="products">Ürünler</TabsTrigger>
                                <TabsTrigger value="locations">Lokasyonlar</TabsTrigger>
                            </TabsList>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Ara..."
                                    className="w-full pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <TabsContent value="products">
                                <ScrollArea className="h-72 mt-4 border rounded-md">
                                   <div className="p-2 space-y-1">
                                     {loading ? <p>Yükleniyor...</p> : filteredProducts.map(p => (
                                        <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{p.name}</p>
                                                <p className="text-xs text-muted-foreground">{String(p.sku ?? p.id)}</p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => handleAddToPrintList(p, 'product')}>
                                                <Plus className="h-4 w-4 mr-1"/> Ekle
                                            </Button>
                                        </div>
                                     ))}
                                   </div>
                                </ScrollArea>
                            </TabsContent>
                             <TabsContent value="locations">
                                 <ScrollArea className="h-72 mt-4 border rounded-md">
                                   <div className="p-2 space-y-1">
                                     {loading ? <p>Yükleniyor...</p> : filteredLocations.map(l => (
                                        <div key={l.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{l.name}</p>
                                                 <p className="text-xs text-muted-foreground">{l.type}</p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => handleAddToPrintList(l, 'location')}>
                                                <Plus className="h-4 w-4 mr-1"/> Ekle
                                            </Button>
                                        </div>
                                     ))}
                                   </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-col gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5"/>
                            Yazdırma Ayarları
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="bulk-switch">Toplu Yazdır (A4/A5)</Label>
                            <Switch id="bulk-switch" checked={bulk} onCheckedChange={setBulk}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Etiket Boyutu</Label>
                                 <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSizeKey)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30x60">30mm × 60mm</SelectItem>
                                        <SelectItem value="75x100">75mm × 100mm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                            <Label>Sayfa Boyutu</Label>
                             <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSizeKey)} disabled={!bulk}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A4">A4 (210mm × 297mm)</SelectItem>
                                    <SelectItem value="A5">A5 (148mm × 210mm)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        </div>
                    </CardContent>
                </Card>

                <PrintList 
                    items={printList} 
                    onUpdateCopies={handleUpdateCopies}
                    onRemoveItem={handleRemoveItem}
                />
                
                <Button onClick={handleGeneratePdf} disabled={isGenerating || printList.length === 0} className="w-full" size="lg">
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Oluşturuluyor...' : 'PDF Oluştur ve İndir'}
                </Button>

            </div>
        </div>
    );
}


export default function LabelMakerPage() {
    const pathname = usePathname();
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
      icon: History,
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
    
          <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
            <TopBar title="Etiket Oluşturucu" />
            <main className="flex-1 p-6">
                <LabelMakerContent />
            </main>
          </div>
        </div>
    );
}


    
