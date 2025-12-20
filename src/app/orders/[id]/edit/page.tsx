import EditOrderClient from './EditOrderClient';

type PageProps = {
  params: { id: string };
};

export default async function EditOrderPage({ params }: PageProps) {
  const orderId = params.id;
  return <EditOrderClient orderId={orderId} />;
}
