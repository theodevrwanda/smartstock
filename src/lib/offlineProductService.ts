// src/lib/offlineProductService.ts
// Complete offline-first product service

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import {
  getLocalProducts,
  saveProductLocally,
  getLocalProduct,
  cacheProducts,
  addPendingOperation,
  OfflineProduct,
  getLocalProductsByStatus,
} from '@/lib/offlineDB';
import { toast } from 'sonner';

// ============ STORE PRODUCTS ============

// Get store products (offline-first)
export async function getStoreProducts(
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<OfflineProduct[]> {
  const isOnline = navigator.onLine;

  // Always try to get from local first for speed
  const localProducts = await getLocalProducts(businessId, 'store', userRole === 'staff' ? branchId : null);

  if (isOnline) {
    try {
      // Fetch fresh data from cloud
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'store'));

      if (userRole === 'staff' && branchId) {
        q = query(q, where('branch', '==', branchId));
      }

      const snapshot = await getDocs(q);
      const cloudProducts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OfflineProduct[];

      // Cache cloud data locally
      await cacheProducts(cloudProducts);
      
      return cloudProducts;
    } catch (error) {
      console.error('Error fetching from cloud, using local:', error);
      return localProducts;
    }
  }

  return localProducts;
}

// Add or update product (offline-first)
export async function addOrUpdateStoreProduct(data: {
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  quantity: number;
  branch: string;
  businessId: string;
  confirm: boolean;
}): Promise<OfflineProduct | null> {
  if (!data.branch) {
    toast.error('No branch assigned');
    return null;
  }

  const isOnline = navigator.onLine;
  const now = new Date().toISOString();
  const normalizedName = data.productName.trim().toLowerCase();
  const normalizedCategory = data.category.trim().toLowerCase();
  const normalizedModel = (data.model || '').trim().toLowerCase();

  // Create local product
  const localProduct: OfflineProduct = {
    id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productName: data.productName.trim(),
    productNameLower: normalizedName,
    category: data.category.trim(),
    categoryLower: normalizedCategory,
    model: data.model?.trim() || null,
    modelLower: normalizedModel || null,
    costPrice: data.costPrice,
    sellingPrice: null,
    status: 'store',
    addedDate: now,
    quantity: data.quantity,
    branch: data.branch,
    businessId: data.businessId,
    confirm: data.confirm,
    updatedAt: now,
    _localOnly: !isOnline,
    _pendingSync: !isOnline,
  };

  if (!isOnline) {
    // Save locally and queue for sync
    await saveProductLocally(localProduct);
    await addPendingOperation({
      type: 'addProduct',
      data: {
        ...data,
        addedDate: now,
      },
    });
    toast.info('📴 Product added locally. Will sync when online.');
    return localProduct;
  }

  // Online: normal flow
  try {
    const productsRef = collection(db, 'products');
    
    // Check for existing product
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
      // Update existing product quantity
      const existingDoc = snapshot.docs[0];
      await updateDoc(existingDoc.ref, {
        quantity: increment(data.quantity),
        updatedAt: now,
      });

      const updatedProduct = {
        id: existingDoc.id,
        ...existingDoc.data(),
        quantity: (existingDoc.data().quantity || 0) + data.quantity,
      } as OfflineProduct;

      await saveProductLocally(updatedProduct, false);
      toast.success(`Added ${data.quantity} units to existing product`);
      return updatedProduct;
    } else {
      // Create new product
      const newRef = doc(productsRef);
      const newProduct: OfflineProduct = {
        ...localProduct,
        id: newRef.id,
        _localOnly: false,
        _pendingSync: false,
      };

      await setDoc(newRef, newProduct);
      await saveProductLocally(newProduct, false);
      toast.success('New product added');
      return newProduct;
    }
  } catch (error) {
    console.error('Error adding product:', error);
    // Fallback to local
    await saveProductLocally(localProduct);
    await addPendingOperation({
      type: 'addProduct',
      data: {
        ...data,
        addedDate: now,
      },
    });
    toast.warning('Saved locally due to connection issue');
    return localProduct;
  }
}

