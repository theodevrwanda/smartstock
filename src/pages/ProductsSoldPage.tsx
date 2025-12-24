import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Trash2, Loader2, ArrowUpDown, Undo, FileSpreadsheet, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSoldProducts,
  deleteSoldProduct,
  restoreSoldProduct,
  SoldProduct,
} from '@/functions/sold';
import { getBranches, Branch } from '@/functions/branch';
import { Skeleton } from '@/components/ui/skeleton';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/exportUtils';

const ProductsSoldPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const userBranch = typeof user?.branch === 'string' ? user.branch : null;
  const businessId = user?.businessId;

  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof SoldProduct | 'branchName'>('soldDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<SoldProduct | null>(null);

  // Restore form
  const [restoreForm, setRestoreForm] = useState({
    quantity: 1,
    comment: '',
  });

  // Load data
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [soldProds, branchList] = await Promise.all([
          getSoldProducts(businessId, user?.role || 'staff', userBranch),
          getBranches(businessId),
        ]);

        setSoldProducts(soldProds);
        setBranches(branchList);

        const map = new Map<string, string>();
        branchList.forEach(b => map.set(b.id!, b.branchName));
        setBranchMap(map);
      } catch {
        toast({ title: 'Error', description: 'Failed to load sold products', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId, user?.role, userBranch]);

  const getBranchName = (id: string | undefined | null) => branchMap.get(id || '') || 'Unknown';

  const categories = ['All', ...Array.from(new Set(soldProducts.map(p => p.category)))];

  // Filtering
  const filteredProducts = useMemo(() => {
    return soldProducts
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => minPrice === '' || p.sellingPrice >= Number(minPrice))
      .filter(p => maxPrice === '' || p.sellingPrice <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty));
  }, [soldProducts, searchTerm, categoryFilter, branchFilter, minPrice, maxPrice, minQty, maxQty]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof SoldProduct];
      let bVal: any = b[sortColumn as keyof SoldProduct];

      if (sortColumn === 'branchName') {
        aVal = getBranchName(a.branch);
        bVal = getBranchName(b.branch);
      }

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortColumn, sortDirection]);

  const handleSort = (column: keyof SoldProduct | 'branchName') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export functionality
  const soldExportColumns: ExportColumn[] = [
    { header: 'Product Name', key: 'productName', width: 25 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Model', key: 'model', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Branch', key: 'branchName', width: 20 },
    { header: 'Cost Price', key: 'costPriceFormatted', width: 15 },
    { header: 'Selling Price', key: 'sellingPriceFormatted', width: 15 },
    { header: 'Total Amount', key: 'totalAmount', width: 15 },
    { header: 'Profit/Loss', key: 'profitLoss', width: 15 },
    { header: 'Sold Date', key: 'soldDateFormatted', width: 15 },
    { header: 'Return Deadline', key: 'deadlineFormatted', width: 15 },
  ];

  const getSoldExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantity: p.quantity,
      branchName: getBranchName(p.branch),
      costPriceFormatted: `${p.costPrice.toLocaleString()} RWF`,
      sellingPriceFormatted: `${p.sellingPrice.toLocaleString()} RWF`,
      totalAmount: `${(p.quantity * p.sellingPrice).toLocaleString()} RWF`,
      profitLoss: `${calculateProfitLoss(p).toLocaleString()} RWF`,
      soldDateFormatted: new Date(p.soldDate).toLocaleDateString(),
      deadlineFormatted: p.deadline ? new Date(p.deadline).toLocaleDateString() : '-',
    }));
  };

  const handleExportExcel = () => {
    exportToExcel(getSoldExportData(), soldExportColumns, 'sold-products');
    toast({ title: 'Success', description: 'Exported to Excel' });
  };

  const handleExportPDF = () => {
    exportToPDF(getSoldExportData(), soldExportColumns, 'sold-products', `Sold Products Report - Total P/L: ${calculateTotalProfitLoss().toLocaleString()} RWF`);
    toast({ title: 'Success', description: 'Exported to PDF' });
  };

  const getPriceColor = (price: number) => {
    if (price < 100000) return 'text-blue-600 font-bold';
    if (price < 500000) return 'text-green-600 font-bold';
    if (price < 1000000) return 'text-yellow-600 font-bold';
    if (price < 2000000) return 'text-orange-600 font-bold';
    return 'text-red-600 font-bold';
  };

  const getProfitLossColor = (profit: number) => {
    if (profit > 0) return 'text-green-600 font-bold';
    if (profit < 0) return 'text-red-600 font-bold';
    return 'text-gray-600 font-bold';
  };

  const calculateProfitLoss = (p: SoldProduct) => {
    return (p.sellingPrice - p.costPrice) * p.quantity;
  };

  const calculateTotalProfitLoss = () => {
    return filteredProducts.reduce((sum, p) => sum + calculateProfitLoss(p), 0);
  };

  const isDeadlineActive = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) >= new Date();
  };

  const handleRestore = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await restoreSoldProduct(currentProduct.id, restoreForm.quantity, restoreForm.comment, userBranch, isAdmin);
      if (success) {
        setSoldProducts(prev => {
          const remaining = currentProduct.quantity - restoreForm.quantity;
          if (remaining <= 0) {
            return prev.filter(p => p.id !== currentProduct.id);
          }
          return prev.map(p => p.id === currentProduct.id ? { ...p, quantity: remaining } : p);
        });
        toast({ title: 'Success', description: `Restored ${restoreForm.quantity} unit(s)` });
        setRestoreDialogOpen(false);
        setCurrentProduct(null);
        setRestoreForm({ quantity: 1, comment: '' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await deleteSoldProduct(currentProduct.id);
      if (success) {
        setSoldProducts(prev => prev.filter(p => p.id !== currentProduct.id));
        setDeleteConfirmOpen(false);
        setCurrentProduct(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (product: SoldProduct) => {
    setCurrentProduct(product);
    setDetailsDialogOpen(true);
  };

  const openRestore = (product: SoldProduct) => {
    setCurrentProduct(product);
    setRestoreForm({ quantity: 1, comment: '' });
    setRestoreDialogOpen(true);
  };

  const openDelete = (product: SoldProduct) => {
    setCurrentProduct(product);
    setDeleteConfirmOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHelmet title="Sold Products" description="View and manage sold products" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sold Products</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'All sold products across branches' : userBranch ? `Sold products from ${getBranchName(userBranch)}` : 'No branch assigned'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Profit/Loss Summary */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Profit/Loss</h2>
          <p className={getProfitLossColor(calculateTotalProfitLoss())}>
            {calculateTotalProfitLoss().toLocaleString()} RWF
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search sold products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Min Price" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <Input type="number" placeholder="Max Price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Min Qty" value={minQty} onChange={e => setMinQty(e.target.value)} />
            <Input type="number" placeholder="Max Qty" value={maxQty} onChange={e => setMaxQty(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1">
                    Product Name
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">
                    Category
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="cursor-pointer text-center" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-1 justify-center">
                    Quantity
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {isAdmin && (
                  <TableHead className="cursor-pointer text-center" onClick={() => handleSort('branchName')}>
                    <div className="flex items-center gap-1 justify-center">
                      Branch
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                <TableHead className="cursor-pointer" onClick={() => handleSort('costPrice')}>
                  <div className="flex items-center gap-1">
                    Cost Price
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('sellingPrice')}>
                  <div className="flex items-center gap-1">
                    Selling Price
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('soldDate')}>
                  <div className="flex items-center gap-1">
                    Sold Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('deadline')}>
                  <div className="flex items-center gap-1">
                    Return Deadline
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-12 text-muted-foreground">
                    No sold products found.
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
                    <TableCell>{p.costPrice.toLocaleString()} RWF</TableCell>
                    <TableCell className={getPriceColor(p.sellingPrice)}>
                      {p.sellingPrice.toLocaleString()} RWF
                    </TableCell>
                    <TableCell>{(p.quantity * p.sellingPrice).toLocaleString()} RWF</TableCell>
                    <TableCell className={getProfitLossColor(calculateProfitLoss(p))}>
                      {calculateProfitLoss(p).toLocaleString()} RWF
                    </TableCell>
                    <TableCell>{new Date(p.soldDate).toLocaleDateString()}</TableCell>
                    <TableCell>{p.deadline ? new Date(p.deadline).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(isAdmin || p.branch === userBranch) && isDeadlineActive(p.deadline) && p.quantity > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => openRestore(p)}>
                            <Undo className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => openDelete(p)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sold Product Details</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-3">
                <p><strong>Name:</strong> {currentProduct.productName}</p>
                <p><strong>Category:</strong> {currentProduct.category}</p>
                <p><strong>Model:</strong> {currentProduct.model || '-'}</p>
                <p><strong>Quantity:</strong> {currentProduct.quantity}</p>
                <p><strong>Branch:</strong> {getBranchName(currentProduct.branch)}</p>
                <p><strong>Cost Price:</strong> {currentProduct.costPrice.toLocaleString()} RWF</p>
                <p><strong>Selling Price:</strong> {currentProduct.sellingPrice.toLocaleString()} RWF</p>
                <p><strong>Total Amount:</strong> {(currentProduct.quantity * currentProduct.sellingPrice).toLocaleString()} RWF</p>
                <p><strong>Profit/Loss:</strong> {calculateProfitLoss(currentProduct).toLocaleString()} RWF</p>
                <p><strong>Sold Date:</strong> {new Date(currentProduct.soldDate).toLocaleDateString()}</p>
                <p><strong>Return Deadline:</strong> {currentProduct.deadline ? new Date(currentProduct.deadline).toLocaleDateString() : '-'}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Sold Product</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="grid gap-4 py-4">
                <p>Restore from <strong>{currentProduct.productName}</strong> (Sold Qty: {currentProduct.quantity})</p>
                <div className="grid gap-2">
                  <Label>Quantity to Restore</Label>
                  <Input
                    type="number"
                    min="1"
                    max={currentProduct.quantity}
                    value={restoreForm.quantity}
                    onChange={e => setRestoreForm(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Reason for Restore</Label>
                  <Textarea
                    value={restoreForm.comment}
                    onChange={e => setRestoreForm(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Enter reason for restore..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRestore} disabled={actionLoading || restoreForm.comment.trim() === '' || restoreForm.quantity <= 0}>
                {actionLoading ? 'Restoring...' : 'Restore'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Sold Product?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProductsSoldPage;