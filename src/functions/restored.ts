// src/functions/restored.ts

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

import { RestoredProduct } from '@/types/interface';

// Transaction context (set before calling sellRestoredProduct)
let txContext: {
  userId: string;
  userName: string;
  userRole: 'admin' | 'staff';
  businessId: string;
  businessName: string;
  branchId?: string;
  branchName?: string;
} | null = null;

export const setRestoredTransactionContext = (ctx: typeof txContext) => {
  txContext = ctx;
};

// Get restored products - Admin sees all (filterable), Staff sees theirs
// Real-time subscription
export const subscribeToRestoredProducts = (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId: string | null,
  onUpdate: (products: RestoredProduct[]) => void
): () => void => {
  const productsRef = collection(db, 'products');
  let q = query(
    productsRef,
    where('businessId', '==', businessId),
    where('status', '==', 'restored')
  );

  if (userRole === 'staff') {
    if (branchId) {
      q = query(q, where('branch', '==', branchId));
    }
  } else if (userRole === 'admin' && branchId && branchId !== 'All') {
    q = query(q, where('branch', '==', branchId));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const products: RestoredProduct[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        productName: data.productName || 'Unknown Product',
        category: data.category || 'uncategorized',
        model: data.model || '',
        quantity: data.quantity || 0,
        branch: data.branch || '',
        costPrice: data.costPrice || 0,
        sellingPrice: data.sellingPrice ?? null,
        restoredDate: data.restoredDate
          ? typeof data.restoredDate === 'string'
            ? data.restoredDate
            : data.restoredDate.toDate().toISOString()
          : new Date().toISOString(),
        restoreComment: data.restoreComment || undefined,
        businessId: data.businessId || businessId,
        unit: data.unit || 'pcs',
      };
    });
    onUpdate(products);
  }, (error) => {
    console.error("Real-time restored products error:", error);
  });

  return unsubscribe;
};

export const getRestoredProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId: string | null
): Promise<RestoredProduct[]> => {
  try {
    const productsRef = collection(db, 'products');
    let q = query(
      productsRef,
      where('businessId', '==', businessId),
      where('status', '==', 'restored')
    );

    if (userRole === 'staff') {
      if (branchId) {
        q = query(q, where('branch', '==', branchId));
      } else {
        return [];
      }
    } else if (userRole === 'admin' && branchId && branchId !== 'All') {
      q = query(q, where('branch', '==', branchId));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const products: RestoredProduct[] = snapshot.docs.map((d) => {
      const data = d.data();

      return {
        id: d.id,
        productName: data.productName || 'Unknown Product',
        category: data.category || 'uncategorized',
        model: data.model || '',
        quantity: data.quantity || 0,
        branch: data.branch || '',
        costPrice: data.costPrice || 0,
        sellingPrice: data.sellingPrice ?? null,
        restoredDate: data.restoredDate
          ? typeof data.restoredDate === 'string'
            ? data.restoredDate
            : data.restoredDate.toDate().toISOString()
          : new Date().toISOString(),
        restoreComment: data.restoreComment || undefined,
        businessId: data.businessId || businessId,
        unit: data.unit || 'pcs',
      };
    });

    return products;
  } catch (error: any) {
    console.error('Error loading restored products:', error);
    if (error.code === 'permission-denied') {
      toast.error('Permission denied: Cannot read restored products.');
    } else {
      toast.error('Failed to load restored products');
    }
    return [];
  }
};

// Delete restored product (admin only)
export const deleteRestoredProduct = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'products', id));
    toast.success('Restored product deleted permanently');
    return true;
  } catch (error: any) {
    console.error('Error deleting restored product:', error);
    if (error.code === 'permission-denied') {
      toast.error('Permission denied');
    } else {
      toast.error('Failed to delete restored product');
    }
    return false;
  }
};

// Sell restored product + log transaction (resold_restored)
export const sellRestoredProduct = async (
  id: string,
  sellQty: number,
  sellingPrice: number,
  deadline?: string,
  userBranch?: string | null
): Promise<boolean> => {
  try {
    const restoredDocRef = doc(db, 'products', id);
    const restoredSnap = await getDoc(restoredDocRef);

    if (!restoredSnap.exists()) {
      toast.error('Restored product not found in database');
      return false;
    }

    const restoredData = restoredSnap.data() as RestoredProduct;

    // Branch permission check
    if (userBranch && restoredData.branch !== userBranch) {
      toast.error('Cannot sell: Product not in your branch');
      return false;
    }

    if (sellQty <= 0 || sellQty > restoredData.quantity) {
      toast.error('Invalid quantity');
      return false;
    }

    if (sellingPrice <= 0) {
      toast.error('Selling price must be greater than 0');
      return false;
    }

    const now = new Date().toISOString();
    const remainingQty = restoredData.quantity - sellQty;

    const totalAmount = sellQty * sellingPrice;
    const costTotal = sellQty * restoredData.costPrice;
    const profit = totalAmount > costTotal ? totalAmount - costTotal : 0;
    const loss = totalAmount < costTotal ? costTotal - totalAmount : 0;

    // Create new sold record
    const soldRef = doc(collection(db, 'products'));
    await setDoc(soldRef, {
      ...restoredData,
      id: soldRef.id,
      status: 'sold',
      quantity: sellQty,
      sellingPrice,
      soldDate: now,
      deadline: deadline || null,
      updatedAt: now,
    });

    // Update or delete original restored record
    if (remainingQty === 0) {
      await deleteDoc(restoredDocRef);
    } else {
      await updateDoc(restoredDocRef, {
        quantity: remainingQty,
        updatedAt: now,
      });
    }

    // Log re-sold transaction with distinct type
    if (txContext) {
      await logTransaction({
        transactionType: 'resold_restored',
        actionDetails: `Re-sold ${sellQty} restored unit(s) of ${restoredData.productName} at ${sellingPrice.toLocaleString()} RWF each`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: restoredData.businessId,
        businessName: txContext.businessName,
        branchId: restoredData.branch,
        branchName: txContext.branchName,
        productId: id,
        productName: restoredData.productName,
        category: restoredData.category,
        model: restoredData.model,
        quantity: sellQty,
        costPrice: restoredData.costPrice,
        sellingPrice,
        profit,
        loss,
        metadata: {
          restoreComment: restoredData.restoreComment || null,
          originalRestoredDate: restoredData.restoredDate,
        },
      });
    }

    toast.success(
      remainingQty === 0
        ? `Fully re-sold (${sellQty} unit(s)). Removed from restored stock.`
        : `Re-sold ${sellQty} unit(s). Remaining in restored: ${remainingQty}`
    );

    return true;
  } catch (error: any) {
    console.error('Error in sellRestoredProduct:', error);
    if (error.code === 'permission-denied') {
      toast.error('Permission denied: Cannot modify this product');
    } else {
      toast.error('Sale failed. Please try again.');
    }
    return false;
  }
};

export { toast } from 'sonner';