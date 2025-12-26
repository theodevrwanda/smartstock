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
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';
import { logTransaction, TransactionLog } from '@/lib/transactionLogger';

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
  restoreComment?: string | null;
  businessId: string;
}

// Transaction logging context
let txContext: {
  userId: string;
  userName: string;
  userRole: string;
  businessId: string;
  businessName: string;
  branchId?: string;
  branchName?: string;
} | null = null;

export const setRestoredTransactionContext = (ctx: typeof txContext) => {
  txContext = ctx;
};

// Helper to log a transaction
const logTx = async (
  transactionType: TransactionLog['transactionType'],
  details: Partial<TransactionLog>
) => {
  if (!txContext || !navigator.onLine) return;
  
  try {
    await logTransaction({
      transactionType,
      businessId: txContext.businessId,
      businessName: txContext.businessName,
      branchId: txContext.branchId,
      branchName: txContext.branchName,
      userId: txContext.userId,
      userName: txContext.userName,
      userRole: txContext.userRole,
      actionDetails: details.actionDetails || '',
      ...details,
    });
  } catch (e) {
    console.error('Failed to log transaction:', e);
  }
};

// Get restored products - robust mapping
export const getRestoredProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<RestoredProduct[]> => {
  try {
    const productsRef = collection(db, 'products');
    let q = query(
      productsRef,
      where('businessId', '==', businessId),
      where('status', '==', 'restored')
    );

    if (userRole === 'staff' && branchId) {
      q = query(q, where('branch', '==', branchId));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('No restored products found for query');
      return [];
    }

    const products: RestoredProduct[] = snapshot.docs.map((d) => {
      const data = d.data();

      return {
        id: d.id,
        productName: data.productName || 'Unknown Product',
        category: data.category || 'uncategorized',
        model: data.model || undefined,
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
      };
    });

    console.log(`Loaded ${products.length} restored products`);
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

// Delete restored product
export const deleteRestoredProduct = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'products', id));
    toast.success('Restored product deleted permanently');
    return true;
  } catch (error: any) {
    console.error('Error deleting:', error);
    if (error.code === 'permission-denied') {
      toast.error('Permission denied');
    } else {
      toast.error('Failed to delete restored product');
    }
    return false;
  }
};

// Sell restored product with transaction logging
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

    const restoredData = restoredSnap.data() as any;

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
      toast.error('Selling price must be > 0');
      return false;
    }

    const now = new Date().toISOString();
    const remainingQty = restoredData.quantity - sellQty;

    const totalAmount = sellQty * sellingPrice;
    const costTotal = sellQty * restoredData.costPrice;
    const profit = totalAmount > costTotal ? totalAmount - costTotal : 0;
    const loss = totalAmount < costTotal ? costTotal - totalAmount : 0;

    // Create new sold record - keep the original restoreComment
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
      restoredDate: restoredData.restoredDate || null,
    });

    // Update or delete original restored product
    if (remainingQty === 0) {
      await deleteDoc(restoredDocRef);
      toast.success(`Fully re-sold (${sellQty} unit(s)). Removed from restored stock.`);
    } else {
      await updateDoc(restoredDocRef, {
        quantity: remainingQty,
        updatedAt: now,
      });
      toast.success(`Re-sold ${sellQty} unit(s). Remaining in restored: ${remainingQty}`);
    }

    // Log resold restored product transaction
    await logTx('resold_restored_product', {
      productId: id,
      productName: restoredData.productName,
      category: restoredData.category,
      quantity: sellQty,
      costPrice: restoredData.costPrice,
      sellingPrice,
      pricePerUnit: sellingPrice,
      totalAmount,
      profit,
      loss,
      actionDetails: `Re-sold ${sellQty} restored unit(s) of ${restoredData.productName} at ${sellingPrice.toLocaleString()} RWF. Total: ${totalAmount.toLocaleString()} RWF${profit > 0 ? `. Profit: +${profit.toLocaleString()} RWF` : ''}${loss > 0 ? `. Loss: -${loss.toLocaleString()} RWF` : ''}`,
      metadata: { restoreComment: restoredData.restoreComment },
    });

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
