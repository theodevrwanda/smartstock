// src/functions/deleted.ts

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

export interface DeletedProduct {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: string;
  costPrice: number;
  costPricePerUnit?: number;
  unit?: string;
  sellingPrice?: number | null;
  deletedDate: string;
  restoreComment?: string;
  businessId: string;
}

// Get deleted products
export const getDeletedProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<DeletedProduct[]> => {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'deleted'));

    if (userRole === 'staff' && branchId) {
      q = query(q, where('branch', '==', branchId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as DeletedProduct));
  } catch (error) {
    console.error('Error loading deleted products:', error);
    toast.error('Failed to load deleted products');
    return [];
  }
};

// Restore single deleted product
export const restoreDeletedProduct = async (
  id: string,
  userBranch?: string | null,
  isAdmin: boolean = false
): Promise<boolean> => {
  try {
    const deletedDoc = doc(db, 'products', id);
    const deletedSnap = await getDoc(deletedDoc);

    if (!deletedSnap.exists()) {
      toast.error('Deleted product not found');
      return false;
    }

    const deleted = deletedSnap.data() as DeletedProduct;

    if (userBranch && deleted.branch !== userBranch && !isAdmin) {
      toast.error('Cannot restore - product not from your assigned branch');
      return false;
    }

    await updateDoc(deletedDoc, {
      status: 'store',
      deletedDate: null,
      updatedAt: new Date().toISOString(),
    });

    toast.success('Product restored to store');
    return true;
  } catch (error) {
    console.error('Error restoring deleted product:', error);
    toast.error('Restore failed');
    return false;
  }
};

// Bulk restore multiple deleted products
export const bulkRestoreDeletedProducts = async (
  productIds: string[],
  userBranch?: string | null,
  isAdmin: boolean = false
): Promise<{ successCount: number; failedCount: number }> => {
  const batch = writeBatch(db);
  let successCount = 0;
  let failedCount = 0;

  try {
    for (const id of productIds) {
      const deletedDoc = doc(db, 'products', id);
      const deletedSnap = await getDoc(deletedDoc);

      if (!deletedSnap.exists()) {
        failedCount++;
        continue;
      }

      const deleted = deletedSnap.data() as DeletedProduct;

      if (userBranch && deleted.branch !== userBranch && !isAdmin) {
        failedCount++;
        continue;
      }

      batch.update(deletedDoc, {
        status: 'store',
        deletedDate: null,
        updatedAt: new Date().toISOString(),
      });
      successCount++;
    }

    await batch.commit();

    if (successCount > 0) {
      toast.success(`Restored ${successCount} product(s)`);
    }
    if (failedCount > 0) {
      toast.warning(`${failedCount} product(s) could not be restored (branch mismatch)`);
    }

    return { successCount, failedCount };
  } catch (error) {
    console.error('Error bulk restoring products:', error);
    toast.error('Bulk restore failed');
    return { successCount: 0, failedCount: productIds.length };
  }
};

// Permanently delete (admin only)
export const permanentlyDeleteProduct = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'products', id));
    toast.success('Product permanently deleted');
    return true;
  } catch (error) {
    console.error('Error permanently deleting product:', error);
    toast.error('Permanent delete failed');
    return false;
  }
};
