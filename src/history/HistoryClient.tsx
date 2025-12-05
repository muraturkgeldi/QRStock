
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Search, Plus, Minus, ArrowRightLeft, ScanLine, FileDown } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Product, StockMovement } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import TopBar from '@/components/ui/TopBar';

type MovementFilter = 'all' | 'in' | 'out' | 'transfer';
type EnrichedMovement = StockMovement & { product: Product };

export function HistoryClient({ initialMovements }: { initialMovements: EnrichedMovement[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MovementFilter>('all');
  const { toast } = useToast();

  const sortedMovements = useMemo(() => {
    return [...initialMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [initialMovements]);

  const filteredMovements = useMemo(() => {
    let movementsToFilter = sortedMovements;

    if (filterType !== 'all') {
      movementsToFilter = movementsToFilter.filter(movement => movement.type === filterType);
    }
    
    if (!searchTerm) {
      return movementsToFilter;
    }
    
    const lowercasedTerm = searchTerm.toLowerCase();
    return movementsToFilter.filter(movement => {
      const product = movement.product;
      return (
        product?.name.toLowerCase().includes(lowercasedTerm) ||
        (product?.sku && product.sku.toLowerCase().includes(lowercasedTerm)) ||
        movement.productId.toLowerCase().includes(lowercasedTerm) ||
        movement.userId?.toLowerCase().includes(lowercasedTerm) ||
        movement.requester?.toLowerCase().includes(lowercasedTerm) ||
        movement.description?.toLowerCase().includes(lowercasedTerm)
      );
    });
  }, [sortedMovements, searchTerm, filterType]);
  
    const generatePdf = async (period: 'daily' | 'weekly') => {
        const pdfMake = (await import('pdfmake/build/pdfmake')).default;
        const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
        pdfMake.vfs = pdfFonts;

        const now = new Date();
        let startDate: Date;
        let endDate: Date = endOfDay(now);
        let title: string;

        if (period === 'daily') {
            startDate = startOfDay(now);
            title = 'Günlük Stok Hareket Raporu';
        } else { // weekly
            startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
            endDate = endOfWeek(now, { weekStartsOn: 1 });
            title = 'Haftalık Stok Hareket Raporu';
        }

        const reportMovements = sortedMovements.filter(m => {
            const movementDate = new Date(m.date);
            return movementDate >= startDate && movementDate <= endDate;
        });

        if (reportMovements.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Rapor Oluşturulamadı',
                description: `Seçilen dönem (${period === 'daily' ? 'bugün' : 'bu hafta'}) için hiç hareket bulunmuyor.`,
            });
            return;
        }

        // Sort by type, then by date
        reportMovements.sort((a, b) => {
            if (a.type < b.type) return -1;
            if (a.type > b.type) return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        const translateType = (type: string) => {
            switch (type) {
                case 'in': return 'Giriş';
                case 'out': return 'Çıkış';
                case 'transfer': return 'Transfer';
                default: return type;
            }
        };

        const tableBody = [
            ['Tarih', 'Ürün Adı', 'Stok Kodu', 'Tip', 'Miktar', 'İşlemi Yapan', 'Talep Eden', 'Açıklama'].map(h => ({ text: h, style: 'tableHeader' }))
        ];

        reportMovements.forEach(m => {
            tableBody.push([
                format(new Date(m.date), 'dd.MM.yy HH:mm'),
                m.product?.name || 'Bilinmiyor',
                m.product?.sku || m.productId,
                { text: translateType(m.type), style: m.type as any },
                m.quantity.toString(),
                m.userId || '',
                m.requester || '',
                m.description || ''
            ]);
        });
        
        const docDefinition: any = {
            content: [
                { text: title, style: 'header' },
                { text: `Rapor Tarihi: ${format(now, 'dd MMMM yyyy, HH:mm', { locale: tr })}`, style: 'subheader' },
                { text: `Dönem: ${format(startDate, 'dd.MM.yyyy')} - ${format(endDate, 'dd.MM.yyyy')}`, style: 'subheader' },
                {
                    style: 'tableExample',
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
                        body: tableBody
                    },
                    layout: 'lightHorizontalLines'
                }
            ],
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] as [number, number, number, number] },
                subheader: { fontSize: 10, bold: false, margin: [0, 0, 0, 5] as [number, number, number, number], color: 'gray' },
                tableExample: { margin: [0, 5, 0, 15] as [number, number, number, number] },
                tableHeader: { bold: true, fontSize: 11, color: 'black' },
                in: { color: 'green', bold: true },
                out: { color: 'red', bold: true },
                transfer: { color: 'blue', bold: true }
            },
            defaultStyle: { fontSize: 9 }
        };

        const fileName = `${period}_rapor_${format(now, 'yyyy-MM-dd')}.pdf`;
        pdfMake.createPdf(docDefinition).download(fileName);
    };


  return (
    <div className="bg-app-bg min-h-dvh">
      <TopBar title="Hareket Raporu"/>
      <div className="p-4 sticky top-[74px] bg-app-bg z-10 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Ürün adı, kod, kullanıcı, talep veya açıklama..."
            className="w-full pl-10 pr-4 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => generatePdf('daily')} variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" /> Günlük Rapor (PDF)
            </Button>
            <Button onClick={() => generatePdf('weekly')} variant="outline" size="sm">
                 <FileDown className="mr-2 h-4 w-4" /> Haftalık Rapor (PDF)
            </Button>
        </div>
         <div className="flex justify-center gap-2">
            <Button onClick={() => setFilterType('all')} variant={filterType === 'all' ? 'default' : 'outline'} size="sm">Tümü</Button>
            <Button onClick={() => setFilterType('in')} variant={filterType === 'in' ? 'secondary' : 'outline'} size="sm" className="text-green-600 border-green-600/50 hover:bg-green-100/50 hover:text-green-700 dark:hover:bg-green-900/20">Giriş</Button>
            <Button onClick={() => setFilterType('out')} variant={filterType === 'out' ? 'secondary' : 'outline'} size="sm" className="text-red-600 border-red-600/50 hover:bg-red-100/50 hover:text-red-700 dark:hover:bg-red-900/20">Çıkış</Button>
            <Button onClick={() => setFilterType('transfer')} variant={filterType === 'transfer' ? 'secondary' : 'outline'} size="sm" className="text-blue-600 border-blue-600/50 hover:bg-blue-100/50 hover:text-blue-700 dark:hover:bg-blue-900/20">Transfer</Button>
        </div>
      </div>
      <div className="p-4 pt-0 space-y-4">
        {initialMovements.length === 0 ? (
             <div className="text-center text-muted-foreground py-10">
                <p>Henüz stok hareketi yok.</p>
            </div>
        ) : filteredMovements.length > 0 ? (
          filteredMovements.map((movement) => (
            <Card key={movement.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                   <Image
                      src={movement.product.imageUrl}
                      alt={movement.product.name}
                      width={56}
                      height={56}
                      className="rounded-lg object-cover border"
                      data-ai-hint={movement.product.imageHint}
                    />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{movement.product.name}</CardTitle>
                    <CardDescription>{movement.product.sku || movement.product.id}</CardDescription>
                  </div>
                   <div className={`p-2 rounded-full ${
                       movement.type === 'in' ? 'bg-green-100 dark:bg-green-900/50' : 
                       movement.type === 'out' ? 'bg-red-100 dark:bg-red-900/50' :
                       'bg-blue-100 dark:bg-blue-900/50'
                    }`}>
                      {movement.type === 'in' && <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />}
                      {movement.type === 'out' && <Minus className="w-5 h-5 text-red-600 dark:text-red-400" />}
                      {movement.type === 'transfer' && <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                   </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Miktar:</span>
                    <span className={`font-bold text-lg ${
                       movement.type === 'in' ? 'text-green-600 dark:text-green-400' : 
                       movement.type === 'out' ? 'text-red-600 dark:text-red-400' :
                       'text-blue-600 dark:text-blue-400'
                    }`}>{movement.quantity} adet</span>
                </div>
                 {movement.description && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground shrink-0 mr-2">Açıklama:</span>
                    <p className="text-right font-medium">{movement.description}</p>
                  </div>
                )}
                {movement.requester && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Talep Eden:</span>
                    <span className="font-medium">{movement.requester}</span>
                  </div>
                )}
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">İşlemi Yapan:</span>
                    <span className="font-medium">{movement.userId}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <span className="text-muted-foreground">Tarih:</span>
                    <span className="font-medium text-xs">{format(new Date(movement.date), 'dd MMMM yyyy, HH:mm', { locale: tr })}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <p>Arama kriterlerine uygun hareket bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}

    