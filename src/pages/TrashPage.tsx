// src/pages/ProductsDeletedPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Trash2, ArrowUpDown, Undo, FileSpreadsheet, FileText, Package } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDeletedProducts,
  restoreDeletedProduct,
  bulkRestoreDeletedProducts,
  permanentlyDeleteProduct,
  DeletedProduct,
} from '@/functions/deleted';
import { getBranches, Branch } from '@/functions/branch';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/exportUtils';

const ProductsDeletedPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const userBranch = typeof user?.branch === 'string' ? user.branch : null;
  const businessId = user?.businessId;

  const [deletedProducts, setDeletedProducts] = useState<DeletedProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Selection
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof DeletedProduct | 'branchName'>('deletedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [bulkRestoreConfirmOpen, setBulkRestoreConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<DeletedProduct | null>(null);

  // Load data
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [deletedProds, branchList] = await Promise.all([
          getDeletedProducts(businessId, user?.role || 'staff', userBranch),
          getBranches(businessId),
        ]);

        setDeletedProducts(deletedProds);
        setBranches(branchList);

        const map = new Map<string, string>();
        branchList.forEach(b => map.set(b.id!, b.branchName));
        setBranchMap(map);
      } catch {
        toast({ title: 'Error', description: 'Failed to load deleted products', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId, user?.role, userBranch]);

  const getBranchName = (id: string | undefined | null) => branchMap.get(id || '') || 'Unknown';

  const categories = ['All', ...Array.from(new Set(deletedProducts.map(p => p.category)))];

  // Filtering
  const filteredProducts = useMemo(() => {
    return deletedProducts
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.restoreComment || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => branchFilter === 'All' || p.branch === branchFilter);
  }, [deletedProducts, searchTerm, categoryFilter, branchFilter]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof DeletedProduct];
      let bVal: any = b[sortColumn as keyof DeletedProduct];

      if (sortColumn === 'branchName') {
        aVal = getBranchName(a.branch);
        bVal = getBranchName(b.branch);
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortColumn, sortDirection]);

  const handleSort = (column: keyof DeletedProduct | 'branchName') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export functionality
  const deletedExportColumns: ExportColumn[] = [
    { header: 'Product Name', key: 'productName', width: 25 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Model', key: 'model', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Branch', key: 'branchName', width: 20 },
    { header: 'Cost Price', key: 'costPriceFormatted', width: 15 },
    { header: 'Total Loss', key: 'totalLoss', width: 15 },
    { header: 'Deleted Date', key: 'deletedDateFormatted', width: 15 },
    { header: 'Reason', key: 'restoreComment', width: 25 },
  ];

  const getDeletedExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantity: p.quantity,
      branchName: getBranchName(p.branch),
      costPriceFormatted: `${p.costPrice.toLocaleString()} RWF`,
      totalLoss: `${(p.costPrice * p.quantity).toLocaleString()} RWF`,
      deletedDateFormatted: new Date(p.deletedDate).toLocaleDateString(),
      restoreComment: p.restoreComment || '-',
    }));
  };

  const handleExportExcel = () => {
    exportToExcel(getDeletedExportData(), deletedExportColumns, 'deleted-products');
    toast({ title: 'Success', description: 'Exported to Excel' });
  };

  const handleExportPDF = () => {
    exportToPDF(getDeletedExportData(), deletedExportColumns, 'deleted-products', 'Deleted Products Report (Trash)');
    toast({ title: 'Success', description: 'Exported to PDF' });
  };

  const getPriceColor = (price: number) => {
    if (price < 100000) return 'text-blue-600 font-bold';
    if (price < 500000) return 'text-green-600 font-bold';
    if (price < 1000000) return 'text-yellow-600 font-bold';
    if (price < 2000000) return 'text-orange-600 font-bold';
    return 'text-red-600 font-bold';
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedProducts.length === sortedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(sortedProducts.map(p => p.id));
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSingleRestore = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await restoreDeletedProduct(currentProduct.id, userBranch, isAdmin);
      if (success) {
        setDeletedProducts(prev => prev.filter(p => p.id !== currentProduct.id));
        setRestoreConfirmOpen(false);
        setCurrentProduct(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedProducts.length === 0) return;
    setActionLoading(true);
    try {
      const { successCount } = await bulkRestoreDeletedProducts(selectedProducts, userBranch, isAdmin);
      if (successCount > 0) {
        setDeletedProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
        setSelectedProducts([]);
        setBulkRestoreConfirmOpen(false);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await permanentlyDeleteProduct(currentProduct.id);
      if (success) {
        setDeletedProducts(prev => prev.filter(p => p.id !== currentProduct.id));
        setDeleteConfirmOpen(false);
        setCurrentProduct(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (product: DeletedProduct) => {
    setCurrentProduct(product);
    setDetailsDialogOpen(true);
  };

  const openSingleRestore = (product: DeletedProduct) => {
    setCurrentProduct(product);
    setRestoreConfirmOpen(true);
  };

  const openPermanentDelete = (product: DeletedProduct) => {
    setCurrentProduct(product);
    setDeleteConfirmOpen(true);
  };

  // NEW: Consistent clean loading state (same as every other page)
  // Consistent clean loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0f172a] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <SEOHelmet title="Deleted Products (Trash)" description="View and manage deleted products" />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Deleted Products (Trash)</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'All deleted products across branches' : userBranch ? `Deleted products from ${getBranchName(userBranch)}` : 'No branch assigned'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setBulkRestoreConfirmOpen(true)}
              disabled={selectedProducts.length === 0 || actionLoading}
            >
              <Undo className="mr-2 h-4 w-4" />
              Restore Selected ({selectedProducts.length})
            </Button>
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
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search deleted products..."
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={selectedProducts.length === sortedProducts.length && sortedProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
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
                <TableHead className="cursor-pointer text-center" onClick={() => handleSort('branchName')}>
                  <div className="flex items-center gap-1 justify-center">
                    Branch
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('costPrice')}>
                  <div className="flex items-center gap-1">
                    Cost Price
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('deletedDate')}>
                  <div className="flex items-center gap-1">
                    Deleted Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 9} className="h-64 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Package className="h-12 w-12 opacity-20" />
                      <p className="text-lg font-medium">No deleted products found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.includes(p.id)}
                        onCheckedChange={() => handleSelectProduct(p.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.model || '-'}</TableCell>
                    <TableCell className="text-center font-bold">
                      {p.quantity} <span className="text-[10px] text-muted-foreground uppercase">{p.unit || 'pcs'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 text-[10px]">
                        {getBranchName(p.branch)}
                      </Badge>
                    </TableCell>
                    <TableCell className={getPriceColor(p.costPrice)}>
                      {p.costPrice.toLocaleString()} RWF
                    </TableCell>
                    <TableCell>{new Date(p.deletedDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.restoreComment || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(isAdmin || p.branch === userBranch) && (
                          <Button size="sm" variant="ghost" onClick={() => openSingleRestore(p)}>
                            <Undo className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => openPermanentDelete(p)}>
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
              <DialogTitle>Deleted Product Details</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-3">
                <p><strong>Name:</strong> {currentProduct.productName}</p>
                <p><strong>Category:</strong> {currentProduct.category}</p>
                <p><strong>Model:</strong> {currentProduct.model || '-'}</p>
                <p><strong>Quantity:</strong> {currentProduct.quantity}</p>
                <p><strong>Branch:</strong> {getBranchName(currentProduct.branch)}</p>
                <p><strong>Cost Price:</strong> {currentProduct.costPrice.toLocaleString()} RWF</p>
                <p><strong>Selling Price:</strong> {(currentProduct.sellingPrice || currentProduct.costPrice).toLocaleString()} RWF</p>
                <p><strong>Deleted Date:</strong> {new Date(currentProduct.deletedDate).toLocaleDateString()}</p>
                {currentProduct.restoreComment && (
                  <div>
                    <p><strong>Delete Reason:</strong></p>
                    <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded">{currentProduct.restoreComment}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Single Restore Confirm */}
        <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Product?</DialogTitle>
              <DialogDescription>
                Restore "{currentProduct?.productName}" back to store inventory?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoreConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleSingleRestore} disabled={actionLoading}>
                {actionLoading ? 'Restoring...' : 'Restore'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Restore Confirm */}
        <Dialog open={bulkRestoreConfirmOpen} onOpenChange={setBulkRestoreConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Selected Products?</DialogTitle>
              <DialogDescription>
                Restore {selectedProducts.length} selected product(s) back to store inventory?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkRestoreConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkRestore} disabled={actionLoading}>
                {actionLoading ? 'Restoring...' : 'Restore Selected'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permanent Delete Confirm */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Permanently Delete Product?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. "{currentProduct?.productName}" will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handlePermanentDelete} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProductsDeletedPage;