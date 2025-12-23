// src/functions/restore.ts

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

export interface RestoredProduct {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: string;
  costPrice: number;
  sellingPrice?: number | null;
  restoredDate: string;
  restoreComment?: string;
  businessId: string;
}

// Get restored products
export const getRestoredProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<RestoredProduct[]> => {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'restored'));

    if (userRole === 'staff' && branchId) {
      q = query(q, where('branch', '==', branchId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as RestoredProduct));
  } catch (error) {
    console.error('Error loading restored products:', error);
    toast.error('Failed to load restored products');
    return [];
  }
};

// Delete restored product (admin only)
export const deleteRestoredProduct = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'products', id));
    toast.success('Restored product deleted');
    return true;
  } catch (error) {
    console.error('Error deleting restored product:', error);
    toast.error('Failed to delete restored product');
    return false;
  }
};

// Sell restored product - STRICT branch check for everyone (including admin)
export const sellRestoredProduct = async (
  id: string,
  sellQty: number,
  sellingPrice: number,
  deadline?: string,
  userBranch?: string | null
): Promise<boolean> => {
  try {
    const restoredDoc = doc(db, 'products', id);
    const restoredSnap = await getDoc(restoredDoc);

    if (!restoredSnap.exists()) {
      toast.error('Restored product not found');
      return false;
    }

    const restored = restoredSnap.data() as RestoredProduct;

    // Strict check: user can only sell from their assigned branch
    if (userBranch && restored.branch !== userBranch) {
      toast.error('Cannot sell - product not from your assigned branch');
      return false;
    }

    if (sellQty > restored.quantity || sellQty <= 0) {
      toast.error('Invalid quantity');
      return false;
    }

    if (sellingPrice <= 0) {
      toast.error('Selling price must be greater than 0');
      return false;
    }

    // Reduce quantity in restored product
    const remainingQty = restored.quantity - sellQty;
    if (remainingQty === 0) {
      await deleteDoc(restoredDoc);
    } else {
      await updateDoc(restoredDoc, {
        quantity: remainingQty,
        updatedAt: new Date().toISOString(),
      });
    }

    // Create new sold record
    const soldRef = doc(collection(db, 'products'));
    await setDoc(soldRef, {
      ...restored,
      id: soldRef.id,
      status: 'sold',
      sellingPrice,
      soldDate: new Date().toISOString(),
      quantity: sellQty,
      deadline: deadline || null,
      updatedAt: new Date().toISOString(),
    });

    toast.success(`Sold ${sellQty} unit(s) from restored stock`);
    return true;
  } catch (error) {
    console.error('Error selling restored product:', error);
    toast.error('Sale failed');
    return false;
  }
};