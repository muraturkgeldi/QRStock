import { Suspense } from 'react';
import EditOrderClient from './EditOrderClient';
import type { Product, PurchaseOrderItem } from '@/lib/types';
import { adminDb } from '@/lib/admin.server';
import { PageHeader } from '@/components/PageHeader';

// Helper to safely fetch initial data on the server
async function getOrderData(orderId: string): Promise<{ initialItems: PurchaseOrderItem[], allProducts: Product[] }> {
    try {
        const db = adminDb();
        const orderSnap = await db.collection('purchaseOrders').doc(orderId).get();
        
        if (!orderSnap.exists()) {
            return { initialItems: [], allProducts: [] };
        }

        const orderData = orderSnap.data();
        const initialItems = orderData?.items || [];
        
        // Fetch all products belonging to the user who owns the order
        const productsSnap = await db.collection('products').where('uid', '==', orderData?.uid).get();
        const allProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        return { initialItems, allProducts };
    } catch (error) {
        console.error("Failed to fetch order data on server:", error);
        return { initialItems: [], allProducts: [] };
    }
}


export default async function EditOrderPage(
  { params, searchParams } : 
  { params: Promise<{ id: string }>, searchParams?: Promise<Record<string, string | string[] | undefined>> }
) {
  const { id: orderId } = await params;
  
  const { initialItems, allProducts } = await getOrderData(orderId);

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
        <PageHeader title="Siparişi Düzenle" fallback={`/orders/${orderId}`} />
        <Suspense fallback={<div className="p-4 text-center">Düzenleme ekranı yükleniyor...</div>}>
          <EditOrderClient
            orderId={orderId}
            initialItems={initialItems}
            allProducts={allProducts}
          />
        </Suspense>
    </div>
  );
}
