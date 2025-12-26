// src/functions/store.ts

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  increment,
  getDoc,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';
import { logTransaction, TransactionLog } from '@/lib/transactionLogger';

export interface Product {
  id?: string;
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  sellingPrice?: number | null;
  status: 'store' | 'sold' | 'restored' | 'deleted';
  restoreComment?: string;
  addedDate: string;
  deletedDate?: string;
  soldDate?: string;
  quantity: number;
  branch: string;
  deadline?: string;
  confirm: boolean;
  businessId: string;
  updatedAt?: string;
  productNameLower?: string;
  categoryLower?: string;
  modelLower?: string;
}

// Transaction logging context (set by the calling page)
let txContext: {
  userId: string;
  userName: string;
  userRole: string;
  businessId: string;
  businessName: string;
  branchId?: string;
  branchName?: string;
} | null = null;

export const setTransactionContext = (ctx: typeof txContext) => {
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

// Local queue key for pending operations
const OFFLINE_QUEUE_KEY = 'offline_product_operations';

// Helper to get/set offline queue
const getOfflineQueue = (): any[] => {
  const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveOfflineQueue = (queue: any[]) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const clearOfflineQueue = () => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

// Process queued operations when back online
export const syncOfflineOperations = async (): Promise<void> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const batch = writeBatch(db);

  try {
    for (const op of queue) {
      if (op.type === 'addOrUpdate') {
        const productsRef = collection(db, 'products');
        const normalizedName = op.data.productName.trim().toLowerCase();
        const normalizedCategory = op.data.category.trim().toLowerCase();
        const normalizedModel = (op.data.model || '').trim().toLowerCase();

        let q = query(
          productsRef,
          where('businessId', '==', op.data.businessId),
          where('branch', '==', op.data.branch),
          where('productNameLower', '==', normalizedName),
          where('categoryLower', '==', normalizedCategory),
          where('costPrice', '==', op.data.costPrice),
          where('status', '==', 'store')
        );

        if (normalizedModel) {
          q = query(q, where('modelLower', '==', normalizedModel));
        }

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const existing = snapshot.docs[0];
          batch.update(existing.ref, {
            quantity: increment(op.data.quantity),
            updatedAt: new Date().toISOString(),
          });
        } else {
          const newRef = doc(productsRef);
          const newProduct = {
            ...op.data,
            id: newRef.id,
            productNameLower: normalizedName,
            categoryLower: normalizedCategory,
            modelLower: normalizedModel || null,
            addedDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sellingPrice: null,
            status: 'store',
          };
          batch.set(newRef, newProduct);
        }
      } else if (op.type === 'sell') {
        const originalRef = doc(db, 'products', op.productId);
        batch.update(originalRef, {
          quantity: increment(-op.quantity),
          updatedAt: new Date().toISOString(),
        });

        const soldRef = doc(collection(db, 'products'));
        const soldData = {
          ...op.originalProduct,
          status: 'sold',
          sellingPrice: op.sellingPrice,
          soldDate: new Date().toISOString(),
          quantity: op.quantity,
          deadline: op.deadline || null,
          updatedAt: new Date().toISOString(),
        };
        batch.set(soldRef, soldData);
      } else if (op.type === 'update') {
        const ref = doc(db, 'products', op.id);
        batch.update(ref, { ...op.updates, updatedAt: new Date().toISOString() });
      } else if (op.type === 'delete') {
        const ref = doc(db, 'products', op.id);
        batch.update(ref, {
          status: 'deleted',
          deletedDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await batch.commit();
    clearOfflineQueue();
    toast.success('Offline changes synced successfully!');
  } catch (error) {
    console.error('Failed to sync offline operations:', error);
    toast.error('Sync failed. Changes still queued.');
  }
};

// Get products – strict branch access control
export const getProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');

    // Base query: only in-store products for this business
    let q = query(
      productsRef,
      where('businessId', '==', businessId),
      where('status', '==', 'store')
    );

    if (userRole === 'admin') {
      // Admin sees all products across all branches → no additional filter
    } else if (userRole === 'staff') {
      // Staff with no branch assigned → no access to any data
      if (!branchId) {
        return []; // Explicitly return empty array
      }

      // Staff with branch → filter only their branch
      q = query(q, where('branch', '==', branchId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Product));
  } catch (error) {
    console.error('Error loading products:', error);
    toast.error('Failed to load products');
    return [];
  }
};

// Add or update product with transaction logging
export const addOrUpdateProduct = async (
  data: {
    productName: string;
    category: string;
    model?: string;
    costPrice: number;
    quantity: number;
    branch: string;
    businessId: string;
    confirm: boolean;
  }
): Promise<Product | null> => {
  if (!data.branch) {
    toast.error('No branch assigned');
    return null;
  }

  const isOnline = navigator.onLine;

  if (!isOnline) {
    const queue = getOfflineQueue();
    queue.push({
      type: 'addOrUpdate',
      data,
      timestamp: Date.now(),
    });
    saveOfflineQueue(queue);
    toast.success('Saved locally (offline) – will sync when online');
    return {
      id: `local-${Date.now()}`,
      ...data,
      productNameLower: data.productName.toLowerCase(),
      categoryLower: data.category.toLowerCase(),
      modelLower: (data.model || '').toLowerCase(),
      addedDate: new Date().toISOString(),
      status: 'store' as const,
      sellingPrice: null,
      confirm: data.confirm,
    };
  }

  try {
    const productsRef = collection(db, 'products');
    const normalizedName = data.productName.trim().toLowerCase();
    const normalizedCategory = data.category.trim().toLowerCase();
    const normalizedModel = (data.model || '').trim().toLowerCase();

    let q = query(
      productsRef,
      where('businessId', '==', data.businessId),
      where('branch', '==', data.branch),
      where('productNameLower', '==', normalizedName),
      where('categoryLower', '==', normalizedCategory),
      where('costPrice', '==', data.costPrice),
      where('status', '==', 'store')
    );

    if (normalizedModel) {
      q = query(q, where('modelLower', '==', normalizedModel));
    }

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      await updateDoc(existingDoc.ref, {
        quantity: increment(data.quantity),
        updatedAt: new Date().toISOString(),
      });

      // Log stock update transaction
      await logTx('stock_updated', {
        productId: existingDoc.id,
        productName: data.productName,
        category: data.category,
        quantity: data.quantity,
        costPrice: data.costPrice,
        actionDetails: `Added ${data.quantity} units to ${data.productName}`,
      });

      toast.success(`Added ${data.quantity} units`);
      const updatedData = existingDoc.data();
      return {
        id: existingDoc.id,
        ...updatedData,
        quantity: (updatedData.quantity || 0) + data.quantity,
      } as Product;
    } else {
      const newRef = doc(productsRef);
      const newProduct: Product = {
        id: newRef.id,
        productName: data.productName.trim(),
        productNameLower: normalizedName,
        category: data.category.trim(),
        categoryLower: normalizedCategory,
        model: data.model?.trim() || null,
        modelLower: normalizedModel || null,
        costPrice: data.costPrice,
        sellingPrice: null,
        status: 'store',
        addedDate: new Date().toISOString(),
        quantity: data.quantity,
        branch: data.branch,
        businessId: data.businessId,
        confirm: data.confirm,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(newRef, newProduct);

      // Log product added transaction
      await logTx('product_added', {
        productId: newRef.id,
        productName: data.productName,
        category: data.category,
        model: data.model,
        quantity: data.quantity,
        costPrice: data.costPrice,
        pricePerUnit: data.costPrice,
        totalAmount: data.costPrice * data.quantity,
        actionDetails: `Added new product: ${data.productName} (Qty: ${data.quantity}, Price: ${data.costPrice.toLocaleString()} RWF)`,
      });

      toast.success('New product added');
      return newProduct;
    }
  } catch (error) {
    console.error('Error adding product:', error);
    toast.error('Failed to add product');
    return null;
  }
};

// Sell product with transaction logging
export const sellProduct = async (
  id: string,
  quantity: number,
  sellingPrice: number,
  deadline?: string,
  userBranch?: string | null
): Promise<boolean> => {
  const isOnline = navigator.onLine;

  if (!isOnline) {
    const productDoc = await getDoc(doc(db, 'products', id));
    if (!productDoc.exists()) {
      toast.error('Product not found');
      return false;
    }
    const product = productDoc.data() as Product;

    // Even offline: block sale if not confirmed
    if (!product.confirm) {
      toast.error('This product is not confirmed. Please wait for admin confirmation.');
      return false;
    }

    if (quantity > product.quantity) {
      toast.error('Not enough stock');
      return false;
    }

    const queue = getOfflineQueue();
    queue.push({
      type: 'sell',
      productId: id,
      quantity,
      sellingPrice,
      deadline: deadline || null,
      originalProduct: product,
      timestamp: Date.now(),
    });
    saveOfflineQueue(queue);

    toast.success(`Sale recorded locally – will sync when online`);
    return true;
  }

  // Online: full validation
  try {
    const originalDoc = doc(db, 'products', id);
    const originalSnap = await getDoc(originalDoc);

    if (!originalSnap.exists()) {
      toast.error('Product not found');
      return false;
    }

    const original = originalSnap.data() as Product;

    // Block sale if not confirmed
    if (!original.confirm) {
      toast.error('This product is not confirmed. Please wait for admin confirmation.');
      return false;
    }

    if (userBranch && original.branch !== userBranch) {
      toast.error('You can only sell products from your assigned branch');
      return false;
    }

    if (quantity > original.quantity) {
      toast.error('Not enough stock');
      return false;
    }

    if (sellingPrice <= 0) {
      toast.error('Selling price must be greater than 0');
      return false;
    }

    const totalAmount = quantity * sellingPrice;
    const costTotal = quantity * original.costPrice;
    const profit = totalAmount > costTotal ? totalAmount - costTotal : 0;
    const loss = totalAmount < costTotal ? costTotal - totalAmount : 0;

    await runTransaction(db, async (transaction) => {
      transaction.update(originalDoc, {
        quantity: original.quantity - quantity,
        updatedAt: new Date().toISOString(),
      });

      const soldRef = doc(collection(db, 'products'));
      transaction.set(soldRef, {
        ...original,
        id: soldRef.id,
        status: 'sold',
        sellingPrice,
        soldDate: new Date().toISOString(),
        quantity,
        deadline: deadline || null,
        updatedAt: new Date().toISOString(),
      });
    });

    // Log sale transaction
    await logTx('product_sold', {
      productId: id,
      productName: original.productName,
      category: original.category,
      model: original.model,
      quantity,
      costPrice: original.costPrice,
      sellingPrice,
      pricePerUnit: sellingPrice,
      totalAmount,
      profit,
      loss,
      actionDetails: `Sold ${quantity} unit(s) of ${original.productName} at ${sellingPrice.toLocaleString()} RWF each. Total: ${totalAmount.toLocaleString()} RWF${profit > 0 ? `. Profit: +${profit.toLocaleString()} RWF` : ''}${loss > 0 ? `. Loss: -${loss.toLocaleString()} RWF` : ''}`,
    });

    toast.success(`Sold ${quantity} unit(s)`);
    return true;
  } catch (error) {
    console.error('Sale failed:', error);
    toast.error('Sale failed. Please try again.');
    return false;
  }
};

// Update product with transaction logging
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'products', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    // Log update transaction
    if (navigator.onLine) {
      const changes = Object.keys(updates).filter(k => k !== 'updatedAt').join(', ');
      await logTx('product_updated', {
        productId: id,
        productName: updates.productName,
        actionDetails: `Updated product: ${changes}`,
        metadata: updates,
      });
    }

    toast.success('Product updated');
    return true;
  } catch (error) {
    toast.error('Update failed');
    return false;
  }
};

// Delete product (mark as deleted) with transaction logging
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const productDoc = await getDoc(doc(db, 'products', id));
    const productData = productDoc.exists() ? productDoc.data() as Product : null;

    await updateDoc(doc(db, 'products', id), {
      status: 'deleted',
      deletedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Log delete transaction
    if (navigator.onLine && productData) {
      await logTx('product_deleted', {
        productId: id,
        productName: productData.productName,
        category: productData.category,
        quantity: productData.quantity,
        costPrice: productData.costPrice,
        actionDetails: `Deleted product: ${productData.productName} (Qty: ${productData.quantity})`,
      });
    }

    toast.success('Product deleted');
    return true;
  } catch (error) {
    toast.error('Delete failed');
    return false;
  }
};

export { toast } from 'sonner';
