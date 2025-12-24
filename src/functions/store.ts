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
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

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
}

// Get products - admin sees all, staff sees only from assigned branch if branch exists
export const getProducts = async (businessId: string, userRole: 'admin' | 'staff', branchId?: string | null): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef, where('businessId', '==', businessId), where('status', '==', 'store'));

    if (userRole === 'staff') {
      if (branchId) {
        q = query(q, where('branch', '==', branchId));
      } else {
        // If staff has no branch, return empty
        return [];
      }
    }
    // Admins see all

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as Product));
  } catch (error) {
    console.error('Error loading products:', error);
    toast.error('Failed to load products');
    return [];
  }
};

// Add or update product - require branch for adding
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
  if (!data.branch) return null; // Prevent add if no branch

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

      toast.success(`Added ${data.quantity} units to existing product`);
      return {
        id: existingDoc.id,
        ...existingDoc.data(),
        quantity: (existingDoc.data().quantity || 0) + data.quantity,
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
        modelLower: normalizedModel,
        costPrice: data.costPrice,
        sellingPrice: null,
        status: 'store',
        addedDate: new Date().toISOString(),
        quantity: data.quantity,
        branch: data.branch,
        businessId: data.businessId,
        deadline: null,
        confirm: data.confirm,
        updatedAt: new Date().toISOString(),
      } as any;

      await setDoc(newRef, newProduct);
      toast.success('New product added');
      return newProduct;
    }
  } catch (error) {
    console.error('Error adding/updating product:', error);
    toast.error('Failed to add/update product');
    return null;
  }
};

// Update product
export const updateProduct = async (
  id: string,
  updates: Partial<Product>
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'products', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Product updated');
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    toast.error('Update failed');
    return false;
  }
};

// Sell product - check branch match
export const sellProduct = async (
  id: string,
  quantity: number,
  sellingPrice: number,
  deadline?: string,
  userBranch?: string | null
): Promise<boolean> => {
  try {
    const originalDoc = doc(db, 'products', id);
    const originalSnap = await getDoc(originalDoc);

    if (!originalSnap.exists()) {
      console.error('Product not found for sale:', id);
      toast.error('Product not found');
      return false;
    }

    const original = originalSnap.data() as Product;

    if (userBranch && original.branch !== userBranch) {
      console.error('Branch mismatch for sale:', { productBranch: original.branch, userBranch });
      toast.error('Cannot sell - branch mismatch');
      return false;
    }

    if (quantity > original.quantity) {
      console.error('Insufficient quantity:', { requested: quantity, available: original.quantity });
      toast.error('Not enough stock');
      return false;
    }

    await updateDoc(originalDoc, {
      quantity: original.quantity - quantity,
      updatedAt: new Date().toISOString(),
    });

    const soldRef = doc(collection(db, 'products'));
    await setDoc(soldRef, {
      ...original,
      status: 'sold',
      sellingPrice,
      soldDate: new Date().toISOString(),
      quantity: quantity,
      deadline: deadline || null,
      updatedAt: new Date().toISOString(),
    });

    toast.success(`Sold ${quantity} unit(s)`);
    return true;
  } catch (error: any) {
    console.error('Error selling product:', error);
    toast.error('Sale failed');
    return false;
  }
};

// Delete product - mark as deleted
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'products', id), {
      status: 'deleted',
      deletedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    toast.success('Product marked as deleted');
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    toast.error('Delete failed');
    return false;
  }
};