// Update product (offline-first)
export async function updateStoreProduct(id: string, updates: Partial<OfflineProduct>): Promise<boolean> {
  const isOnline = navigator.onLine;
  const now = new Date().toISOString();

  // Get current product
  let product = await getLocalProduct(id);
  if (!product) {
    toast.error('Product not found');
    return false;
  }

  const updatedProduct = {
    ...product,
    ...updates,
    updatedAt: now,
    _pendingSync: !isOnline,
  };

  // Save locally
  await saveProductLocally(updatedProduct);

  if (!isOnline) {
    await addPendingOperation({
      type: 'updateProduct',
      data: { id, updates },
    });
    toast.info('📴 Product updated locally. Will sync when online.');
    return true;
  }

  // Online: update cloud
  try {
    // Skip if local-only product
    if (id.startsWith('local-')) {
      return true;
    }
    
    await updateDoc(doc(db, 'products', id), {
      ...updates,
      updatedAt: now,
    });
    toast.success('Product updated');
    return true;
  } catch (error) {
    console.error('Update failed:', error);
    await addPendingOperation({
      type: 'updateProduct',
      data: { id, updates },
    });
    toast.warning('Saved locally, will sync later');
    return true;
  }
}

// Delete product (mark as deleted, offline-first)
export async function deleteStoreProduct(id: string): Promise<boolean> {
  const isOnline = navigator.onLine;
  const now = new Date().toISOString();

  // Get current product
  let product = await getLocalProduct(id);
  if (!product) {
    toast.error('Product not found');
    return false;
  }

  const deletedProduct = {
    ...product,
    status: 'deleted' as const,
    deletedDate: now,
    updatedAt: now,
    _pendingSync: !isOnline,
  };

  // Save locally with deleted status
  await saveProductLocally(deletedProduct);

  if (!isOnline) {
    await addPendingOperation({
      type: 'deleteProduct',
      data: { id },
    });
    toast.info('📴 Product marked as deleted locally. Will sync when online.');
    return true;
  }

  // Online: update cloud
  try {
    if (!id.startsWith('local-')) {
      await updateDoc(doc(db, 'products', id), {
        status: 'deleted',
        deletedDate: now,
        updatedAt: now,
      });
    }
    toast.success('Product moved to trash');
    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    await addPendingOperation({
      type: 'deleteProduct',
      data: { id },
    });
    toast.warning('Marked deleted locally, will sync later');
    return true;
  }
}

