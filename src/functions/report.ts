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

  grossProfit: number;   // ✅ NEW
  totalLoss: number;
  netProfit: number;     // ✅ NEW

  totalStoreValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export const getReportData = async (
  businessId: string,
  userRole: 'admin' | 'staff',
  branchId?: string | null
): Promise<{ products: ProductReport[]; summary: ReportSummary }> => {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef, where('businessId', '==', businessId));

    if (userRole === 'staff' && branchId) {
      q = query(q, where('branch', '==', branchId));
    }

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

      // ✅ Profit/Loss ONLY for sold products
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

    // ---------- SUMMARY CALCULATIONS ----------
    const storeProducts = products.filter(p => p.status === 'store');
    const soldProducts = products.filter(p => p.status === 'sold');
    const restoredProducts = products.filter(p => p.status === 'restored');
    const deletedProducts = products.filter(p => p.status === 'deleted');

    const grossProfit = soldProducts.reduce((sum, p) => {
      return p.profitLoss && p.profitLoss > 0 ? sum + p.profitLoss : sum;
    }, 0);

    const totalLoss = soldProducts.reduce((sum, p) => {
      return p.profitLoss && p.profitLoss < 0 ? sum + Math.abs(p.profitLoss) : sum;
    }, 0);

    const netProfit = grossProfit - totalLoss;

    const totalStoreValue = storeProducts.reduce(
      (sum, p) => sum + p.costPrice * p.quantity,
      0
    );

    const lowStockCount = storeProducts.filter(
      p => p.quantity > 0 && p.quantity <= 5
    ).length;

    const outOfStockCount = storeProducts.filter(
      p => p.quantity === 0
    ).length;

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
    throw error;
  }
};
