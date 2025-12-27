// src/lib/transactionLogger.ts

import { collection, addDoc, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

export type TransactionType =
  | 'stock_added'
  | 'stock_updated'
  | 'product_added'
  | 'product_sold'
  | 'product_deleted'
  | 'product_restored'
  | 'product_updated'
  | 'resold_restored'
  | 'resold_restored_product'
  | 'employee_added'
  | 'employee_updated'
  | 'employee_deleted'
  | 'branch_created'
  | 'branch_updated'
  | 'branch_deleted'
  | 'profile_updated';

export interface TransactionLog {
  id?: string;
  transactionType: TransactionType;
  actionDetails: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'staff';
  businessId: string;
  businessName: string;
  branchId?: string;
  branchName?: string;
  productId?: string;
  productName?: string;
  category?: string;
  quantity?: number;
  costPrice?: number;
  sellingPrice?: number;
  profit?: number;
  loss?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export const transactionTypeLabels: Record<TransactionType, string> = {
  stock_added: 'Stock Added',
  stock_updated: 'Stock Updated',
  product_added: 'Product Added',
  product_sold: 'Product Sold',
  product_deleted: 'Product Deleted',
  product_restored: 'Product Restored',
  product_updated: 'Product Updated',
  resold_restored: 'Restored Re-sold',
  resold_restored_product: 'Restored Re-sold',
  employee_added: 'Employee Added',
  employee_updated: 'Employee Updated',
  employee_deleted: 'Employee Deleted',
  branch_created: 'Branch Created',
  branch_updated: 'Branch Updated',
  branch_deleted: 'Branch Deleted',
  profile_updated: 'Profile Updated',
};

export const getTransactionColor = (type: TransactionType): string => {
  switch (type) {
    case 'product_sold':
    case 'resold_restored':
      return 'text-green-600 bg-green-50';
    case 'product_restored':
    case 'product_deleted':
      return 'text-orange-600 bg-orange-50';
    case 'employee_added':
    case 'branch_created':
      return 'text-blue-600 bg-blue-50';
    case 'employee_deleted':
    case 'branch_deleted':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

// Log a transaction (call this from functions)
export const logTransaction = async (tx: Omit<TransactionLog, 'createdAt'> & { model?: string }): Promise<string | null> => {
  try {
    // Remove model if present (not in TransactionLog interface)
    const { model, ...txData } = tx as any;
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...txData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Failed to log transaction:', error);
    return null;
  }
};

// Subscribe to real-time transactions
export const subscribeToTransactions = (
  businessId: string,
  onUpdate: (transactions: TransactionLog[]) => void,
  limitCount: number = 200
) => {
  const q = query(
    collection(db, 'transactions'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const txs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as TransactionLog));
    onUpdate(txs);
  }, (error) => {
    console.error('Transaction subscription error:', error);
  });
};