// Sell product (offline-first)
export async function sellStoreProduct(
  id: string,
  quantity: number,
  sellingPrice: number,
  deadline?: string,
  userBranch?: string | null
): Promise<boolean> {
  const isOnline = navigator.onLine;
  const now = new Date().toISOString();

  // Get current product
  let product = await getLocalProduct(id);
  if (!product) {
    toast.error('Product not found');
    return false;
  }

  // Validate branch
  if (userBranch && product.branch !== userBranch) {
    toast.error('Cannot sell - product not from your assigned branch');
    return false;
  }

  // Validate quantity
  if (quantity > product.quantity || quantity <= 0) {
    toast.error('Invalid quantity');
    return false;
  }

  if (sellingPrice <= 0) {
    toast.error('Selling price must be greater than 0');
    return false;
  }

  // Update local product quantity
  const updatedProduct = {
    ...product,
    quantity: product.quantity - quantity,
    updatedAt: now,
    _pendingSync: !isOnline,
  };
  await saveProductLocally(updatedProduct);

  // Create local sold record
  const soldProduct: OfflineProduct = {
    ...product,
    id: `sold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'sold',
    sellingPrice,
    soldDate: now,
    quantity,
    deadline: deadline || null,
    updatedAt: now,
    _localOnly: !isOnline,
    _pendingSync: !isOnline,
  };
  await saveProductLocally(soldProduct);

  if (!isOnline) {
    await addPendingOperation({
      type: 'sellProduct',
      data: {
        productId: id,
        quantity,
        sellingPrice,
        deadline,
        originalProduct: product,
      },
    });
    toast.info(`📴 Sold ${quantity} unit(s) locally. Will sync when online.`);
    return true;
  }

  // Online: execute transaction
  try {
    if (!id.startsWith('local-')) {
      await runTransaction(db, async (transaction) => {
        const originalRef = doc(db, 'products', id);
        const originalSnap = await transaction.get(originalRef);

        if (!originalSnap.exists()) {
          throw new Error('Product not found');
        }

        const original = originalSnap.data();

        transaction.update(originalRef, {
          quantity: original.quantity - quantity,
          updatedAt: now,
        });

        const soldRef = doc(collection(db, 'products'));
        transaction.set(soldRef, {
          ...original,
          id: soldRef.id,
          status: 'sold',
          sellingPrice,
          soldDate: now,
          quantity,
          deadline: deadline || null,
          updatedAt: now,
        });
      });
    }

    toast.success(`Sold ${quantity} unit(s)`);
    return true;
  } catch (error) {
    console.error('Sale failed:', error);
    await addPendingOperation({
      type: 'sellProduct',
      data: {
        productId: id,
        quantity,
        sellingPrice,
        deadline,
        originalProduct: product,
      },
    });
    toast.warning('Sale recorded locally, will sync later');
    return true;
  }
}

// ============ SOLD PRODUCTS ============

export async function getSoldProducts(
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<OfflineProduct[]> {
  const isOnline = navigator.onLine;
  const localProducts = await getLocalProducts(businessId, 'sold', userRole === 'staff' ? branchId : null);

  if (isOnline) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'sold'));

      if (userRole === 'staff' && branchId) {
        q = query(q, where('branch', '==', branchId));
      }

      const snapshot = await getDocs(q);
      const cloudProducts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OfflineProduct[];

      await cacheProducts(cloudProducts);
      return cloudProducts;
    } catch (error) {
      console.error('Error fetching sold products:', error);
      return localProducts;
    }
  }

  return localProducts;
}

// Restore sold product (offline-first)
export async function restoreSoldProduct(
  id: string,
  restoreQty: number,
  comment: string,
  userBranch?: string | null,
  isAdmin: boolean = false
): Promise<boolean> {
  const isOnline = navigator.onLine;
  const now = new Date().toISOString();

  let product = await getLocalProduct(id);
  if (!product) {
    toast.error('Sold product not found');
    return false;
  }

  // Validate branch
  if (userBranch && product.branch !== userBranch && !isAdmin) {
    toast.error('Cannot restore - branch mismatch');
    return false;
  }

  // Check deadline
  if (product.deadline) {
    const deadlineDate = new Date(product.deadline);
    if (deadlineDate < new Date()) {
      toast.error('Return deadline has expired');
      return false;
    }
  }

  // Validate quantity
  if (restoreQty > product.quantity || restoreQty <= 0) {
    toast.error('Invalid restore quantity');
    return false;
  }

  const remainingQty = product.quantity - restoreQty;

  // Update sold product locally
  if (remainingQty <= 0) {
    // Mark as fully restored (change status or handle differently)
    const updatedSold = {
      ...product,
      quantity: 0,
      status: 'restored' as const,
      updatedAt: now,
      _pendingSync: !isOnline,
    };
    await saveProductLocally(updatedSold);
  } else {
    const updatedSold = {
      ...product,
      quantity: remainingQty,
      updatedAt: now,
      _pendingSync: !isOnline,
    };
    await saveProductLocally(updatedSold);
  }

  // Create restored product locally
  const restoredProduct: OfflineProduct = {
    ...product,
    id: `restored-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'restored',
    restoreComment: comment,
    quantity: restoreQty,
    restoredDate: now,
    updatedAt: now,
    _localOnly: !isOnline,
    _pendingSync: !isOnline,
  };
  await saveProductLocally(restoredProduct);

  if (!isOnline) {
    await addPendingOperation({
      type: 'restoreProduct',
      data: {
        soldId: id,
        restoreQty,
        comment,
        soldProduct: product,
      },
    });
    toast.info(`📴 Restored ${restoreQty} unit(s) locally. Will sync when online.`);
    return true;
  }

  // Online: execute transaction
  try {
    if (!id.startsWith('local-') && !id.startsWith('sold-')) {
      await runTransaction(db, async (transaction) => {
        const soldRef = doc(db, 'products', id);
        const soldSnap = await transaction.get(soldRef);

        if (!soldSnap.exists()) {
          throw new Error('Sold product not found');
        }

        const sold = soldSnap.data();

        if (remainingQty <= 0) {
          transaction.delete(soldRef);
        } else {
          transaction.update(soldRef, {
            quantity: remainingQty,
            updatedAt: now,
          });
        }

        const restoredRef = doc(collection(db, 'products'));
        transaction.set(restoredRef, {
          ...sold,
          id: restoredRef.id,
          status: 'restored',
          restoreComment: comment,
          quantity: restoreQty,
          restoredDate: now,
          updatedAt: now,
        });
      });
    }

    toast.success(`Restored ${restoreQty} unit(s)`);
    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    await addPendingOperation({
      type: 'restoreProduct',
      data: {
        soldId: id,
        restoreQty,
        comment,
        soldProduct: product,
      },
    });
    toast.warning('Restored locally, will sync later');
    return true;
  }
}

