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

// Get sold products - admin sees all, staff sees only their branch
export const getSoldProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<SoldProduct[]> => {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'sold'));

    if (userRole === 'staff' && branchId) {
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

// Delete sold product (admin only)
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

// Update sold product details (admin only)
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

// Restore sold product - reduce qty, if 0 delete sold, create restored in products
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

    if (userBranch && sold.branch !== userBranch && !isAdmin) {
      toast.error('Cannot restore - branch mismatch');
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

    // Create restored product
    const restoredRef = doc(collection(db, 'products'));
    await setDoc(restoredRef, {
      ...sold,
      status: 'restored',
      restoreComment: comment,
      quantity: restoreQty,
      restoredDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update sold qty
    const remainingQty = sold.quantity - restoreQty;
    if (remainingQty === 0) {
      // Delete if 0
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