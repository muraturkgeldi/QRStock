
'use client'

import React from 'react';
import TopBar from '@/components/ui/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import FormField from '@/components/ui/FormField';

export default function TransfersScreen() {
    return (
        <div className="flex flex-col bg-app-bg min-h-dvh">
            <TopBar title="Stok Transferi" />
            <main className="p-4 space-y-4">
                <Card>
                    <div className="p-4">
                        <FormField label="Ürün ID" placeholder="SKU veya ID" />
                        <FormField label="Kaynak Lokasyon" placeholder="A01" />
                        <FormField label="Hedef Lokasyon" placeholder="B02" />
                        <FormField label="Miktar" placeholder="10" keyboardType="numeric" />
                        <Button className="w-full mt-4">Transfer Et</Button>
                    </div>
                </Card>
            </main>
        </div>
    );
}
