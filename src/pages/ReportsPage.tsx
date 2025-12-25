import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getReportData, ProductReport, ReportSummary } from '@/functions/report';
import { getBranches, Branch } from '@/functions/branch';
import { Skeleton } from '@/components/ui/skeleton';

const ReportsPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const userBranch = user?.branch; // Can be null
  const businessId = user?.businessId;

  const [products, setProducts] = useState<ProductReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'store' | 'sold' | 'restored' | 'deleted'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof ProductReport | 'branchName'>('addedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load data
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        // This now correctly respects branch assignment
        const { products: prods, summary: sum } = await getReportData(
          businessId,
          user?.role || 'staff',
          userBranch  // null → staff sees nothing
        );

        setProducts(prods);
        setSummary(sum);

        // Load branches only for admin
        if (isAdmin) {
          const branchList = await getBranches(businessId);
          setBranches(branchList);

          const map = new Map<string, string>();
          branchList.forEach(b => b.id && map.set(b.id, b.branchName));
          setBranchMap(map);
        } else if (userBranch) {
          // Staff: show only their branch name
          const staffBranchName = user.branchName || 'Assigned Branch';
          const map = new Map<string, string>();
          map.set(userBranch, staffBranchName);
          setBranchMap(map);
        }
        // If staff has no branch → branchMap empty → shows "Unknown"
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId, user?.role, userBranch, isAdmin, toast]);

  const getBranchName = (id: string) => branchMap.get(id) || 'Unknown Branch';

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  // Filtering
  const filteredProducts = useMemo(() => {
    let filtered = products
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.restoreComment || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => statusFilter === 'all' || p.status === statusFilter)
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter);

    // Only admin can filter by branch
    if (isAdmin && branchFilter !== 'All') {
      filtered = filtered.filter(p => p.branch === branchFilter);
    }

    return filtered;
  }, [products, searchTerm, statusFilter, categoryFilter, branchFilter, isAdmin]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal: any = sortColumn === 'branchName' ? getBranchName(a.branch) : a[sortColumn as keyof ProductReport];
      let bVal: any = sortColumn === 'branchName' ? getBranchName(b.branch) : b[sortColumn as keyof ProductReport];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortColumn, sortDirection]);

  const handleSort = (column: keyof ProductReport | 'branchName') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getPriceColor = (price: number) => {
    if (price < 100000) return 'text-blue-600 font-bold';
    if (price < 500000) return 'text-green-600 font-bold';
    if (price < 1000000) return 'text-yellow-600 font-bold';
    if (price < 2000000) return 'text-orange-600 font-bold';
    return 'text-red-600 font-bold';
  };

  const getProfitColor = (profit: number | null) => {
    if (!profit || profit === 0) return 'text-gray-600';
    return profit > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No report data available.
      </div>
    );
  }

  return (
    <>
      <SEOHelmet title="Business Report" description="Complete inventory report with profit/loss" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Business Report</h1>
            <p className="text-muted-foreground">
              Complete overview of store, sold, restored, and deleted products
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">In Store</p>
            <p className="text-2xl font-bold text-blue-600">{summary.storeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Sold</p>
            <p className="text-2xl font-bold text-green-600">{summary.soldCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Restored</p>
            <p className="text-2xl font-bold text-purple-600">{summary.restoredCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Deleted</p>
            <p className="text-2xl font-bold text-red-600">{summary.deletedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Store Value</p>
            <p className="text-2xl font-bold">{summary.totalStoreValue.toLocaleString()} RWF</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Gross Profit</p>
            <p className="text-2xl font-bold text-green-600">{summary.grossProfit.toLocaleString()} RWF</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Total Loss</p>
            <p className="text-2xl font-bold text-red-600">{summary.totalLoss.toLocaleString()} RWF</p>
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg">
            <p className="text-lg font-semibold">Net Profit</p>
            <p className="text-4xl font-black mt-2">
              {summary.netProfit.toLocaleString()} RWF
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="store">In Store</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="restored">Restored</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1">Product Name <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Category <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-1 justify-center">Quantity <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                {isAdmin && (
                  <TableHead className="text-center cursor-pointer" onClick={() => handleSort('branchName')}>
                    <div className="flex items-center gap-1 justify-center">Branch <ArrowUpDown className="h-4 w-4" /></div>
                  </TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('addedDate')}>
                  <div className="flex items-center gap-1">Added Date <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Sold/Deleted Date</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-12 text-muted-foreground">
                    {!isAdmin && !userBranch ? (
                      <div>
                        <p className="font-semibold">You are not assigned to any branch.</p>
                        <p className="text-sm mt-2">Contact your admin to get access.</p>
                      </div>
                    ) : (
                      'No products found matching your filters.'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.model || '-'}</TableCell>
                    <TableCell className="text-center">{p.quantity}</TableCell>
                    {isAdmin && <TableCell className="text-center">{getBranchName(p.branch)}</TableCell>}
                    <TableCell>
                      <Badge variant={
                        p.status === 'store' ? 'default' :
                        p.status === 'sold' ? 'secondary' :
                        p.status === 'restored' ? 'outline' :
                        'destructive'
                      }>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className={getPriceColor(p.costPrice)}>
                      {p.costPrice.toLocaleString()} RWF
                    </TableCell>
                    <TableCell>
                      {p.sellingPrice !== null
                        ? <span className={getPriceColor(p.sellingPrice)}>{p.sellingPrice.toLocaleString()} RWF</span>
                        : '-'}
                    </TableCell>
                    <TableCell className={getProfitColor(p.profitLoss)}>
                      {p.profitLoss !== null
                        ? `${p.profitLoss >= 0 ? '+' : ''}${p.profitLoss.toLocaleString()} RWF`
                        : '-'}
                    </TableCell>
                    <TableCell>{new Date(p.addedDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {p.soldDate ? new Date(p.soldDate).toLocaleDateString() :
                       p.deletedDate ? new Date(p.deletedDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{p.restoreComment || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;