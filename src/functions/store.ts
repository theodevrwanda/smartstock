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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';
import { logTransaction } from '@/lib/transactionLogger';

import { Product } from '@/types/interface';

let txContext: {
  userId: string;
  userName: string;
  userRole: 'admin' | 'staff';
  businessId: string;
  businessName: string;
  branchId?: string;
  branchName?: string;
} | null = null;

export const setTransactionContext = (ctx: typeof txContext) => {
  txContext = ctx;
};

const OFFLINE_QUEUE_KEY = 'offline_product_operations';

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
          where('status', '==', 'store')
        );

        if (normalizedModel) {
          q = query(q, where('modelLower', '==', normalizedModel));
        }

        const snapshot = await getDocs(q);

        // If it's a cost-only update, we don't merge even if match exists
        if (!snapshot.empty && !op.data.isCostUpdateOnly && op.data.quantity > 0) {
          const existing = snapshot.docs[0];
          batch.update(existing.ref, {
            quantity: increment(op.data.quantity),
            updatedAt: new Date().toISOString(),
          });
        } else {
          const newRef = doc(productsRef);
          const costPricePerUnit =
            op.data.costType === 'bulkCost'
              ? op.data.quantity > 0
                ? op.data.costPrice / op.data.quantity
                : 0
              : op.data.costPrice;

          const newProduct: Product = {
            id: newRef.id,
            productName: op.data.productName.trim(),
            productNameLower: normalizedName,
            category: op.data.category.trim(),
            categoryLower: normalizedCategory,
            model: op.data.model?.trim() || '',
            modelLower: normalizedModel || '',
            costPrice: op.data.costPrice,
            costPricePerUnit: costPricePerUnit,
            costType: op.data.costType,
            unit: op.data.unit || 'pcs',
            sellingPrice: null,
            restoreComment: null,
            status: 'store',
            addedDate: new Date().toISOString(),
            quantity: op.data.quantity,
            branch: op.data.branch,
            businessId: op.data.businessId,
            confirm: op.data.confirm,
            deadline: op.data.deadline,
            expiryDate: op.data.expiryDate || null,
            updatedAt: new Date().toISOString(),
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
          unit: op.originalProduct?.unit || null,
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

export const subscribeToProducts = (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId: string | null,
  currCategory: string | null = null,
  onUpdate: (products: Product[]) => void
): () => void => {
  const productsRef = collection(db, 'products');

  let q = query(
    productsRef,
    where('businessId', '==', businessId),
    where('status', '==', 'store')
  );

  if (userRole === 'staff') {
    if (branchId) {
      q = query(q, where('branch', '==', branchId));
    }
  } else if (userRole === 'admin' && branchId && branchId !== 'All') {
    q = query(q, where('branch', '==', branchId));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Product));
    onUpdate(products);
  }, (error) => {
    console.error("Real-time products error:", error);
    toast.error("Connection lost - reconnecting...");
  });

  return unsubscribe;
};

