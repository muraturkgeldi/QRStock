
'use client';

import { useState } from 'react';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { fixSkusFromExcel } from '@/app/actions';
import { Upload, Info, FileSpreadsheet, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useCollection } from '@/firebase';
import type { Product } from '@/lib/types';
import * as xlsx from 'xlsx';

export default function FixSkuPage() {
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();
    const { data: products, loading: productsLoading } = useCollection<Product>('products', user?.uid);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleDownload = () => {
        if (products.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Veri Yok',
                description: 'Dışa aktarılacak ürün bulunamadı.',
            });
            return;
        }

        const dataToExport = products.map(p => ({
            'MevcutSKU': p.sku || p.id,
            'YeniSKU': p.sku || p.id, // Pre-fill with existing SKU
            'UrunAdi': p.name,
        }));

        const worksheet = xlsx.utils.json_to_sheet(dataToExport, { header: ["MevcutSKU", "YeniSKU", "UrunAdi"] });
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'SKU Listesi');
        xlsx.writeFile(workbook, 'sku_duzeltme_sablonu.xlsx');

        toast({
            title: 'Dosya İndirildi',
            description: 'SKU düzenleme şablonu başarıyla indirildi.',
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedFile) {
            toast({
                variant: 'destructive',
                title: 'Dosya Seçilmedi',
                description: 'Lütfen bir Excel dosyası seçin.',
            });
            return;
        }
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Kimlik Doğrulama Hatası',
                description: 'Lütfen tekrar giriş yapın.',
            });
            return;
        }

        setIsLoading(true);
        toast({ title: 'Güncelleme Başladı...', description: 'Stok kodları güncelleniyor, lütfen bekleyin.' });
        const formData = new FormData();
        formData.append('excelFile', selectedFile);

        try {
            const result = await fixSkusFromExcel(formData);
            if (result.success) {
                toast({
                    title: 'Başarılı!',
                    description: result.message,
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Hata!',
                    description: result.message,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Kritik Hata!',
                description: error.message || 'SKU\'lar güncellenirken beklenmedik bir hata oluştu.',
            });
        } finally {
            setIsLoading(false);
            setSelectedFile(null);
            (event.target as HTMLFormElement).reset();
        }
    };

    return (
        <div className="flex flex-col bg-app-bg min-h-dvh">
            <TopBar title="Excel ile Toplu SKU Düzelt" />
            <div className="p-4 space-y-4">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Nasıl Çalışır?</AlertTitle>
                    <AlertDescription>
                        <ol className="list-decimal list-inside space-y-2">
                            <li><strong>Şablonu İndirin:</strong> Aşağıdaki "Mevcut SKU'ları İndir" butonuyla tüm ürünlerinizin listesini Excel formatında indirin.</li>
                            <li><strong>Düzenleyin:</strong> İndirdiğiniz dosyayı açın. `YeniSKU` sütununa, düzeltmek istediğiniz kodların doğru, noktalı halini yazın. Değiştirmek istemediğiniz satırları olduğu gibi bırakın.</li>
                            <li><strong>Yükleyin:</strong> Düzenlediğiniz dosyayı kaydedin ve aşağıdaki yükleme alanını kullanarak sisteme geri yükleyin.</li>
                            <li><strong>Güncelleyin:</strong> "Stok Kodlarını Güncelle" butonuna basarak işlemi tamamlayın. Sistem, `MevcutSKU` ile `YeniSKU` arasındaki farklara göre güncelleme yapacaktır.</li>
                        </ol>
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle>Adım 1: Şablonu İndir</CardTitle>
                        <CardDescription>
                           Tüm ürünlerin listesini içeren Excel şablonunu indirin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button onClick={handleDownload} disabled={userLoading || productsLoading} className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            {userLoading || productsLoading ? 'Ürünler Yükleniyor...' : "Mevcut SKU'ları İndir"}
                        </Button>
                    </CardContent>
                </Card>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Adım 2: Güncel Dosyayı Yükle</CardTitle>
                            <CardDescription>
                                Düzenlediğiniz .xlsx veya .xls uzantılı Excel dosyasını seçin.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="excel-file">Excel Dosyası</Label>
                                <Input
                                    id="excel-file"
                                    name="excelFile"
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    required
                                    disabled={isLoading || userLoading}
                                />
                            </div>
                            {selectedFile && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                                    <FileSpreadsheet className="w-5 h-5" />
                                    <span>{selectedFile.name}</span>
                                </div>
                            )}
                            <Button type="submit" className="w-full" disabled={isLoading || userLoading || !selectedFile}>
                                {isLoading ? (
                                    'Yükleniyor...'
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" /> Stok Kodlarını Güncelle
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>
    );
}
