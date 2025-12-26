// src/hooks/useTransactionLogger.ts
// Hook to log transactions with user/business context

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logTransaction, TransactionType, TransactionLog } from '@/lib/transactionLogger';

interface TransactionData {
  transactionType: TransactionType;
  branchId?: string;
  branchName?: string;
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
}

export const useTransactionLogger = () => {
  const { user } = useAuth();

  const logTx = useCallback(async (data: TransactionData): Promise<string | null> => {
    if (!user?.businessId) {
      console.warn('[TransactionLogger] No businessId - skipping log');
      return null;
    }

    const transaction: Omit<TransactionLog, 'id' | 'createdAt'> = {
      transactionType: data.transactionType,
      businessId: user.businessId,
      businessName: user.businessName || '',
      branchId: data.branchId || user.branch || undefined,
      branchName: data.branchName,
      userId: user.id,
      userName: user.fullName || `${user.firstName} ${user.lastName}`.trim() || user.email,
      userRole: user.role,
      productId: data.productId,
      productName: data.productName,
      category: data.category,
      model: data.model,
      quantity: data.quantity,
      pricePerUnit: data.pricePerUnit,
      totalAmount: data.totalAmount,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      profit: data.profit,
      loss: data.loss,
      actionDetails: data.actionDetails,
      metadata: data.metadata,
    };

    return logTransaction(transaction);
  }, [user]);

  // Convenience methods for common transactions
  const logProductAdded = useCallback((product: {
    id?: string;
    productName: string;
    category: string;
    model?: string;
    quantity: number;
    costPrice: number;
    branchId?: string;
    branchName?: string;
  }) => {
    return logTx({
      transactionType: 'product_added',
      productId: product.id,
      productName: product.productName,
      category: product.category,
      model: product.model,
      quantity: product.quantity,
      costPrice: product.costPrice,
      pricePerUnit: product.costPrice,
      totalAmount: product.costPrice * product.quantity,
      branchId: product.branchId,
      branchName: product.branchName,
      actionDetails: `Added ${product.quantity} x ${product.productName} (${product.category}) at ${product.costPrice.toLocaleString()} RWF each`,
    });
  }, [logTx]);

  const logProductSold = useCallback((product: {
    id?: string;
    productName: string;
    category: string;
    model?: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    branchId?: string;
    branchName?: string;
  }) => {
    const profit = (product.sellingPrice - product.costPrice) * product.quantity;
    return logTx({
      transactionType: 'product_sold',
      productId: product.id,
      productName: product.productName,
      category: product.category,
      model: product.model,
      quantity: product.quantity,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      pricePerUnit: product.sellingPrice,
      totalAmount: product.sellingPrice * product.quantity,
      profit: profit > 0 ? profit : undefined,
      loss: profit < 0 ? Math.abs(profit) : undefined,
      branchId: product.branchId,
      branchName: product.branchName,
      actionDetails: `Sold ${product.quantity} x ${product.productName} at ${product.sellingPrice.toLocaleString()} RWF each`,
    });
  }, [logTx]);

  const logProductRestored = useCallback((product: {
    id?: string;
    productName: string;
    category: string;
    model?: string;
    quantity: number;
    costPrice: number;
    sellingPrice?: number;
    comment?: string;
    branchId?: string;
    branchName?: string;
  }) => {
    return logTx({
      transactionType: 'product_restored',
      productId: product.id,
      productName: product.productName,
      category: product.category,
      model: product.model,
      quantity: product.quantity,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      branchId: product.branchId,
      branchName: product.branchName,
      actionDetails: `Restored ${product.quantity} x ${product.productName}${product.comment ? ` - Reason: ${product.comment}` : ''}`,
      metadata: { comment: product.comment },
    });
  }, [logTx]);

  const logRestoredProductSold = useCallback((product: {
    id?: string;
    productName: string;
    category: string;
    model?: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    branchId?: string;
    branchName?: string;
  }) => {
    const profit = (product.sellingPrice - product.costPrice) * product.quantity;
    return logTx({
      transactionType: 'resold_restored_product',
      productId: product.id,
      productName: product.productName,
      category: product.category,
      model: product.model,
      quantity: product.quantity,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      pricePerUnit: product.sellingPrice,
      totalAmount: product.sellingPrice * product.quantity,
      profit: profit > 0 ? profit : undefined,
      loss: profit < 0 ? Math.abs(profit) : undefined,
      branchId: product.branchId,
      branchName: product.branchName,
      actionDetails: `Re-sold restored ${product.quantity} x ${product.productName} at ${product.sellingPrice.toLocaleString()} RWF each`,
    });
  }, [logTx]);

  const logProductDeleted = useCallback((product: {
    id?: string;
    productName: string;
    category: string;
    model?: string;
    quantity: number;
    costPrice: number;
    branchId?: string;
    branchName?: string;
  }) => {
    const totalLoss = product.costPrice * product.quantity;
    return logTx({
      transactionType: 'product_deleted',
      productId: product.id,
      productName: product.productName,
      category: product.category,
      model: product.model,
      quantity: product.quantity,
      costPrice: product.costPrice,
      loss: totalLoss,
      branchId: product.branchId,
      branchName: product.branchName,
      actionDetails: `Deleted ${product.quantity} x ${product.productName} - Loss: ${totalLoss.toLocaleString()} RWF`,
    });
  }, [logTx]);

  const logProductUpdated = useCallback((product: {
    id?: string;
    productName: string;
    category?: string;
    changes: string;
    branchId?: string;
    branchName?: string;
  }) => {
    return logTx({
      transactionType: 'product_updated',
      productId: product.id,
      productName: product.productName,
      category: product.category,
      branchId: product.branchId,
      branchName: product.branchName,
      actionDetails: `Updated ${product.productName}: ${product.changes}`,
    });
  }, [logTx]);

  const logStockUpdated = useCallback((product: {
    id?: string;
    productName: string;
    category?: string;
    oldQuantity: number;
    newQuantity: number;
    branchId?: string;
    branchName?: string;
  }) => {
    const diff = product.newQuantity - product.oldQuantity;
    return logTx({
      transactionType: 'stock_updated',
      productId: product.id,
      productName: product.productName,
      category: product.category,
      quantity: product.newQuantity,
      branchId: product.branchId,
      branchName: product.branchName,
      actionDetails: `Stock ${diff >= 0 ? 'increased' : 'decreased'} for ${product.productName}: ${product.oldQuantity} → ${product.newQuantity} (${diff >= 0 ? '+' : ''}${diff})`,
      metadata: { oldQuantity: product.oldQuantity, newQuantity: product.newQuantity },
    });
  }, [logTx]);

  const logEmployeeAdded = useCallback((employee: {
    id?: string;
    name: string;
    email: string;
    role: string;
    branchId?: string;
    branchName?: string;
  }) => {
    return logTx({
      transactionType: 'employee_added',
      branchId: employee.branchId,
      branchName: employee.branchName,
      actionDetails: `Added new employee: ${employee.name} (${employee.email}) as ${employee.role}`,
      metadata: { employeeId: employee.id, email: employee.email, role: employee.role },
    });
  }, [logTx]);

  const logEmployeeUpdated = useCallback((employee: {
    id?: string;
    name: string;
    changes: string;
    branchId?: string;
    branchName?: string;
  }) => {
    return logTx({
      transactionType: 'employee_updated',
      branchId: employee.branchId,
      branchName: employee.branchName,
      actionDetails: `Updated employee ${employee.name}: ${employee.changes}`,
      metadata: { employeeId: employee.id },
    });
  }, [logTx]);

  const logEmployeeDeleted = useCallback((employee: {
    id?: string;
    name: string;
    email: string;
  }) => {
    return logTx({
      transactionType: 'employee_deleted',
      actionDetails: `Deleted employee: ${employee.name} (${employee.email})`,
      metadata: { employeeId: employee.id, email: employee.email },
    });
  }, [logTx]);

  const logBranchCreated = useCallback((branch: {
    id?: string;
    branchName: string;
    location?: string;
  }) => {
    return logTx({
      transactionType: 'branch_created',
      branchId: branch.id,
      branchName: branch.branchName,
      actionDetails: `Created new branch: ${branch.branchName}${branch.location ? ` in ${branch.location}` : ''}`,
      metadata: { branchId: branch.id },
    });
  }, [logTx]);

  const logBranchUpdated = useCallback((branch: {
    id?: string;
    branchName: string;
    changes: string;
  }) => {
    return logTx({
      transactionType: 'branch_updated',
      branchId: branch.id,
      branchName: branch.branchName,
      actionDetails: `Updated branch ${branch.branchName}: ${branch.changes}`,
      metadata: { branchId: branch.id },
    });
  }, [logTx]);

  const logBranchDeleted = useCallback((branch: {
    id?: string;
    branchName: string;
  }) => {
    return logTx({
      transactionType: 'branch_deleted',
      branchId: branch.id,
      branchName: branch.branchName,
      actionDetails: `Deleted branch: ${branch.branchName}`,
      metadata: { branchId: branch.id },
    });
  }, [logTx]);

  const logProfileUpdated = useCallback((changes: string) => {
    return logTx({
      transactionType: 'profile_updated',
      actionDetails: `Profile updated: ${changes}`,
    });
  }, [logTx]);

  return {
    logTx,
    logProductAdded,
    logProductSold,
    logProductRestored,
    logRestoredProductSold,
    logProductDeleted,
    logProductUpdated,
    logStockUpdated,
    logEmployeeAdded,
    logEmployeeUpdated,
    logEmployeeDeleted,
    logBranchCreated,
    logBranchUpdated,
    logBranchDeleted,
    logProfileUpdated,
  };
};
