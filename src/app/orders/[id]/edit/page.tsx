import EditOrderClient from './EditOrderClient';
import { use } from 'react';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditOrderPage({ params }: PageProps) {
  const { id: orderId } = await params;
  return <EditOrderClient orderId={orderId} />;
}
