// src/functions/dashboard.ts
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalModels: number;
  productsAddedToday: number;
  productsAddedThisWeek: number;
  productsAddedThisMonth: number;
  productsUpdatedToday: number;
  productsUpdatedThisMonth: number;
  productsNeverUpdated: number;
  activeProducts: number;
  soldProducts: number;
  restoredProducts: number;
  deletedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  mostStockedProduct: { name: string; quantity: number };
  leastStockedProduct: { name: string; quantity: number };
  averageStockPerProduct: number;
  totalStockQuantity: number;
}

interface ProductData {
  id: string;
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  sellingPrice?: number | null;
  status: string;
  addedDate?: string;
  deletedDate?: string;
  soldDate?: string;
  quantity: number;
  branch: string;
  updatedAt?: string;
}

// Helper to get start of day/week/month
const getStartOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const getStartOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const getStartOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const getDashboardStats = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<DashboardStats> => {
  try {
    const productsRef = collection(db, 'products');
    let baseQuery = query(productsRef, where('businessId', '==', businessId));

    if (userRole === 'staff' && branchId) {
      baseQuery = query(baseQuery, where('branch', '==', branchId));
    }

    // Fetch all products
    const snapshot = await getDocs(baseQuery);
    const products: ProductData[] = snapshot.docs.map(doc => ({
      id: doc.id,
      productName: doc.data().productName || '',
      category: doc.data().category || '',
      model: doc.data().model || '',
      costPrice: doc.data().costPrice || 0,
      sellingPrice: doc.data().sellingPrice || null,
      status: doc.data().status || 'store',
      addedDate: doc.data().addedDate || '',
      deletedDate: doc.data().deletedDate || '',
      soldDate: doc.data().soldDate || '',
      quantity: doc.data().quantity || 0,
      branch: doc.data().branch || '',
      updatedAt: doc.data().updatedAt || '',
    }));

    const todayStart = getStartOfDay();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // Counts by status
    const activeProducts = products.filter(p => p.status === 'store').length;
    const soldProducts = products.filter(p => p.status === 'sold').length;
    const restoredProducts = products.filter(p => p.status === 'restored').length;
    const deletedProducts = products.filter(p => p.status === 'deleted').length;

    // Added/Updated counts
    const productsAddedToday = products.filter(p => p.addedDate && p.addedDate >= todayStart).length;
    const productsAddedThisWeek = products.filter(p => p.addedDate && p.addedDate >= weekStart).length;
    const productsAddedThisMonth = products.filter(p => p.addedDate && p.addedDate >= monthStart).length;

    const productsUpdatedToday = products.filter(p => p.updatedAt && p.updatedAt >= todayStart).length;
    const productsUpdatedThisMonth = products.filter(p => p.updatedAt && p.updatedAt >= monthStart).length;
    const productsNeverUpdated = products.filter(p => !p.updatedAt).length;

    // Stock levels
    const lowStock = products.filter(p => p.status === 'store' && p.quantity > 0 && p.quantity <= 5).length;
    const outOfStock = products.filter(p => p.status === 'store' && p.quantity === 0).length;

    // Total stock quantity
    const totalStockQuantity = products
      .filter(p => p.status === 'store')
      .reduce((sum, p) => sum + (p.quantity || 0), 0);

    // Categories & Models
    const categories = new Set(products.map(p => p.category)).size;
    const models = new Set(products.filter(p => p.model).map(p => `${p.productName}-${p.model}`)).size;

    // Most & least stocked (store only)
    const storeProducts = products.filter(p => p.status === 'store');
    let mostStocked = { name: 'N/A', quantity: 0 };
    let leastStocked = { name: 'N/A', quantity: 0 };

    if (storeProducts.length > 0) {
      storeProducts.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      mostStocked = {
        name: storeProducts[0].productName + (storeProducts[0].model ? ` (${storeProducts[0].model})` : ''),
        quantity: storeProducts[0].quantity || 0,
      };
      const withStock = storeProducts.filter(p => (p.quantity || 0) > 0);
      if (withStock.length > 0) {
        withStock.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
        leastStocked = {
          name: withStock[0].productName + (withStock[0].model ? ` (${withStock[0].model})` : ''),
          quantity: withStock[0].quantity || 0,
        };
      }
    }

    const averageStockPerProduct = activeProducts > 0 ? Math.round(totalStockQuantity / activeProducts) : 0;

    return {
      totalProducts: products.length,
      totalCategories: categories,
      totalModels: models,
      productsAddedToday,
      productsAddedThisWeek,
      productsAddedThisMonth,
      productsUpdatedToday,
      productsUpdatedThisMonth,
      productsNeverUpdated,
      activeProducts,
      soldProducts,
      restoredProducts,
      deletedProducts,
      lowStockProducts: lowStock,
      outOfStockProducts: outOfStock,
      mostStockedProduct: mostStocked,
      leastStockedProduct: leastStocked,
      averageStockPerProduct,
      totalStockQuantity,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    toast.error('Failed to load dashboard stats');
    throw error;
  }
};