export const getProducts = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId: string | null
): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');

    let q = query(
      productsRef,
      where('businessId', '==', businessId),
      where('status', '==', 'store')
    );

    if (userRole === 'staff') {
      if (!branchId) {
        toast.error('No branch assigned to user');
        return [];
      }
      q = query(q, where('branch', '==', branchId));
    }
    else if (userRole === 'admin' && branchId && branchId !== 'All') {
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
    unit?: string;
    deadline?: string;
    expiryDate?: string;
    costType: 'costPerUnit' | 'bulkCost';
    costPricePerUnit: number;
    isCostUpdateOnly?: boolean;
  }
): Promise<Product | null> => {
  if (!data.branch) {
    toast.error('No branch assigned');
    return null;
  }

  const isOnline = navigator.onLine;

  if (!isOnline) {
    const queue = getOfflineQueue();
    queue.push({ type: 'addOrUpdate', data, timestamp: Date.now() });
    saveOfflineQueue(queue);
    toast.success('Saved locally (offline) – will sync when online');
    return {
      id: `local-${Date.now()}`,
      productName: data.productName,
      category: data.category,
      model: data.model || '',
      costPrice: data.costPrice,
      costPricePerUnit: data.costPricePerUnit,
      costType: data.costType,
      sellingPrice: null,
      status: 'store',
      addedDate: new Date().toISOString(),
      quantity: Number(data.quantity),
      branch: data.branch,
      confirm: data.confirm,
      businessId: data.businessId,
      unit: data.unit || 'pcs',
      productNameLower: data.productName.toLowerCase(),
      categoryLower: data.category.toLowerCase(),
      modelLower: (data.model || '').toLowerCase(),
      expiryDate: data.expiryDate || null,
    } as Product;
  }

  try {
    const productsRef = collection(db, 'products');
    const normalizedName = data.productName.trim().toLowerCase();
    const normalizedCategory = data.category.trim().toLowerCase();
    const normalizedModel = (data.model || '').trim().toLowerCase();

    // Special case: only updating cost price (quantity unchanged = 0)
    if (data.isCostUpdateOnly && data.quantity === 0) {
      let q = query(
        productsRef,
        where('businessId', '==', data.businessId),
        where('branch', '==', data.branch),
        where('productNameLower', '==', normalizedName),
        where('categoryLower', '==', normalizedCategory),
        where('status', '==', 'store')
      );
      if (normalizedModel) {
        q = query(q, where('modelLower', '==', normalizedModel));
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast.error('Product not found for cost update');
        return null;
      }

      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data() as Product;

      const newUnitCost =
        data.costType === 'bulkCost'
          ? existingData.quantity > 0
            ? data.costPrice / existingData.quantity
            : 0
          : data.costPrice;

      await updateDoc(existingDoc.ref, {
        costPrice: data.costPrice,
        costPricePerUnit: newUnitCost,
        costType: data.costType,
        updatedAt: new Date().toISOString(),
      });

      if (txContext) {
        await logTransaction({
          transactionType: 'cost_updated',
          actionDetails: `Updated cost price for ${data.productName}`,
          userId: txContext.userId,
          userName: txContext.userName,
          userRole: txContext.userRole,
          businessId: data.businessId,
          businessName: txContext.businessName,
          branchId: data.branch,
          branchName: txContext.branchName,
          productId: existingDoc.id,
          productName: data.productName,
          costPrice: data.costPrice,
          costPricePerUnit: newUnitCost,
          costType: data.costType,
        });
      }

      toast.success('Cost price updated');
      const updated = (await getDoc(existingDoc.ref)).data();
      return { id: existingDoc.id, ...updated } as Product;
    }

    // Normal case: match on name, category, model (ignore cost price)
    let q = query(
      productsRef,
      where('businessId', '==', data.businessId),
      where('branch', '==', data.branch),
      where('productNameLower', '==', normalizedName),
      where('categoryLower', '==', normalizedCategory),
      where('status', '==', 'store')
    );

    if (normalizedModel) {
      q = query(q, where('modelLower', '==', normalizedModel));
    }

    const snapshot = await getDocs(q);

    if (!snapshot.empty && data.quantity > 0) {
      const existingDoc = snapshot.docs[0];
      await updateDoc(existingDoc.ref, {
        quantity: increment(data.quantity),
        updatedAt: new Date().toISOString(),
      });

      if (txContext) {
        await logTransaction({
          transactionType: 'stock_updated',
          actionDetails: `Added ${data.quantity} units to existing stock: ${data.productName}`,
          userId: txContext.userId,
          userName: txContext.userName,
          userRole: txContext.userRole,
          businessId: data.businessId,
          businessName: txContext.businessName,
          branchId: data.branch,
          branchName: txContext.branchName,
          productId: existingDoc.id,
          productName: data.productName,
          category: data.category,
          quantity: data.quantity,
          costPrice: data.costPrice,
          costPricePerUnit: data.costPricePerUnit,
        });
      }

      toast.success(`Added ${data.quantity} units`);
      const updatedData = (await getDoc(existingDoc.ref)).data();
      return { id: existingDoc.id, ...updatedData } as Product;
    }

    // No match → create new product (even if same name but different cost)
    const newRef = doc(productsRef);
    const costPricePerUnit =
      data.costType === 'bulkCost'
        ? data.quantity > 0
          ? data.costPrice / data.quantity
          : 0
        : data.costPrice;

    const newProduct: Product = {
      id: newRef.id,
      productName: data.productName.trim(),
      productNameLower: normalizedName,
      category: data.category.trim(),
      categoryLower: normalizedCategory,
      model: data.model?.trim() || '',
      modelLower: normalizedModel || '',
      costPrice: data.costPrice,
      costPricePerUnit: costPricePerUnit,
      costType: data.costType,
      unit: data.unit || 'pcs',
      sellingPrice: null,
      restoreComment: null,
      status: 'store',
      addedDate: new Date().toISOString(),
      quantity: data.quantity,
      branch: data.branch,
      businessId: data.businessId,
      confirm: data.confirm,
      deadline: data.deadline,
      expiryDate: data.expiryDate || null,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(newRef, newProduct);

    if (txContext) {
      await logTransaction({
        transactionType: 'stock_added',
        actionDetails: `Added new product (different cost): ${data.productName} (Qty: ${data.quantity})`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: data.businessId,
        businessName: txContext.businessName,
        branchId: data.branch,
        branchName: txContext.branchName,
        productId: newRef.id,
        productName: data.productName,
        category: data.category,
        quantity: data.quantity,
        costPrice: data.costPrice,
        costType: data.costType,
        costPricePerUnit: costPricePerUnit,
      });
    }

    toast.success('New product added');
    return newProduct;
  } catch (error) {
    console.error('Error adding product:', error);
    toast.error('Failed to add product');
    return null;
  }
};

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

    if (!product.confirm) {
      toast.error('This product is not confirmed.');
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

  try {
    const originalDoc = doc(db, 'products', id);

    const totalAmount = quantity * sellingPrice;

    await runTransaction(db, async (transaction) => {
      const originalSnap = await transaction.get(originalDoc);

      if (!originalSnap.exists()) {
        throw new Error('Product not found');
      }

      const original = originalSnap.data() as Product;

      if (!original.confirm) {
        throw new Error('This product is not confirmed.');
      }

      if (userBranch && original.branch !== userBranch) {
        throw new Error('You can only sell from your branch');
      }

      if (quantity > original.quantity || sellingPrice <= 0 || quantity <= 0) {
        throw new Error('Invalid quantity or price');
      }

      const effectiveUnitCost = original.costPricePerUnit ?? ((original.costType === 'bulkCost')
        ? (original.costPrice / original.quantity)
        : original.costPrice);

      const costTotal = quantity * effectiveUnitCost;

      const profit = totalAmount > costTotal ? totalAmount - costTotal : 0;
      const loss = totalAmount < costTotal ? costTotal - totalAmount : 0;

      transaction.update(originalDoc, {
        quantity: increment(-quantity),
        updatedAt: new Date().toISOString(),
      });

      const soldRef = doc(collection(db, 'products'));
      transaction.set(soldRef, {
        ...original,
        id: soldRef.id,
        status: 'sold',
        sellingPrice,
        costPrice: original.costPrice,
        costPricePerUnit: effectiveUnitCost,
        unitCost: effectiveUnitCost,
        soldDate: new Date().toISOString(),
        quantity,
        deadline: deadline || null,
        unit: original.unit || 'pcs',
        updatedAt: new Date().toISOString(),
      });

      if (txContext) {
        await logTransaction({
          transactionType: 'product_sold',
          actionDetails: `Sold ${quantity} unit(s) of ${original.productName}`,
          userId: txContext.userId,
          userName: txContext.userName,
          userRole: txContext.userRole,
          businessId: original.businessId,
          businessName: txContext.businessName,
          branchId: original.branch,
          branchName: txContext.branchName,
          productId: id,
          productName: original.productName,
          category: original.category,
          quantity,
          costPrice: original.costPrice,
          costPricePerUnit: effectiveUnitCost,
          unitCost: effectiveUnitCost,
          sellingPrice,
          profit,
          loss,
        });
      }
    });

    toast.success(`Sold ${quantity} unit(s)`);
    return true;
  } catch (error: any) {
    console.error('Sale failed:', error);
    toast.error(error.message || 'Sale failed. Please try again.');
    return false;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'products', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (txContext) {
      const changedFields = Object.keys(updates).filter(k => k !== 'updatedAt').join(', ') || 'details';
      await logTransaction({
        transactionType: 'stock_updated',
        actionDetails: `Updated product details (${changedFields})`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: txContext.businessId,
        businessName: txContext.businessName,
        productId: id,
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

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const productDoc = await getDoc(doc(db, 'products', id));
    if (!productDoc.exists()) return false;

    const productData = productDoc.data() as Product;

    await updateDoc(doc(db, 'products', id), {
      status: 'deleted',
      oldStatus: 'store',
      deletedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (txContext) {
      await logTransaction({
        transactionType: 'product_deleted',
        actionDetails: `Deleted product: ${productData.productName}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: productData.businessId,
        businessName: txContext.businessName,
        branchId: productData.branch,
        productId: id,
        productName: productData.productName,
        quantity: productData.quantity,
        costPrice: productData.costPrice,
        costPricePerUnit: productData.costPricePerUnit,
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