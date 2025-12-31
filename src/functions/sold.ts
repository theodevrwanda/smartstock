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
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';
import { logTransaction } from '@/lib/transactionLogger';

import { SoldProduct } from '@/types/interface';

// Transaction context (set before calling functions that log)
let txContext: {
  userId: string;
  userName: string;
  userRole: 'admin' | 'staff';
  businessId: string;
  businessName: string;
  branchId?: string;
  branchName?: string;
} | null = null;

export const setSoldTransactionContext = (ctx: typeof txContext) => {
  txContext = ctx;
};

// Real-time subscription
export const subscribeToSoldProducts = (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId: string | null,
  onUpdate: (products: SoldProduct[]) => void
): () => void => {
  const productsRef = collection(db, 'products');

  let q = query(
    productsRef,
    where('businessId', '==', businessId),
    where('status', '==', 'sold')
  );

  if (userRole === 'staff') {
    if (branchId) {
      q = query(q, where('branch', '==', branchId));
    }
  } else if (userRole === 'admin' && branchId && branchId !== 'All') {
    q = query(q, where('branch', '==', branchId));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as SoldProduct));
    onUpdate(products);
  }, (error) => {
    console.error("Real-time sold products error:", error);
  });

  return unsubscribe;
};

// Get sold products - Admin sees all (filterable), Staff sees theirs
export const getSoldProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<SoldProduct[]> => {
  try {
    const productsRef = collection(db, 'products');

    let q = query(
      productsRef,
      where('businessId', '==', businessId),
      where('status', '==', 'sold')
    );

    if (userRole === 'staff') {
      if (!branchId) {
        return [];
      }
      q = query(q, where('branch', '==', branchId));
    } else if (userRole === 'admin' && branchId && branchId !== 'All') {
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
    toast.success('Sold product deleted permanently');
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

// Restore sold product + log transaction
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

    // Branch access control
    if (!isAdmin && userBranch && sold.branch !== userBranch) {
      toast.error('Cannot restore - you can only restore products from your branch');
      return false;
    }

    // Deadline check
    const deadlineDate = sold.deadline ? new Date(sold.deadline) : null;
    if (deadlineDate && deadlineDate < new Date()) {
      toast.error('Return deadline has expired');
      return false;
    }

    // Quantity validation
    if (restoreQty > sold.quantity || restoreQty <= 0) {
      toast.error('Invalid restore quantity');
      return false;
    }

    // Create restored record
    const restoredRef = doc(collection(db, 'products'));
    await setDoc(restoredRef, {
      ...sold,
      id: restoredRef.id,
      status: 'restored',
      restoreComment: comment || null,
      quantity: restoreQty,
      model: sold.model || '',
      unit: sold.unit || 'pcs',
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

    // Log restoration transaction
    if (txContext) {
      await logTransaction({
        transactionType: 'product_restored',
        actionDetails: `Restored ${restoreQty} unit(s) of ${sold.productName}${comment ? '. Reason: ' + comment : ''}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: sold.businessId,
        businessName: txContext.businessName,
        branchId: sold.branch,
        branchName: txContext.branchName,
        productId: id,
        productName: sold.productName,
        category: sold.category,
        model: sold.model,
        quantity: restoreQty,
        costPrice: sold.costPrice,
        sellingPrice: sold.sellingPrice,
        metadata: { restoreComment: comment || null },
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