// ============ RESTORED PRODUCTS ============

export async function getRestoredProducts(
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<OfflineProduct[]> {
  const isOnline = navigator.onLine;
  const localProducts = await getLocalProducts(businessId, 'restored', userRole === 'staff' ? branchId : null);

  if (isOnline) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'restored'));

      if (userRole === 'staff' && branchId) {
        q = query(q, where('branch', '==', branchId));
      }

      const snapshot = await getDocs(q);
      const cloudProducts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OfflineProduct[];

      await cacheProducts(cloudProducts);
      return cloudProducts;
    } catch (error) {
      console.error('Error fetching restored products:', error);
      return localProducts;
    }
  }

  return localProducts;
}

// Sell restored product (offline-first) - FIXED
export async function sellRestoredProduct(
  id: string,
  sellQty: number,
  sellingPrice: number,
  deadline?: string,
  userBranch?: string | null
): Promise<boolean> {
  const isOnline = navigator.onLine;
  const now = new Date().toISOString();

  // Get the restored product
  let product = await getLocalProduct(id);
  if (!product) {
    toast.error('Restored product not found');
    return false;
  }

  // Validate it's actually a restored product
  if (product.status !== 'restored') {
    toast.error('Product is not in restored status');
    return false;
  }

  // Validate branch
  if (userBranch && product.branch !== userBranch) {
    toast.error('Cannot sell - product not from your assigned branch');
    return false;
  }

  // Validate quantity
  if (sellQty > product.quantity || sellQty <= 0) {
    toast.error('Invalid quantity');
    return false;
  }

  if (sellingPrice <= 0) {
    toast.error('Selling price must be greater than 0');
    return false;
  }

  const remainingQty = product.quantity - sellQty;

  // Update or remove restored product locally
  if (remainingQty <= 0) {
    // Remove from local (will be deleted in cloud too)
    const deletedRestored = {
      ...product,
      quantity: 0,
      updatedAt: now,
      _pendingSync: !isOnline,
    };
    await saveProductLocally(deletedRestored);
  } else {
    const updatedRestored = {
      ...product,
      quantity: remainingQty,
      updatedAt: now,
      _pendingSync: !isOnline,
    };
    await saveProductLocally(updatedRestored);
  }

  // Create sold record from restored product
  const soldProduct: OfflineProduct = {
    ...product,
    id: `sold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'sold',
    sellingPrice,
    soldDate: now,
    quantity: sellQty,
    deadline: deadline || null,
    updatedAt: now,
    // Keep restore comment for tracking
    restoreComment: product.restoreComment,
    _localOnly: !isOnline,
    _pendingSync: !isOnline,
  };
  await saveProductLocally(soldProduct);

  if (!isOnline) {
    await addPendingOperation({
      type: 'sellRestoredProduct',
      data: {
        restoredId: id,
        sellQty,
        sellingPrice,
        deadline,
        restoredProduct: product,
      },
    });
    toast.info(`📴 Sold ${sellQty} unit(s) from restored stock locally. Will sync when online.`);
    return true;
  }

  // Online: execute transaction
  try {
    if (!id.startsWith('local-') && !id.startsWith('restored-')) {
      await runTransaction(db, async (transaction) => {
        const restoredRef = doc(db, 'products', id);
        const restoredSnap = await transaction.get(restoredRef);

        if (!restoredSnap.exists()) {
          throw new Error('Restored product not found');
        }

        const restored = restoredSnap.data();

        if (restored.status !== 'restored') {
          throw new Error('Product is not in restored status');
        }

        if (remainingQty <= 0) {
          transaction.delete(restoredRef);
        } else {
          transaction.update(restoredRef, {
            quantity: remainingQty,
            updatedAt: now,
          });
        }

        const soldRef = doc(collection(db, 'products'));
        transaction.set(soldRef, {
          ...restored,
          id: soldRef.id,
          status: 'sold',
          sellingPrice,
          soldDate: now,
          quantity: sellQty,
          deadline: deadline || null,
          updatedAt: now,
        });
      });
    }

    toast.success(`Sold ${sellQty} unit(s) from restored stock`);
    return true;
  } catch (error) {
    console.error('Sale failed:', error);
    await addPendingOperation({
      type: 'sellRestoredProduct',
      data: {
        restoredId: id,
        sellQty,
        sellingPrice,
        deadline,
        restoredProduct: product,
      },
    });
    toast.warning('Sale recorded locally, will sync later');
    return true;
  }
}

// ============ DELETED PRODUCTS ============

export async function getDeletedProducts(
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<OfflineProduct[]> {
  const isOnline = navigator.onLine;
  const localProducts = await getLocalProducts(businessId, 'deleted', userRole === 'staff' ? branchId : null);

  if (isOnline) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'deleted'));

      if (userRole === 'staff' && branchId) {
        q = query(q, where('branch', '==', branchId));
      }

      const snapshot = await getDocs(q);
      const cloudProducts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OfflineProduct[];

      await cacheProducts(cloudProducts);
      return cloudProducts;
    } catch (error) {
      console.error('Error fetching deleted products:', error);
      return localProducts;
    }
  }

  return localProducts;
}

// ============ REPORT DATA ============

export async function getReportProducts(
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<OfflineProduct[]> {
  const isOnline = navigator.onLine;
  const statuses: OfflineProduct['status'][] = ['store', 'sold', 'restored', 'deleted'];
  const localProducts = await getLocalProductsByStatus(businessId, statuses, userRole === 'staff' ? branchId : null);

  if (isOnline) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('businessId', '==', businessId));

      if (userRole === 'staff' && branchId) {
        q = query(q, where('branch', '==', branchId));
      }

      const snapshot = await getDocs(q);
      const cloudProducts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OfflineProduct[];

      await cacheProducts(cloudProducts);
      return cloudProducts;
    } catch (error) {
      console.error('Error fetching report products:', error);
      return localProducts;
    }
  }

  return localProducts;
}
