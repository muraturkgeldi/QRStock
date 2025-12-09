
import type { PurchaseOrder } from './types';

export type AppRole = 'admin' | 'purchaser' | 'warehouse' | 'manager' | 'viewer';

export type UserContext = {
  uid: string;
  role: AppRole;
  department?: string | null;
};

function isOwner(user: UserContext, order: PurchaseOrder) {
  // Check new field first, then fallback to old uid field for compatibility
  return order.createdByUid === user.uid || order.uid === user.uid;
}

export function canArchiveOrder(user: UserContext, order: PurchaseOrder): boolean {
  if (user.role === 'admin' || user.role === 'manager') return true;
  if (user.role === 'purchaser') return isOwner(user, order);
  return false;
}

export function canHardDeleteOrder(user: UserContext, order: PurchaseOrder): boolean {
  // Only admin can permanently delete
  return user.role === 'admin';
}

export function canChangeOrderStatus(
  user: UserContext,
  order: PurchaseOrder,
  nextStatus: PurchaseOrder['status'],
): boolean {
  if (user.role === 'admin' || user.role === 'manager') return true;

  if (user.role === 'purchaser') {
    // Can only play with draft/ordered/cancelled on their own orders
    if (!isOwner(user, order)) return false;
    const allowed = new Set<PurchaseOrder['status']>([
      'draft',
      'ordered',
      'cancelled',
    ]);
    return allowed.has(nextStatus);
  }

  if (user.role === 'warehouse') {
    // Can only handle delivery-related statuses
    const allowedTransitions: Record<
      PurchaseOrder['status'],
      PurchaseOrder['status'][]
    > = {
      draft: [],
      ordered: ['partially-received', 'received'],
      'partially-received': ['received'],
      received: [],
      cancelled: [],
      archived: [],
    };

    const current = order.status;
    return allowedTransitions[current]?.includes(nextStatus) ?? false;
  }

  return false;
}
