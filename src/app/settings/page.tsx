
'use client';

import { useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/ui/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc } from '@/firebase';
import { addEmailToMailingList, removeEmailFromMailingList } from '@/app/actions';
import type { AppSettings } from '@/lib/types';
import { Mail, Plus, Trash2, Database, FileUp, AppWindow, MapPin, Wrench, Users, Moon, Sun } from 'lucide-react';
import PwaInstallButton from '@/components/PwaInstallButton';
import { z } from 'zod';
import { useTheme } from '@/hooks/use-theme';
import { Switch } from '@/components/ui/switch';

const emailSchema = z.string().email({ message: "Geçersiz e-posta adresi." });

export default function SettingsPage() {
    const { user, loading: userLoading } = useUser();
    const { data: settings, loading: settingsLoading } = useDoc<AppSettings>(`settings/${user?.uid}`);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { theme, toggleTheme } = useTheme();
    
    const isLoading = userLoading || settingsLoading;
    const isDark = theme === 'dark';

    const handleAddEmail = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Giriş yapmalısınız.' });
            return;
        }

        const formData = new FormData(event.currentTarget);
        const email = formData.get('email') as string;
        
        const validation = emailSchema.safeParse(email);
        if (!validation.success) {
            toast({ variant: 'destructive', title: 'Geçersiz E-posta', description: validation.error.errors[0].message });
            return;
        }
        
        setIsSubmitting(true);
        try {
            await addEmailToMailingList(formData);
            toast({ title: 'Başarılı!', description: 'E-posta adresi listeye eklendi.' });
            (event.target as HTMLFormElement).reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message || 'E-posta eklenirken bir hata oluştu.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveEmail = async (email: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Giriş yapmalısınız.' });
            return;
        }

        try {
            await removeEmailFromMailingList(email);
            toast({ title: 'Başarılı!', description: `${email} listeden kaldırıldı.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message || 'E-posta silinirken bir hata oluştu.' });
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col bg-app-bg min-h-dvh">
                <TopBar title="Ayarlar" />
                <div className="p-4 text-center">Yükleniyor...</div>
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-app-bg min-h-dvh">
            <TopBar title="Profil & Ayarlar" />
            <div className="p-4 space-y-6">

                <Card>
                    <CardHeader>
                        <CardTitle>Görünüm</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                {isDark ? <Moon className="w-5 h-5"/> : <Sun className="w-5 h-5"/>}
                                <div>
                                    <p className="text-sm font-medium">Koyu Tema</p>
                                    <p className="text-xs text-muted-foreground">
                                       Uygulama genelinde koyu temayı etkinleştir.
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={isDark}
                                onCheckedChange={() => toggleTheme()}
                                aria-label="Koyu temayı aç/kapat"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                           <Database className="w-5 h-5" />
                            Veri Yönetimi
                        </CardTitle>
                        <CardDescription>
                           Ürün ve lokasyon verilerinizi yönetin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                        <Button asChild variant="outline">
                            <Link href="/stock/import">
                                <FileUp className="mr-2" /> Toplu Ürün Ekle
                            </Link>
                        </Button>
                         <Button asChild variant="outline">
                            <Link href="/locations/new">
                                <MapPin className="mr-2" /> Lokasyon Ekle
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="col-span-2">
                            <Link href="/settings/fix-data">
                                <Wrench className="mr-2" /> Stok Kodu Düzenle
                            </Link>
                        </Button>
                         <Button asChild variant="outline" className="col-span-2">
                            <Link href="/settings/users">
                                <Users className="mr-2" /> Kullanıcıları Yönet
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Mail className="w-5 h-5" />
                            Raporlama Mail Listesi
                        </CardTitle>
                        <CardDescription>
                            Düşük stok raporlarının gönderileceği e-posta adreslerini buradan yönetin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleAddEmail} className="flex items-center gap-2">
                            <Label htmlFor="email" className="sr-only">Yeni E-posta</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="ornek@mail.com"
                                required
                                disabled={isSubmitting}
                            />
                            <Button type="submit" size="icon" disabled={isSubmitting}>
                                <Plus className="w-4 h-4" />
                                <span className="sr-only">Ekle</span>
                            </Button>
                        </form>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Mevcut Adresler</h4>
                            {settings?.mailingList && settings.mailingList.length > 0 ? (
                                <ul className="space-y-2">
                                    {settings.mailingList.map((email) => (
                                        <li key={email} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                            <span className="text-sm font-medium">{email}</span>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveEmail(email)} className="text-destructive hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                                <span className="sr-only">{email} adresini sil</span>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">Mail listesi boş.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                           <AppWindow className="w-5 h-5" />
                            Uygulama Yönetimi
                        </CardTitle>
                        <CardDescription>
                           Uygulamayı cihazınıza yükleyerek daha hızlı erişim sağlayın.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <PwaInstallButton />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
