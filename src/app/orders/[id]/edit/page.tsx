import EditOrderClient from './EditOrderClient';
import { use } from 'react';

type PageProps = {
  params: { id: string };
};

export default async function EditOrderPage({ params }: PageProps) {
  const { id: orderId } = params;
  return <EditOrderClient orderId={orderId} />;
}
