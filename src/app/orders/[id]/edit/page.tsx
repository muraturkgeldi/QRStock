
import { Suspense } from 'react';
import EditOrderClient from './EditOrderClient';
import type { Product, PurchaseOrderItem } from '@/lib/types';
import { adminDb } from '@/lib/admin.server';

// Helper to safely fetch initial data on the server
async function getOrderData(orderId: string): Promise<{ initialItems: PurchaseOrderItem[], allProducts: Product[] }> {
    try {
        const orderRef = adminDb().collection('purchaseOrders').doc(orderId);
        const orderSnap = await orderRef.get();
        const initialItems = orderSnap.exists() ? (orderSnap.data()?.items || []) : [];

        const productsSnap = await adminDb().collection('products').where('uid', '==', orderSnap.data()?.uid).get();
        const allProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        return { initialItems, allProducts };
    } catch (error) {
        console.error("Failed to fetch order data on server:", error);
        return { initialItems: [], allProducts: [] };
    }
}


export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const { id: orderId } = params;
  // Fetch data on the server and pass it as props to the client component
  const { initialItems, allProducts } = await getOrderData(orderId);

  return (
    <Suspense fallback={<div className="p-4 text-center">Düzenleme ekranı yükleniyor...</div>}>
      <EditOrderClient orderId={orderId} initialItems={initialItems} allProducts={allProducts} />
    </Suspense>
  );
}
