// src/components/BlockchainLedger.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TransactionLog, 
  transactionTypeLabels,
  getTransactionColor,
  subscribeToTransactions 
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
  X,
  ArrowUpDown
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

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof TransactionLog | 'profit' | 'loss'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const isAdmin = user?.role === 'admin';
  const userBranchId = user?.branch || null;

  // Load real-time transactions (already filtered by businessId in subscribeToTransactions)
  useEffect(() => {
    if (!isOpen || !user?.businessId) return;

    setLoading(true);

    const unsubscribe = subscribeToTransactions(user.businessId, (txs) => {
      setTransactions(txs);
      setLoading(false);
    }, 500);

    // Load branches and employees for filters
    Promise.all([
      getBranches(user.businessId),
      getEmployees()
    ]).then(([branchList, employeeList]) => {
      setBranches(branchList);
      // For staff: only show users from same branch
      if (!isAdmin && userBranchId) {
        setEmployees(employeeList.filter(e => e.businessId === user.businessId && e.branch === userBranchId));
      } else {
        setEmployees(employeeList.filter(e => e.businessId === user.businessId));
      }
    });

    return () => unsubscribe();
  }, [isOpen, user?.businessId, isAdmin, userBranchId]);

  // Format helpers
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(amount) + ' RWF';
  };

  const formatDateTime = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ', ' + date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const isWithinDateRange = (iso: string, range: string): boolean => {
    if (range === 'all') return true;
    const date = new Date(iso);
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

  // Filtered and Sorted transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // STAFF: Hide employee & branch transactions + only show own branch
    if (!isAdmin) {
      filtered = filtered.filter(tx => {
        // Hide employee and branch transactions
        if (
          tx.transactionType.startsWith('employee_') ||
          tx.transactionType.startsWith('branch_')
        ) {
          return false;
        }

        // Only show transactions from user's own branch
        if (userBranchId && tx.branchId && tx.branchId !== userBranchId) {
          return false;
        }

        return true;
      });
    }
    // ADMIN: Can see everything

    // Apply search and filters
    filtered = filtered.filter(tx => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches = 
          tx.productName?.toLowerCase().includes(search) ||
          tx.userName?.toLowerCase().includes(search) ||
          tx.branchName?.toLowerCase().includes(search) ||
          tx.actionDetails?.toLowerCase().includes(search) ||
          tx.transactionType?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      if (branchFilter !== 'all' && tx.branchId !== branchFilter) return false;
      if (userFilter !== 'all' && tx.userId !== userFilter) return false;
      if (typeFilter !== 'all' && tx.transactionType !== typeFilter) return false;
      if (!isWithinDateRange(tx.createdAt, dateFilter)) return false;

      return true;
    });

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof TransactionLog] ?? 0;
      let bVal: any = b[sortColumn as keyof TransactionLog] ?? 0;

      if (sortColumn === 'profit') {
        aVal = a.profit ?? 0;
        bVal = b.profit ?? 0;
      } else if (sortColumn === 'loss') {
        aVal = a.loss ?? 0;
        bVal = b.loss ?? 0;
      } else if (sortColumn === 'createdAt') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, searchTerm, branchFilter, userFilter, typeFilter, dateFilter, sortColumn, sortDirection, isAdmin, userBranchId]);

  const clearFilters = () => {
    setSearchTerm('');
    setBranchFilter('all');
    setUserFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = searchTerm || branchFilter !== 'all' || userFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all';

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'product_sold':
        return <TrendingUp className="h-4 w-4" />;
      case 'resold_restored':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'product_restored':
        return <TrendingDown className="h-4 w-4" />;
      case 'product_deleted':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'employee_added':
      case 'employee_updated':
      case 'employee_deleted':
        return <User className="h-4 w-4" />;
      case 'branch_created':
      case 'branch_updated':
      case 'branch_deleted':
        return <Building2 className="h-4 w-4" />;
      case 'stock_added':
      case 'stock_updated':
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleSort = (column: keyof TransactionLog | 'profit' | 'loss') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <SheetTitle>Transaction Ledger</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            Immutable real-time activity history
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

            {isAdmin ? (
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
            ) : null}

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

        {/* Sorting Bar */}
        <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-start text-sm">
          <Button variant="ghost" onClick={() => handleSort('createdAt')} className="flex items-center gap-1">
            Date <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => handleSort('profit')} className="flex items-center gap-1">
            Profit <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => handleSort('loss')} className="flex items-center gap-1">
            Loss <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Link2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No transactions found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-4">
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              filteredTransactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="bg-card border rounded-lg p-5 space-y-3 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getTransactionColor(tx.transactionType)}`}>
                        {getTransactionIcon(tx.transactionType)}
                      </div>
                      <div>
                        <p className="font-semibold text-base">
                          {transactionTypeLabels[tx.transactionType] || tx.transactionType}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="pl-11 space-y-2">
                    <p className="text-base font-medium">{tx.actionDetails}</p>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      {tx.branchName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {tx.branchName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {tx.userName}
                      </span>
                    </div>

                    {/* Financial info */}
                    {(tx.quantity || tx.costPrice || tx.sellingPrice || tx.profit || tx.loss) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-2">
                        {tx.quantity && (
                          <div>Qty: <strong>{tx.quantity}</strong></div>
                        )}
                        {tx.costPrice && (
                          <div>Cost: <strong>{formatCurrency(tx.costPrice * (tx.quantity || 1))}</strong></div>
                        )}
                        {tx.sellingPrice && (
                          <div>Sold: <strong>{formatCurrency(tx.sellingPrice * (tx.quantity || 1))}</strong></div>
                        )}
                        {tx.profit != null && tx.profit > 0 && (
                          <div className="text-green-600">
                            Profit: <strong>+{formatCurrency(tx.profit)}</strong>
                          </div>
                        )}
                        {tx.loss != null && tx.loss > 0 && (
                          <div className="text-red-600">
                            Loss: <strong>-{formatCurrency(tx.loss)}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Block footer */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-11 pt-3 border-t">
                    <Link2 className="h-3 w-3" />
                    Block #{String(filteredTransactions.length - index).padStart(6, '0')}
                    <span className="mx-2">•</span>
                    <span className="font-mono">{tx.id?.slice(-12)}...</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-green-500" />
              Immutable • Real-time • Secure
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BlockchainLedger;