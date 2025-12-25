// src/functions/sold.ts

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

export interface SoldProduct {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: string;
  costPrice: number;
  sellingPrice: number;
  soldDate: string;
  deadline?: string;
  businessId: string;
}

// Get sold products - strict branch access control
export const getSoldProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<SoldProduct[]> => {
  try {
    const productsRef = collection(db, 'products');

    // Base query: sold products for this business
    let q = query(
      productsRef,
      where('businessId', '==', businessId),
      where('status', '==', 'sold')
    );

    if (userRole === 'admin') {
      // Admin sees all sold products across all branches → no filter
    } else if (userRole === 'staff') {
      // Staff with no branch → no access to any sold data
      if (!branchId) {
        return []; // Explicitly return empty
      }

      // Staff with branch → only their branch
      q = query(q, where('branch', '==', branchId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as SoldProduct));
  } catch (error) {
    console.error('Error loading sold products:', error);
    toast.error('Failed to load sold products');
    return [];
  }
};

// Delete sold product (admin only - no change needed here)
export const deleteSoldProduct = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'products', id));
    toast.success('Sold product deleted');
    return true;
  } catch (error) {
    console.error('Error deleting sold product:', error);
    toast.error('Failed to delete sold product');
    return false;
  }
};

// Update sold product details (admin only - no change needed)
export const updateSoldProduct = async (
  id: string,
  updates: Partial<SoldProduct>
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'products', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Sold product updated');
    return true;
  } catch (error) {
    console.error('Error updating sold product:', error);
    toast.error('Update failed');
    return false;
  }
};

// Restore sold product - with branch check (already good, minor comment update)
export const restoreSoldProduct = async (
  id: string,
  restoreQty: number,
  comment: string,
  userBranch?: string | null,
  isAdmin: boolean = false
): Promise<boolean> => {
  try {
    const soldDoc = doc(db, 'products', id);
    const soldSnap = await getDoc(soldDoc);

    if (!soldSnap.exists()) {
      toast.error('Sold product not found');
      return false;
    }

    const sold = soldSnap.data() as SoldProduct;

    // Non-admin staff can only restore from their own branch
    if (!isAdmin && userBranch && sold.branch !== userBranch) {
      toast.error('Cannot restore - you can only restore products from your branch');
      return false;
    }

    const deadlineDate = sold.deadline ? new Date(sold.deadline) : null;
    if (deadlineDate && deadlineDate < new Date()) {
      toast.error('Return deadline has expired');
      return false;
    }

    if (restoreQty > sold.quantity || restoreQty <= 0) {
      toast.error('Invalid restore quantity');
      return false;
    }

    // Create restored entry
    const restoredRef = doc(collection(db, 'products'));
    await setDoc(restoredRef, {
      ...sold,
      id: restoredRef.id,
      status: 'restored',
      restoreComment: comment,
      quantity: restoreQty,
      restoredDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update or delete original sold record
    const remainingQty = sold.quantity - restoreQty;
    if (remainingQty === 0) {
      await deleteDoc(soldDoc);
    } else {
      await updateDoc(soldDoc, {
        quantity: remainingQty,
        updatedAt: new Date().toISOString(),
      });
    }

    toast.success(`Restored ${restoreQty} unit(s)`);
    return true;
  } catch (error) {
    console.error('Error restoring product:', error);
    toast.error('Restore failed');
    return false;
  }
};

export { toast } from 'sonner';