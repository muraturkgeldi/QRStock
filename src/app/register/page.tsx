
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { registerUserWithRole } from '@/app/actions';

const SignupSchema = z.object({
  displayName: z.string().min(3, { message: 'Ad Soyad en az 3 karakter olmalıdır.' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    setIsLoading(true);
    const validation = SignupSchema.safeParse({ displayName, email, password });
    if (!validation.success) {
      toast({ variant: 'destructive', title: 'Doğrulama Hatası', description: validation.error.errors[0].message });
      setIsLoading(false);
      return;
    }

    try {
      const { userCredential, role } = await registerUserWithRole({ displayName, email, password });
      
      if (role === 'admin') {
          toast({ title: 'Kayıt Başarılı!', description: 'Yönetici (admin) olarak atandınız. Uygulamaya hoş geldiniz!' });
      } else {
          toast({ title: 'Kayıt Başarılı!', description: 'Hesabınız başarıyla oluşturuldu.' });
      }

      const idToken = await userCredential.user.getIdToken(true);
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) throw new Error(await res.text() || 'Session creation failed');
      
      router.push('/dashboard');
    } catch (error: any) {
      const description = error.code === 'auth/email-already-in-use'
        ? 'Bu e-posta adresi zaten kullanılıyor.'
        : error.message;
      toast({ variant: 'destructive', title: 'Kayıt Başarısız', description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh p-4 bg-app-bg">
       <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-3xl font-extrabold text-text mb-4">Hesap Oluştur</h1>
            <FormField label="Ad Soyad" placeholder="Adınız Soyadınız" value={displayName} onChangeText={setDisplayName} />
            <FormField label="E-posta" placeholder="ornek@sirket.com" value={email} onChangeText={setEmail} />
            <FormField label="Şifre" placeholder="••••••••" value={password} onChangeText={setPassword} />
            <PrimaryButton title="Kayıt Ol" onClick={handleSignup} disabled={isLoading} />
        </div>
    </div>
  );
}

    