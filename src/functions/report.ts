// src/functions/report.ts

import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

export interface ProductReport {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: string;
  costPrice: number;
  sellingPrice: number | null;
  profitLoss: number | null;
  status: 'store' | 'sold' | 'restored' | 'deleted';
  addedDate: string;
  soldDate?: string;
  deletedDate?: string;
  restoreComment?: string;
  businessId: string;
}

export interface ReportSummary {
  totalProducts: number;
  storeCount: number;
  soldCount: number;
  restoredCount: number;
  deletedCount: number;
  grossProfit: number;
  totalLoss: number;
  netProfit: number;
  totalStoreValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// Empty summary for restricted users
const emptySummary: ReportSummary = {
  totalProducts: 0,
  storeCount: 0,
  soldCount: 0,
  restoredCount: 0,
  deletedCount: 0,
  grossProfit: 0,
  totalLoss: 0,
  netProfit: 0,
  totalStoreValue: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
};

export const getReportData = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  userBranch: string | null   // Important: can be null
): Promise<{ products: ProductReport[]; summary: ReportSummary }> => {
  try {
    // BLOCK: Staff with no branch assigned sees NOTHING
    if (userRole === 'staff' && !userBranch) {
      return { products: [], summary: emptySummary };
    }

    const productsRef = collection(db, 'products');
    let q = query(productsRef, where('businessId', '==', businessId));

    // Staff with branch → restrict to their branch only
    if (userRole === 'staff' && userBranch) {
      q = query(q, where('branch', '==', userBranch));
    }
    // Admin → no branch filter → sees all

    const snapshot = await getDocs(q);

    const products: ProductReport[] = snapshot.docs.map(doc => {
      const data = doc.data();

      const costPrice = Number(data.costPrice) || 0;
      const sellingPrice =
        data.sellingPrice !== undefined && data.sellingPrice !== null
          ? Number(data.sellingPrice)
          : null;
      const quantity = Number(data.quantity) || 0;

      let profitLoss: number | null = null;

      if (data.status === 'sold' && sellingPrice !== null) {
        profitLoss = (sellingPrice - costPrice) * quantity;
      }

      return {
        id: doc.id,
        productName: data.productName || '',
        category: data.category || '',
        model: data.model || undefined,
        quantity,
        branch: data.branch || '',
        costPrice,
        sellingPrice,
        profitLoss,
        status: data.status || 'store',
        addedDate: data.addedDate || data.createdAt || '',
        soldDate: data.soldDate || undefined,
        deletedDate: data.deletedDate || undefined,
        restoreComment: data.restoreComment || undefined,
        businessId: data.businessId,
      };
    });

    // Summary calculations
    const storeProducts = products.filter(p => p.status === 'store');
    const restoredProducts = products.filter(p => p.status === 'restored');
    const soldProducts = products.filter(p => p.status === 'sold');
    const deletedProducts = products.filter(p => p.status === 'deleted');

    const grossProfit = soldProducts.reduce((sum, p) => {
      return p.profitLoss && p.profitLoss > 0 ? sum + p.profitLoss : sum;
    }, 0);

    const totalLoss = soldProducts.reduce((sum, p) => {
      return p.profitLoss && p.profitLoss < 0 ? sum + Math.abs(p.profitLoss) : sum;
    }, 0);

    const netProfit = grossProfit - totalLoss;

    const totalStoreValue = [...storeProducts, ...restoredProducts].reduce(
      (sum, p) => sum + p.costPrice * p.quantity,
      0
    );

    const stockProducts = [...storeProducts, ...restoredProducts];
    const lowStockCount = stockProducts.filter(p => p.quantity > 0 && p.quantity <= 5).length;
    const outOfStockCount = stockProducts.filter(p => p.quantity === 0).length;

    const summary: ReportSummary = {
      totalProducts: products.length,
      storeCount: storeProducts.length,
      soldCount: soldProducts.length,
      restoredCount: restoredProducts.length,
      deletedCount: deletedProducts.length,
      grossProfit,
      totalLoss,
      netProfit,
      totalStoreValue,
      lowStockCount,
      outOfStockCount,
    };

    return { products, summary };
  } catch (error) {
    console.error('Error fetching report data:', error);
    toast.error('Failed to load report data');
    return { products: [], summary: emptySummary };
  }
};