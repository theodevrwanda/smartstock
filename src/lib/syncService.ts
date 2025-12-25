// src/lib/syncService.ts
// Handles syncing pending operations to Firebase

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  increment,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import {
  PendingOperation,
  removeOperation,
  updateOperationStatus,
  saveProductLocally,
  OfflineProduct,
} from '@/lib/offlineDB';
import { toast } from 'sonner';

// Sync all pending operations
export async function syncAllPendingOperations(operations: PendingOperation[]): Promise<number> {
  let syncedCount = 0;

  for (const op of operations) {
    try {
      await updateOperationStatus(op.id, 'syncing');
      
      switch (op.type) {
        case 'addProduct':
          await syncAddProduct(op);
          break;
        case 'updateProduct':
          await syncUpdateProduct(op);
          break;
        case 'deleteProduct':
          await syncDeleteProduct(op);
          break;
        case 'sellProduct':
          await syncSellProduct(op);
          break;
        case 'restoreProduct':
          await syncRestoreProduct(op);
          break;
        case 'sellRestoredProduct':
          await syncSellRestoredProduct(op);
          break;
        default:
          console.warn('Unknown operation type:', op.type);
      }
      
      await removeOperation(op.id);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync operation ${op.id}:`, error);
      await updateOperationStatus(op.id, 'failed');
    }
  }

  return syncedCount;
}

// Sync add product
async function syncAddProduct(op: PendingOperation): Promise<void> {
  const data = op.data;
  const productsRef = collection(db, 'products');
  
  const normalizedName = data.productName.trim().toLowerCase();
  const normalizedCategory = data.category.trim().toLowerCase();
  const normalizedModel = (data.model || '').trim().toLowerCase();

  // Check for existing product to update quantity
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
    // Update existing
    const existingDoc = snapshot.docs[0];
    await updateDoc(existingDoc.ref, {
      quantity: increment(data.quantity),
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Create new
    const newRef = doc(productsRef);
    const newProduct = {
      id: newRef.id,
      ...data,
      productNameLower: normalizedName,
      categoryLower: normalizedCategory,
      modelLower: normalizedModel || null,
      addedDate: data.addedDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'store',
    };
    await setDoc(newRef, newProduct);
  }
}

// Sync update product
async function syncUpdateProduct(op: PendingOperation): Promise<void> {
  const { id, updates } = op.data;
  const productRef = doc(db, 'products', id);
  
  await updateDoc(productRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// Sync delete product (mark as deleted)
async function syncDeleteProduct(op: PendingOperation): Promise<void> {
  const { id } = op.data;
  const productRef = doc(db, 'products', id);
  
  await updateDoc(productRef, {
    status: 'deleted',
    deletedDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// Sync sell product
async function syncSellProduct(op: PendingOperation): Promise<void> {
  const { productId, quantity, sellingPrice, deadline, originalProduct } = op.data;
  
  await runTransaction(db, async (transaction) => {
    const originalRef = doc(db, 'products', productId);
    const originalSnap = await transaction.get(originalRef);
    
    if (!originalSnap.exists()) {
      throw new Error('Product not found');
    }
    
    const original = originalSnap.data();
    const newQty = original.quantity - quantity;
    
    // Update original product quantity
    transaction.update(originalRef, {
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    });
    
    // Create sold record
    const soldRef = doc(collection(db, 'products'));
    transaction.set(soldRef, {
      ...originalProduct,
      id: soldRef.id,
      status: 'sold',
      sellingPrice,
      soldDate: new Date().toISOString(),
      quantity,
      deadline: deadline || null,
      updatedAt: new Date().toISOString(),
    });
  });
}

// Sync restore product (from sold to restored)
async function syncRestoreProduct(op: PendingOperation): Promise<void> {
  const { soldId, restoreQty, comment, soldProduct } = op.data;
  
  await runTransaction(db, async (transaction) => {
    const soldRef = doc(db, 'products', soldId);
    const soldSnap = await transaction.get(soldRef);
    
    if (!soldSnap.exists()) {
      throw new Error('Sold product not found');
    }
    
    const sold = soldSnap.data();
    const remainingQty = sold.quantity - restoreQty;
    
    // Update or delete sold product
    if (remainingQty <= 0) {
      transaction.delete(soldRef);
    } else {
      transaction.update(soldRef, {
        quantity: remainingQty,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // Create restored product
    const restoredRef = doc(collection(db, 'products'));
    transaction.set(restoredRef, {
      ...soldProduct,
      id: restoredRef.id,
      status: 'restored',
      restoreComment: comment,
      quantity: restoreQty,
      restoredDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

// Sync sell restored product
async function syncSellRestoredProduct(op: PendingOperation): Promise<void> {
  const { restoredId, sellQty, sellingPrice, deadline, restoredProduct } = op.data;
  
  await runTransaction(db, async (transaction) => {
    const restoredRef = doc(db, 'products', restoredId);
    const restoredSnap = await transaction.get(restoredRef);
    
    if (!restoredSnap.exists()) {
      throw new Error('Restored product not found');
    }
    
    const restored = restoredSnap.data();
    
    // Check status is restored
    if (restored.status !== 'restored') {
      throw new Error('Product is not in restored status');
    }
    
    const remainingQty = restored.quantity - sellQty;
    
    // Update or delete restored product
    if (remainingQty <= 0) {
      transaction.delete(restoredRef);
    } else {
      transaction.update(restoredRef, {
        quantity: remainingQty,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // Create sold record from restored
    const soldRef = doc(collection(db, 'products'));
    transaction.set(soldRef, {
      ...restoredProduct,
      id: soldRef.id,
      status: 'sold',
      sellingPrice,
      soldDate: new Date().toISOString(),
      quantity: sellQty,
      deadline: deadline || null,
      updatedAt: new Date().toISOString(),
      // Keep restore comment for tracking
      restoreComment: restoredProduct.restoreComment,
    });
  });
}
