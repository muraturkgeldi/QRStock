'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const LoginSchema = z.object({
  email: z.string().email({ message: 'Geçerli bir e-posta adresi girin.' }),
  password: z
    .string()
    .min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

// 🔥 1) Bütün login mantığını buraya taşıyoruz
function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qrstock-login');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) {
          setEmail(parsed.email);
          setRememberMe(true);
        }
      }
    } catch (e) {
      console.warn('Kaydedilmiş giriş bilgileri okunamadı', e);
    }
  }, []);
  
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    
    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({ variant: 'destructive', title: 'Doğrulama Hatası', description: validation.error.errors[0].message });
      setIsLoading(false);
      return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (rememberMe) {
          localStorage.setItem('qrstock-login', JSON.stringify({ email }));
        } else {
          localStorage.removeItem('qrstock-login');
        }

        const idToken = await userCredential.user.getIdToken(true);

        const res = await fetch('/api/session', {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Oturum oluşturulurken bir hata oluştu.');
        }
        
        router.push('/dashboard');

    } catch (error: any) {
      let description = 'E-posta veya şifre yanlış.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'E-posta veya şifre yanlış.';
      } else {
        description = error.message;
      }
      toast({ variant: 'destructive', title: 'Giriş Başarısız', description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" type="email" placeholder="ornek@sirket.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
            onMouseDown={() => setShowPassword(true)}
            onMouseUp={() => setShowPassword(false)}
            onMouseLeave={() => setShowPassword(false)}
            onTouchStart={() => setShowPassword(true)}
            onTouchEnd={() => setShowPassword(false)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
       <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Beni hatırla
        </label>
         <Link href="/forgot-password" className="text-primary text-sm font-semibold">
            Şifremi unuttum
        </Link>
      </div>

      <PrimaryButton title="Giriş Yap" type="submit" disabled={isLoading} />
    </form>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-app-bg text-text">
      {/* 🖥️ DESKTOP LAYOUT */}
      <div className="hidden lg:grid lg:grid-cols-2 h-screen">
        {/* Sol panel: logo / slogan / arka plan */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-bold tracking-tight">
                Stok Takip Sistemi
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-md">
              Depo ve stok hareketlerini tek ekrandan yönet. 
              Barkod tara, stok düş, siparişleri takip et.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Stok Takip Sistemi. Tüm hakları saklıdır.
          </p>
        </div>

        {/* Sağ panel: form kartı */}
        <div className="flex items-center justify-center p-10">
          <div className="w-full max-w-md">
            <div className="bg-surface border rounded-2xl shadow-lg p-8">
              <h1 className="text-2xl font-semibold mb-2">Giriş Yap</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Hesabınla devam et.
              </p>
              <LoginForm />
                <p className="text-center text-subtext text-sm mt-6">
                    Hesabınız yok mu?{' '}
                    <Link href="/register" className="font-bold text-primary">
                        Kayıt Olun
                    </Link>
                </p>
            </div>
          </div>
        </div>
      </div>

      {/* 📱 MOBİL LAYOUT */}
      <div className="flex flex-col lg:hidden min-h-screen px-4 py-8">
        {/* Logo + başlık */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-semibold">Stok Takip Sistemi</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Depo ve stok kontrolü için hızlı giriş.
          </p>
        </div>

        {/* Form alanı */}
        <div className="flex-1 flex items-start">
          <div className="w-full">
            <div className="bg-surface border rounded-2xl shadow-md p-6">
              <LoginForm />
            </div>
             <p className="text-center text-subtext text-sm pt-6">
                Hesabınız yok mu?{' '}
                <Link href="/register" className="font-bold text-primary">
                    Kayıt Olun
                </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
