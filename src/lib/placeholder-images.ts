
import type { Product } from './types';
import data from './placeholder-images.json';

// This file is now mis-named, it should be placeholder-data.ts
// but we will keep it for now to avoid breaking imports.
// It now contains full product definitions for seeding new users.

export const placeholderProducts: Omit<Product, 'id' | 'uid'>[] = data.placeholderImages.map((img, i) => ({
    name: `Ürün ${1001 + i}`,
    description: `Bu, ${1001 + i} numaralı ürünün açıklamasıdır.`,
    imageUrl: img.imageUrl,
    imageHint: img.imageHint,
    minStockLevel: 10, // Default minimum stock level
}));
