// src/components/BlockchainLedger.tsx
// Blockchain-style transaction ledger view

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TransactionLog, 
  TransactionType,
  subscribeToTransactions, 
  transactionTypeLabels,
  getTransactionColor 
} from '@/lib/transactionLogger';
import { getBranches, Branch } from '@/functions/branch';
import { getEmployees, Employee } from '@/functions/employees';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Link2, 
  Clock, 
  User, 
  Building2, 
  Package,
  TrendingUp,
  TrendingDown,
  Shield,
  Filter,
  X
} from 'lucide-react';

interface BlockchainLedgerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlockchainLedger: React.FC<BlockchainLedgerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Load transactions and metadata
  useEffect(() => {
    if (!isOpen || !user?.businessId) return;

    setLoading(true);

    // Subscribe to real-time transactions
    const unsubscribe = subscribeToTransactions(
      user.businessId,
      (txs) => {
        setTransactions(txs);
        setLoading(false);
      },
      200 // Limit to 200 transactions
    );

    // Load branches and employees for filter dropdowns
    const loadMetadata = async () => {
      if (user.role === 'admin') {
        const [branchList, employeeList] = await Promise.all([
          getBranches(user.businessId!),
          getEmployees(),
        ]);
        setBranches(branchList);
        setEmployees(employeeList.filter(e => e.businessId === user.businessId));
      }
    };
    loadMetadata();

    return () => unsubscribe();
  }, [isOpen, user?.businessId, user?.role]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-RW').format(amount) + ' RWF';
  };

  // Format date/time
  const formatDateTime = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Date filter helper
  const isWithinDateRange = (timestamp: any, range: string): boolean => {
    if (range === 'all') return true;
    if (!timestamp) return false;
    
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    
    switch (range) {
      case 'today':
        return date.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= monthAgo;
      default:
        return true;
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches = 
          (tx.productName?.toLowerCase().includes(search)) ||
          (tx.userName?.toLowerCase().includes(search)) ||
          (tx.branchName?.toLowerCase().includes(search)) ||
          (tx.actionDetails?.toLowerCase().includes(search)) ||
          (tx.transactionType?.toLowerCase().includes(search));
        if (!matches) return false;
      }
      
      // Branch filter
      if (branchFilter !== 'all' && tx.branchId !== branchFilter) return false;
      
      // User filter
      if (userFilter !== 'all' && tx.userId !== userFilter) return false;
      
      // Type filter
      if (typeFilter !== 'all' && tx.transactionType !== typeFilter) return false;
      
      // Date filter
      if (!isWithinDateRange(tx.createdAt, dateFilter)) return false;
      
      return true;
    });
  }, [transactions, searchTerm, branchFilter, userFilter, typeFilter, dateFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setBranchFilter('all');
    setUserFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = searchTerm || branchFilter !== 'all' || userFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all';

  // Get transaction icon
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'product_sold':
      case 'resold_restored_product':
        return <TrendingUp className="h-4 w-4" />;
      case 'product_restored':
      case 'product_deleted':
        return <TrendingDown className="h-4 w-4" />;
      case 'employee_added':
      case 'employee_updated':
      case 'employee_deleted':
        return <User className="h-4 w-4" />;
      case 'branch_created':
      case 'branch_updated':
      case 'branch_deleted':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <SheetTitle>Blockchain Ledger</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            Immutable transaction history - Read only
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 border-b space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(transactionTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {user?.role === 'admin' && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {user?.role === 'admin' && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id!}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="p-4 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              filteredTransactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="bg-card border rounded-lg p-4 space-y-2 hover:shadow-sm transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-full bg-muted ${getTransactionColor(tx.transactionType)}`}>
                        {getTransactionIcon(tx.transactionType)}
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {transactionTypeLabels[tx.transactionType]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(tx.createdAt)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pl-9 space-y-1">
                    <p className="text-sm font-medium">{tx.actionDetails}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {tx.branchName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {tx.branchName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {tx.userName}
                      </span>
                    </div>

                    {/* Financial details */}
                    {(tx.quantity || tx.sellingPrice || tx.profit || tx.loss) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2">
                        {tx.quantity && (
                          <span>Qty: <strong>{tx.quantity}</strong></span>
                        )}
                        {tx.costPrice && (
                          <span>Cost: <strong>{formatCurrency(tx.costPrice)}</strong></span>
                        )}
                        {tx.sellingPrice && (
                          <span>Sold: <strong>{formatCurrency(tx.sellingPrice)}</strong></span>
                        )}
                        {tx.profit && tx.profit > 0 && (
                          <span className="text-green-600">
                            Profit: <strong>+{formatCurrency(tx.profit)}</strong>
                          </span>
                        )}
                        {tx.loss && tx.loss > 0 && (
                          <span className="text-red-600">
                            Loss: <strong>-{formatCurrency(tx.loss)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Block chain indicator */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-9 pt-1 border-t mt-2">
                    <Link2 className="h-3 w-3" />
                    Block #{(filteredTransactions.length - index).toString().padStart(6, '0')}
                    <span className="mx-1">•</span>
                    <span className="font-mono">{tx.id?.slice(0, 12)}...</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredTransactions.length} transactions</span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-500" />
              Immutable ledger - No edits or deletes
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BlockchainLedger;
