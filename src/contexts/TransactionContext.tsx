// src/contexts/TransactionContext.tsx
// Real-time transaction notifications context

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TransactionLog, 
  subscribeToNewTransactions, 
  transactionTypeLabels,
  getTransactionColor 
} from '@/lib/transactionLogger';
import { toast } from 'sonner';
import { Bell, TrendingUp, TrendingDown, Package, Users, Building2, UserCircle } from 'lucide-react';

interface TransactionContextType {
  latestTransaction: TransactionLog | null;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  transactionCount: number;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [latestTransaction, setLatestTransaction] = useState<TransactionLog | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [transactionCount, setTransactionCount] = useState(0);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-RW', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' RWF';
  };

  // Format timestamp
  const formatTime = (timestamp: any): string => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Show notification for a transaction
  const showTransactionNotification = useCallback((transaction: TransactionLog) => {
    if (!notificationsEnabled) return;
    
    // Don't show notifications for own actions
    if (transaction.userId === user?.id) return;

    const typeLabel = transactionTypeLabels[transaction.transactionType];
    const colorClass = getTransactionColor(transaction.transactionType);
    
    let icon = Package;
    let description = transaction.actionDetails;
    
    // Customize notification based on type
    switch (transaction.transactionType) {
      case 'product_sold':
      case 'resold_restored_product':
        icon = TrendingUp;
        description = `${transaction.branchName || 'Unknown Branch'} sold ${transaction.productName}\nQty: ${transaction.quantity}\nPrice: ${formatCurrency(transaction.sellingPrice || 0)}`;
        if (transaction.profit && transaction.profit > 0) {
          description += `\nProfit: +${formatCurrency(transaction.profit)}`;
        }
        if (transaction.loss && transaction.loss > 0) {
          description += `\nLoss: -${formatCurrency(transaction.loss)}`;
        }
        break;
      case 'product_restored':
        icon = Package;
        description = `${transaction.branchName || 'Unknown Branch'} restored ${transaction.productName}\nQty: ${transaction.quantity}`;
        break;
      case 'employee_added':
      case 'employee_updated':
        icon = Users;
        break;
      case 'branch_created':
      case 'branch_updated':
        icon = Building2;
        break;
      case 'profile_updated':
        icon = UserCircle;
        break;
    }

    toast(
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Bell className={`h-4 w-4 ${colorClass}`} />
          <span className="font-semibold">{typeLabel}</span>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          By {transaction.userName} • {formatTime(transaction.createdAt)}
        </p>
      </div>,
      {
        duration: 5000,
        position: 'top-right',
      }
    );
  }, [notificationsEnabled, user?.id]);

  // Subscribe to new transactions
  useEffect(() => {
    if (!user?.businessId) return;

    const unsubscribe = subscribeToNewTransactions(
      user.businessId,
      (transaction) => {
        setLatestTransaction(transaction);
        setTransactionCount(prev => prev + 1);
        showTransactionNotification(transaction);
      }
    );

    return () => unsubscribe();
  }, [user?.businessId, showTransactionNotification]);

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => !prev);
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        latestTransaction,
        notificationsEnabled,
        toggleNotifications,
        transactionCount,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
