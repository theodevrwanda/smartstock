// src/lib/transactionLogger.ts
// Blockchain-style append-only transaction ledger

import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, Unsubscribe, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

export type TransactionType = 
  | 'product_added'
  | 'product_updated'
  | 'product_sold'
  | 'product_restored'
  | 'product_deleted'
  | 'resold_restored_product'
  | 'employee_added'
  | 'employee_updated'
  | 'employee_deleted'
  | 'branch_created'
  | 'branch_updated'
  | 'branch_deleted'
  | 'profile_updated'
  | 'stock_updated';

export interface TransactionLog {
  id?: string;
  transactionType: TransactionType;
  businessId: string;
  businessName: string;
  branchId?: string;
  branchName?: string;
  userId: string;
  userName: string;
  userRole?: string;
  productId?: string;
  productName?: string;
  category?: string;
  model?: string;
  quantity?: number;
  pricePerUnit?: number;
  totalAmount?: number;
  costPrice?: number;
  sellingPrice?: number;
  profit?: number;
  loss?: number;
  actionDetails: string;
  metadata?: Record<string, any>;
  createdAt?: any;
}

// Collection name for transactions
const TRANSACTIONS_COLLECTION = 'transactions_logs';

/**
 * Log a transaction - APPEND ONLY (no updates or deletes allowed)
 */
export const logTransaction = async (transaction: Omit<TransactionLog, 'id' | 'createdAt'>): Promise<string | null> => {
  try {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      ...transaction,
      createdAt: serverTimestamp(),
    });
    console.log(`[Blockchain] Transaction logged: ${transaction.transactionType} - ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('[Blockchain] Failed to log transaction:', error);
    return null;
  }
};

/**
 * Subscribe to real-time transaction updates for a business
 */
export const subscribeToTransactions = (
  businessId: string,
  callback: (transactions: TransactionLog[]) => void,
  limitCount: number = 50
): Unsubscribe => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as TransactionLog));
    callback(transactions);
  }, (error) => {
    console.error('[Blockchain] Transaction subscription error:', error);
  });
};

/**
 * Subscribe to NEW transactions only (for notifications)
 */
export const subscribeToNewTransactions = (
  businessId: string,
  onNewTransaction: (transaction: TransactionLog) => void
): Unsubscribe => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  let isFirst = true;
  let lastDocId: string | null = null;

  return onSnapshot(q, (snapshot) => {
    // Skip the first snapshot (initial load)
    if (isFirst) {
      isFirst = false;
      if (!snapshot.empty) {
        lastDocId = snapshot.docs[0].id;
      }
      return;
    }

    // Check for new documents
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' && change.doc.id !== lastDocId) {
        lastDocId = change.doc.id;
        const transaction = {
          id: change.doc.id,
          ...change.doc.data(),
        } as TransactionLog;
        onNewTransaction(transaction);
      }
    });
  }, (error) => {
    console.error('[Blockchain] New transaction subscription error:', error);
  });
};

/**
 * Get all transactions for a business (paginated)
 */
export const getTransactions = async (
  businessId: string,
  filters?: {
    branchId?: string;
    userId?: string;
    transactionType?: TransactionType;
    startDate?: Date;
    endDate?: Date;
  },
  limitCount: number = 100
): Promise<TransactionLog[]> => {
  try {
    let q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where('businessId', '==', businessId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    let transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as TransactionLog));

    // Apply client-side filters (Firestore limitations on compound queries)
    if (filters) {
      if (filters.branchId) {
        transactions = transactions.filter(t => t.branchId === filters.branchId);
      }
      if (filters.userId) {
        transactions = transactions.filter(t => t.userId === filters.userId);
      }
      if (filters.transactionType) {
        transactions = transactions.filter(t => t.transactionType === filters.transactionType);
      }
      if (filters.startDate) {
        transactions = transactions.filter(t => {
          const txDate = t.createdAt?.toDate?.() || new Date(t.createdAt);
          return txDate >= filters.startDate!;
        });
      }
      if (filters.endDate) {
        transactions = transactions.filter(t => {
          const txDate = t.createdAt?.toDate?.() || new Date(t.createdAt);
          return txDate <= filters.endDate!;
        });
      }
    }

    return transactions;
  } catch (error) {
    console.error('[Blockchain] Failed to get transactions:', error);
    return [];
  }
};

// Transaction type labels for display
export const transactionTypeLabels: Record<TransactionType, string> = {
  product_added: 'Product Added',
  product_updated: 'Product Updated',
  product_sold: 'Product Sold',
  product_restored: 'Product Restored',
  product_deleted: 'Product Deleted',
  resold_restored_product: 'Restored Product Resold',
  employee_added: 'Employee Added',
  employee_updated: 'Employee Updated',
  employee_deleted: 'Employee Deleted',
  branch_created: 'Branch Created',
  branch_updated: 'Branch Updated',
  branch_deleted: 'Branch Deleted',
  profile_updated: 'Profile Updated',
  stock_updated: 'Stock Updated',
};

// Get icon color based on transaction type
export const getTransactionColor = (type: TransactionType): string => {
  switch (type) {
    case 'product_sold':
    case 'resold_restored_product':
      return 'text-green-500';
    case 'product_restored':
      return 'text-purple-500';
    case 'product_deleted':
    case 'employee_deleted':
    case 'branch_deleted':
      return 'text-red-500';
    case 'product_added':
    case 'employee_added':
    case 'branch_created':
      return 'text-blue-500';
    default:
      return 'text-yellow-500';
  }
};
