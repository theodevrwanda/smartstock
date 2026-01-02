// src/functions/report.ts

import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

import { ProductReport, ReportSummary } from '@/types/interface';

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

// Helper: Get true unit cost (costPricePerUnit first)
const getActualUnitCost = (data: any): number => {
  return data.costPricePerUnit ?? data.costPrice ?? 0;
};

export const getReportData = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  userBranch: string | null
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

      const quantity = Number(data.quantity) || 0;
      const unitCost = getActualUnitCost(data); // ← TRUE unit cost
      const totalCost = unitCost * quantity;

      const sellingPrice =
        data.sellingPrice !== undefined && data.sellingPrice !== null
          ? Number(data.sellingPrice)
          : null;

      let profitLoss: number | null = null;

      // Only calculate profit/loss for SOLD items
      if (data.status === 'sold' && sellingPrice !== null) {
        profitLoss = (sellingPrice - unitCost) * quantity;
      }

      return {
        id: doc.id,
        productName: data.productName || '',
        category: data.category || '',
        model: data.model || '',
        quantity,
        branch: data.branch || '',
        costPrice: Number(data.costPrice) || 0,
        sellingPrice,
        profitLoss,
        status: data.status || 'store',
        addedDate: data.addedDate || '',
        soldDate: data.soldDate || undefined,
        deletedDate: data.deletedDate || undefined,
        restoredDate: data.restoredDate || undefined,
        restoreComment: data.restoreComment || undefined,
        businessId: data.businessId,
        unit: data.unit || 'pcs',
        costPricePerUnit: data.costPricePerUnit,
        confirm: data.confirm === true,
      };
    });

    // Categorize products
    const storeProducts = products.filter(p => p.status === 'store');
    const restoredProducts = products.filter(p => p.status === 'restored');
    const soldProducts = products.filter(p => p.status === 'sold');
    const deletedProducts = products.filter(p => p.status === 'deleted');

    // Profit & Loss from SOLD items only (using actual unit cost)
    const grossProfit = soldProducts.reduce((sum, p) => {
      return p.profitLoss && p.profitLoss > 0 ? sum + p.profitLoss : sum;
    }, 0);

    const totalLoss = soldProducts.reduce((sum, p) => {
      return p.profitLoss && p.profitLoss < 0 ? sum + Math.abs(p.profitLoss) : sum;
    }, 0);

    const netProfit = grossProfit - totalLoss;

    // Total value of current stock (only confirmed store products) using actual unit cost
    const confirmedStoreProducts = storeProducts.filter(p => p.confirm === true);
    const totalStoreValue = confirmedStoreProducts.reduce(
      (sum, p) => sum + (getActualUnitCost(p) * p.quantity),
      0
    );

    // Stock status
    const activeStock = [...storeProducts, ...restoredProducts];
    const lowStockCount = activeStock.filter(p => p.quantity > 0 && p.quantity <= 10).length; // Adjustable threshold
    const outOfStockCount = activeStock.filter(p => p.quantity === 0).length;

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