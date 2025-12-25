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
  pendingConfirmationCount: number;
  soldProducts: number;
  restoredProducts: number;
  deletedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  mostStockedProduct: { name: string; quantity: number };
  leastStockedProduct: { name: string; quantity: number };
  averageStockPerProduct: number;
  totalStockQuantity: number;
  totalNetProfit: number;
  totalStockValue: number;
  totalLoss: number;
}

interface ProductData {
  id: string;
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  sellingPrice?: number | null;
  status: string;
  confirm: boolean;
  addedDate?: string;
  deletedDate?: string;
  soldDate?: string;
  quantity: number;
  branch: string;
  updatedAt?: string;
}

// Empty stats for restricted users
const emptyStats: DashboardStats = {
  totalProducts: 0,
  totalCategories: 0,
  totalModels: 0,
  productsAddedToday: 0,
  productsAddedThisWeek: 0,
  productsAddedThisMonth: 0,
  productsUpdatedToday: 0,
  productsUpdatedThisMonth: 0,
  productsNeverUpdated: 0,
  activeProducts: 0,
  pendingConfirmationCount: 0,
  soldProducts: 0,
  restoredProducts: 0,
  deletedProducts: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  mostStockedProduct: { name: 'N/A', quantity: 0 },
  leastStockedProduct: { name: 'N/A', quantity: 0 },
  averageStockPerProduct: 0,
  totalStockQuantity: 0,
  totalNetProfit: 0,
  totalStockValue: 0,
  totalLoss: 0,
};

// Date helpers (UTC)
const getStartOfDay = (): string => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

const getStartOfWeek = (): string => {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day === 0 ? 6 : day - 1);
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
    // Staff without branch → empty stats
    if (userRole === 'staff' && !branchId) {
      return emptyStats;
    }

    const productsRef = collection(db, 'products');
    let baseQuery = query(productsRef, where('businessId', '==', businessId));

    // Staff → restrict to branch
    if (userRole === 'staff' && branchId) {
      baseQuery = query(baseQuery, where('branch', '==', branchId));
    }
    // Admin → sees all

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
        confirm: data.confirm === true,
        addedDate: data.addedDate || undefined,
        deletedDate: data.deletedDate || undefined,
        soldDate: data.soldDate || undefined,
        quantity: data.quantity || 0,
        branch: data.branch || '',
        updatedAt: data.updatedAt || undefined,
      };
    });

    // Dates
    const todayStart = getStartOfDay();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // Confirmed filters
    const confirmedStoreProducts = products.filter(p => p.status === 'store' && p.confirm);
    const pendingConfirmationProducts = products.filter(p => p.status === 'store' && !p.confirm);
    const confirmedSoldProducts = products.filter(p => p.status === 'sold' && p.confirm);

    // Status counts
    const activeProducts = confirmedStoreProducts.length;
    const pendingConfirmationCount = pendingConfirmationProducts.length;
    const soldProducts = confirmedSoldProducts.length;
    const restoredProducts = products.filter(p => p.status === 'restored').length;
    const deletedProducts = products.filter(p => p.status === 'deleted').length;

    // Added (confirmed store)
    const productsAddedToday = confirmedStoreProducts.filter(p => p.addedDate && p.addedDate >= todayStart).length;
    const productsAddedThisWeek = confirmedStoreProducts.filter(p => p.addedDate && p.addedDate >= weekStart).length;
    const productsAddedThisMonth = confirmedStoreProducts.filter(p => p.addedDate && p.addedDate >= monthStart).length;

    // Updated (all)
    const productsUpdatedToday = products.filter(p => p.updatedAt && p.updatedAt >= todayStart).length;
    const productsUpdatedThisMonth = products.filter(p => p.updatedAt && p.updatedAt >= monthStart).length;
    const productsNeverUpdated = products.filter(p => !p.updatedAt).length;

    // Stock (confirmed store)
    const lowStockProducts = confirmedStoreProducts.filter(p => p.quantity > 0 && p.quantity <= 5).length;
    const outOfStockProducts = confirmedStoreProducts.filter(p => p.quantity === 0).length;
    const totalStockQuantity = confirmedStoreProducts.reduce((sum, p) => sum + p.quantity, 0);

    // Financials (confirmed sold)
    const grossProfit = confirmedSoldProducts.reduce((sum, p) => {
      if (p.sellingPrice !== null) {
        const profit = (p.sellingPrice - p.costPrice) * p.quantity;
        return profit > 0 ? sum + profit : sum;
      }
      return sum;
    }, 0);

    const totalLoss = confirmedSoldProducts.reduce((sum, p) => {
      if (p.sellingPrice !== null) {
        const profit = (p.sellingPrice - p.costPrice) * p.quantity;
        return profit < 0 ? sum + Math.abs(profit) : sum;
      }
      return sum;
    }, 0);

    const totalNetProfit = grossProfit - totalLoss;

    // Stock value (confirmed store)
    const totalStockValue = confirmedStoreProducts.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);

    // Categories & models (all)
    const categories = new Set(products.map(p => p.category)).size;
    const models = new Set(products.filter(p => p.model).map(p => `${p.category}-${p.productName}-${p.model}`)).size;

    // Most/least stocked (confirmed store)
    let mostStockedProduct = { name: 'N/A', quantity: 0 };
    let leastStockedProduct = { name: 'N/A', quantity: 0 };

    if (confirmedStoreProducts.length > 0) {
      const sortedDesc = [...confirmedStoreProducts].sort((a, b) => b.quantity - a.quantity);
      mostStockedProduct = {
        name: `${sortedDesc[0].productName}${sortedDesc[0].model ? ` (${sortedDesc[0].model})` : ''}`,
        quantity: sortedDesc[0].quantity,
      };

      const withStock = confirmedStoreProducts.filter(p => p.quantity > 0);
      if (withStock.length > 0) {
        const sortedAsc = withStock.sort((a, b) => a.quantity - b.quantity);
        leastStockedProduct = {
          name: `${sortedAsc[0].productName}${sortedAsc[0].model ? ` (${sortedAsc[0].model})` : ''}`,
          quantity: sortedAsc[0].quantity,
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
      pendingConfirmationCount,
      soldProducts,
      restoredProducts,
      deletedProducts,
      lowStockProducts,
      outOfStockProducts,
      mostStockedProduct,
      leastStockedProduct,
      averageStockPerProduct,
      totalStockQuantity,
      totalNetProfit,
      totalStockValue,
      totalLoss,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    toast.error('Failed to load dashboard stats');
    throw error;
  }
};