// src/functions/dashboard.ts

import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

import { DashboardStats } from '@/types/interface';

interface ProductData {
  id: string;
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  costPricePerUnit?: number;
  costType?: 'costPerUnit' | 'bulkCost' | 'costPricePerUnit';
  sellingPrice?: number | null;
  status: string;
  confirm: boolean;
  addedDate?: string;
  deletedDate?: string;
  soldDate?: string;
  quantity: number;
  branch: string;
  updatedAt?: string;
  expiryDate?: string;
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
  mostStockedProduct: { name: 'N/A', quantity: 0, value: 0 },
  leastStockedProduct: { name: 'N/A', quantity: 0, value: 0 },
  averageStockPerProduct: 0,
  totalStockQuantity: 0,
  totalNetProfit: 0,
  totalStockValue: 0,
  totalLoss: 0,
  expiredProductsCount: 0,
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
        costPricePerUnit: data.costPricePerUnit,
        costType: data.costType,
        sellingPrice: data.sellingPrice ?? null,
        status: data.status || 'store',
        confirm: data.confirm === true,
        addedDate: data.addedDate || undefined,
        deletedDate: data.deletedDate || undefined,
        soldDate: data.soldDate || undefined,
        quantity: data.quantity || 0,
        branch: data.branch || '',
        updatedAt: data.updatedAt || undefined,
        expiryDate: data.expiryDate || undefined,
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

    // Helper: Get actual unit cost based on costType
    const getUnitCost = (p: ProductData): number => {
      if (p.costType === 'bulkCost' && p.costPricePerUnit) {
        return p.costPricePerUnit;
      }
      return p.costPrice;
    };

    // Financials (confirmed sold)
    // Net Profit: Sum of all (sellingPrice - unitCost) * quantity for sold products
    const totalNetProfit = confirmedSoldProducts.reduce((sum, p) => {
      if (p.sellingPrice !== null) {
        const unitCost = getUnitCost(p);
        const profit = (p.sellingPrice - unitCost) * p.quantity;
        return sum + profit;
      }
      return sum;
    }, 0);

    // Total Loss: Only actual losses where sellingPrice < unitCost
    const totalLoss = confirmedSoldProducts.reduce((sum, p) => {
      if (p.sellingPrice !== null) {
        const unitCost = getUnitCost(p);
        if (p.sellingPrice < unitCost) {
          const loss = (unitCost - p.sellingPrice) * p.quantity;
          return sum + loss;
        }
      }
      return sum;
    }, 0);

    // Stock value: Only unsold confirmed products (status !== 'sold')
    const unsoldConfirmedProducts = products.filter(p => p.status !== 'sold' && p.confirm);
    const totalStockValue = unsoldConfirmedProducts.reduce((sum, p) => {
      const unitCost = getUnitCost(p);
      return sum + (unitCost * p.quantity);
    }, 0);

    // Categories & models (all)
    const categories = new Set(products.map(p => p.category)).size;
    const models = new Set(products.filter(p => p.model).map(p => `${p.category}-${p.productName}-${p.model}`)).size;

    // Most/least stocked (confirmed store)
    let mostStockedProduct = { name: 'N/A', quantity: 0, value: 0 };
    let leastStockedProduct = { name: 'N/A', quantity: 0, value: 0 };

    if (confirmedStoreProducts.length > 0) {
      const sortedDesc = [...confirmedStoreProducts].sort((a, b) => b.quantity - a.quantity);
      mostStockedProduct = {
        name: `${sortedDesc[0].productName}${sortedDesc[0].model ? ` (${sortedDesc[0].model})` : ''}`,
        quantity: sortedDesc[0].quantity,
        value: getUnitCost(sortedDesc[0]) * sortedDesc[0].quantity,
      };

      const withStock = confirmedStoreProducts.filter(p => p.quantity > 0);
      if (withStock.length > 0) {
        const sortedAsc = withStock.sort((a, b) => a.quantity - b.quantity);
        leastStockedProduct = {
          name: `${sortedAsc[0].productName}${sortedAsc[0].model ? ` (${sortedAsc[0].model})` : ''}`,
          quantity: sortedAsc[0].quantity,
          value: getUnitCost(sortedAsc[0]) * sortedAsc[0].quantity,
        };
      }
    }

    const averageStockPerProduct = activeProducts > 0 ? Math.round(totalStockQuantity / activeProducts) : 0;

    // Expired products (only confirmed store products)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiredProductsCount = confirmedStoreProducts.filter(p => {
      if (!p.expiryDate) return false;
      const expDate = new Date(p.expiryDate);
      expDate.setHours(0, 0, 0, 0);
      return expDate < today;
    }).length;

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
      expiredProductsCount,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    toast.error('Failed to load dashboard stats');
    throw error;
  }
};