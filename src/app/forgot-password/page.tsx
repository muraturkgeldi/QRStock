
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleReset = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen e-posta adresinizi girin.' });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'E-posta Gönderildi', description: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh p-4 bg-app-bg">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-extrabold text-text mb-4">Şifreyi Sıfırla</h1>
        <p className="text-subtext mb-6">Şifre sıfırlama bağlantısı göndereceğimiz e-posta adresinizi girin.</p>
        <FormField label="E-posta" placeholder="ornek@sirket.com" value={email} onChangeText={setEmail} />
        <PrimaryButton title="Sıfırlama Bağlantısı Gönder" onClick={handleReset} disabled={isLoading} />
      </div>
    </div>
  );
}
