
import { Suspense } from 'react';
import OrdersClient from './OrdersClient';

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Yükleniyor…</div>}>
      <OrdersClient />
    </Suspense>
  );
}

    