

'use server';

import { getProductById, getLocations } from '@/lib/data';
import { notFound } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { updateStock } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Boxes } from 'lucide-react';

export default async function BatchUpdateStockPage({ searchParams }: { searchParams: { products: string } }) {
  const productIds = searchParams.products ? searchParams.products.split(',') : [];
  
  if (productIds.length === 0) {
    notFound();
  }

  const locations = await getLocations();
  const products = (await Promise.all(productIds.map(id => getProductById(id))))
                    .filter(p => p !== undefined) as { id: string, name: string, imageUrl: string, imageHint: string }[];

  const updateBatchStock = async (formData: FormData) => {
    'use server';
    const productIds = (formData.get('productIds') as string).split(',');
    const type = formData.get('type') as 'in' | 'out';
    const quantity = Number(formData.get('quantity'));
    const locationId = formData.get('locationId') as string;

    for (const productId of productIds) {
      const singleProductFormData = new FormData();
      singleProductFormData.append('productId', productId);
      singleProductFormData.append('type', type);
      singleProductFormData.append('quantity', String(quantity));
      singleProductFormData.append('locationId', locationId);
      // We are not handling errors here for simplicity. In a real app, you would.
      await updateStock('', singleProductFormData);
    }

    // This redirection needs to be handled on the client side after form submission
    // Since this is a server component handling a form action, we can't redirect directly
    // A client-side wrapper would be needed for a redirect. For now, it updates and stays.
    // A page revalidation would be good here too.
  };

  return (
    <div className="flex flex-col bg-app-bg min-h-dvh">
      <TopBar title="Toplu Stok Güncelle" />
      <div className="p-4 space-y-4">
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Boxes className="w-5 h-5" />
                    Güncellenecek Ürünler
                </CardTitle>
                <CardDescription>{products.length} adet ürün güncellenecek.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-48">
                    <div className="space-y-2 pr-4">
                    {products.map(product => (
                        <div key={product.id} className="flex items-center gap-3 p-2 bg-muted rounded-md">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                              data-ai-hint={product.imageHint}
                            />
                            <p className="font-medium text-sm flex-1">{product.name}</p>
                            <Badge variant="outline">{product.id}</Badge>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stok Hareketi Detayları</CardTitle>
            <CardDescription>Tüm ürünler için ortak hareket bilgileri.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateBatchStock} className="space-y-6">
              <input type="hidden" name="productIds" value={products.map(p => p.id).join(',')} />
              
              <div className="space-y-2">
                <Label>Hareket Tipi</Label>
                <RadioGroup name="type" defaultValue="in" className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in" id="in" />
                    <Label htmlFor="in" className="font-normal">Giriş</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="out" id="out" />
                    <Label htmlFor="out" className="font-normal">Çıkış</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Adet (Her ürün için)</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  placeholder="0"
                  required
                  min="1"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationId">Lokasyon</Label>
                <Select name="locationId" required >
                    <SelectTrigger id="locationId">
                        <SelectValue placeholder="Lokasyon seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                        {locations.map(location => (
                            <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" size="lg">
                {products.length} Ürünü Güncelle
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    