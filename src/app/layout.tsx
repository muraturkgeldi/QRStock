import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Stok Takip Sistemi',
  description: 'QR kod tabanlı stok yönetimi uygulaması.',
  applicationName: 'Stok Takip Sistemi',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Stok Takip Sistemi',
    statusBarStyle: 'default',
  },
   icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#252626' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable}`}>
      <body className="font-body antialiased bg-app-bg text-text">
        <FirebaseClientProvider>
            <div className="flex flex-col min-h-dvh">
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
            <FirebaseErrorListener />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
