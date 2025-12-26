'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { CreateOrderClient } from './CreateOrderClient';
import { safeFrom } from '@/lib/nav';

function CreateOrderPageContent() {
    const searchParams = useSearchParams();
    const fallbackUrl = safeFrom(searchParams.get('from'), '/orders');

    return (
      <div className="flex flex-col bg-app-bg min-h-dvh">
        <PageHeader title="Yeni Sipariş Oluştur" fallback={fallbackUrl} />
        <main>
          <CreateOrderClient />
        </main>
      </div>
    );
}


export default function CreateOrderPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor...</div>}>
      <CreateOrderPageContent />
    </Suspense>
  );
}
