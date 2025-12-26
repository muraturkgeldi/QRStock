
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { importProductsFromExcel } from '@/app/actions';
import { Upload, Info, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/firebase';
import { safeFrom } from '@/lib/nav';

export default function ImportProductsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: userLoading } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fallbackUrl = safeFrom(searchParams.get('from'), '/stock');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
        }
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
        const formData = new FormData();
        formData.append('excelFile', selectedFile);

        try {
            await importProductsFromExcel(formData);
            toast({
                title: 'Başarılı!',
                description: 'Ürünler başarıyla içe aktarıldı.',
            });
            router.push(fallbackUrl);
            router.refresh();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Hata!',
                description: error.message || 'Ürünler içe aktarılırken bir hata oluştu.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col bg-app-bg min-h-dvh">
            <PageHeader title="Excel'den Toplu Ürün Ekle" fallback={fallbackUrl} />
            <div className="p-4 pt-0 space-y-4">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Excel Dosya Formatı</AlertTitle>
                    <AlertDescription>
                        Lütfen Excel dosyanızın ilk sayfasında şu sütun başlıklarının bulunduğundan emin olun:
                        <ul className="list-disc list-inside mt-2 font-mono text-sm">
                            <li>StokKodu</li>
                            <li>Adi</li>
                        </ul>
                         Ürünlerin diğer özellikleri (açıklama vb.) daha sonra uygulama üzerinden güncellenebilir. Stok kodları benzersiz olmalıdır.
                    </AlertDescription>
                </Alert>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Dosya Yükleme</CardTitle>
                            <CardDescription>
                                Ürünleri içeren .xlsx veya .xls uzantılı Excel dosyanızı seçin.
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
                                        <Upload className="mr-2 h-4 w-4" /> Ürünleri İçe Aktar
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
