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
  addedDate?: string;        // ISO string, e.g., "2025-12-25T07:04:37.939Z"
  deletedDate?: string;
  soldDate?: string;
  quantity: number;
  branch: string;
  updatedAt?: string;
}

// Helper functions for date boundaries (all in UTC to match Firestore timestamps)
const getStartOfDay = (): string => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

const getStartOfWeek = (): string => {
  const d = new Date();
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = (day === 0 ? 6 : day - 1); // Start week on Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

const getStartOfMonth = (): string => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
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

    const snapshot = await getDocs(baseQuery);
    const products: ProductData[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        productName: data.productName || '',
        category: data.category || '',
        model: data.model || undefined,
        costPrice: data.costPrice || 0,
        sellingPrice: data.sellingPrice ?? null,
        status: data.status || 'store',
        addedDate: data.addedDate || undefined,
        deletedDate: data.deletedDate || undefined,
        soldDate: data.soldDate || undefined,
        quantity: data.quantity || 0,
        branch: data.branch || '',
        updatedAt: data.updatedAt || undefined,
      };
    });

    // Date boundaries (UTC)
    const todayStart = getStartOfDay();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // Filter active (in store) products
    const storeProducts = products.filter(p => p.status === 'store');

    // Status counts
    const activeProducts = storeProducts.length;
    const soldProducts = products.filter(p => p.status === 'sold').length;
    const restoredProducts = products.filter(p => p.status === 'restored').length;
    const deletedProducts = products.filter(p => p.status === 'deleted').length;

    // Added counts — ONLY for products currently in 'store'
    const productsAddedToday = storeProducts.filter(p => 
      p.addedDate && p.addedDate >= todayStart
    ).length;

    const productsAddedThisWeek = storeProducts.filter(p => 
      p.addedDate && p.addedDate >= weekStart
    ).length;

    const productsAddedThisMonth = storeProducts.filter(p => 
      p.addedDate && p.addedDate >= monthStart
    ).length;

    // Updated counts (all products, not just store)
    const productsUpdatedToday = products.filter(p => 
      p.updatedAt && p.updatedAt >= todayStart
    ).length;

    const productsUpdatedThisMonth = products.filter(p => 
      p.updatedAt && p.updatedAt >= monthStart
    ).length;

    const productsNeverUpdated = products.filter(p => !p.updatedAt).length;

    // Stock-related stats (only store products)
    const lowStockProducts = storeProducts.filter(p => p.quantity > 0 && p.quantity <= 5).length;
    const outOfStockProducts = storeProducts.filter(p => p.quantity === 0).length;

    const totalStockQuantity = storeProducts.reduce((sum, p) => sum + p.quantity, 0);

    // Categories & unique models
    const categories = new Set(products.map(p => p.category)).size;
    const models = new Set(
      products
        .filter(p => p.model)
        .map(p => `${p.category}-${p.productName}-${p.model}`)
    ).size;

    // Most & least stocked (among store products)
    let mostStocked = { name: '', quantity: 0 };
    let leastStocked = { name: '', quantity: 0 };

    if (storeProducts.length > 0) {
      // Most stocked
      const sortedByQuantityDesc = [...storeProducts].sort((a, b) => b.quantity - a.quantity);
      mostStocked = {
        name: `${sortedByQuantityDesc[0].productName}${sortedByQuantityDesc[0].model ? ` (${sortedByQuantityDesc[0].model})` : ''}`,
        quantity: sortedByQuantityDesc[0].quantity,
      };

      // Least stocked — only consider products with quantity > 0
      const withStock = storeProducts.filter(p => p.quantity > 0);
      if (withStock.length > 0) {
        const sortedAsc = withStock.sort((a, b) => a.quantity - b.quantity);
        leastStocked = {
          name: `${sortedAsc[0].productName}${sortedAsc[0].model ? ` (${sortedAsc[0].model})` : ''}`,
          quantity: sortedAsc[0].quantity,
        };
      }
    }

    const averageStockPerProduct = activeProducts > 0 
      ? Math.round(totalStockQuantity / activeProducts) 
      : 0;

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
      lowStockProducts,
      outOfStockProducts,
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