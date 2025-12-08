
import type { LucideIcon } from 'lucide-react';
import type { User } from 'firebase/auth';


export type AppUser = User & {
  role?: 'admin' | 'editor' | 'user';
};


export type Product = {
  id: string; // Corresponds to QR code data
  name: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  uid: string;
  sku: string; // User-facing Stock Keeping Unit, allows for dots.
  barcode?: string;
  minStockLevel?: number;
  tags?: string[];
};

export type Location = {
  id: string;
  name: string;
  icon?: LucideIcon;
  type: 'warehouse' | 'corridor' | 'shelf';
  parentId?: string | null; // ID of the parent (warehouse for corridor, corridor for shelf)
  uid: string;
};

export type StockItem = {
  id: string;
  product?: Product;
  quantity: number;
  location?: Location;
  uid: string;
  // Denormalized fields for easier querying
  productId: string;
  locationId: string;
};

export type StockMovement = {
  id:string;
  productId: string; // Changed from stockItemId
  locationId: string; // Added for direct access
  product?: Product; // Denormalized data for display
  type: 'in' | 'out' | 'transfer';
  quantity: number;
  date: string;
  userId: string; // Name of the user performing the action
  requester?: string; // Name of the person requesting the stock (for 'out' movements)
  description?: string; // Optional description for the movement
  uid: string;
};

export type AppSettings = {
  id: string;
  uid: string;
  mailingList: string[];
};

export type PurchaseOrderItem = {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    receivedQuantity: number;
    remainingQuantity: number;
    description: string;
};

export type PurchaseOrder = {
    id: string;
    uid: string;
    orderNumber: string;
    orderDate: string;
    status: 'draft' | 'ordered' | 'partially-received' | 'received' | 'cancelled';
    items: PurchaseOrderItem[];
    internalNote?: string;
    supplierName?: string;
};

export type UserProfile = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role?: 'admin' | 'user';
}
