// src/pages/ProductsRestoredPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Trash2, ArrowUpDown, ShoppingCart, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRestoredProducts,
  deleteRestoredProduct,
  sellRestoredProduct,
  toast,
  setRestoredTransactionContext,
} from '@/functions/restored';
import { RestoredProduct, Branch } from '@/types/interface';
import { getBranches } from '@/functions/branch';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/exportUtils';

const ProductsRestoredPage: React.FC = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const userBranch = typeof user?.branch === 'string' ? user.branch : null;
  const businessId = user?.businessId;

  const [restoredProducts, setRestoredProducts] = useState<RestoredProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>(userBranch || 'All'); // New Admin Filter
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof RestoredProduct | 'branchName'>('restoredDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<RestoredProduct | null>(null);

  // Sell form
  const [sellForm, setSellForm] = useState({
    quantity: '' as string | number,
    sellingPrice: '' as string | number,
    deadline: '',
  });

  // Set transaction context for logging re-sales
  useEffect(() => {
    if (user && branches.length > 0) {
      const branchInfo = branches.find(b => b.id === user.branch);
      setRestoredTransactionContext({
        userId: user.id || '',
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User',
        userRole: user.role || 'staff',
        businessId: user.businessId || '',
        businessName: user.businessName || '',
        branchId: user.branch || undefined,
        branchName: branchInfo?.branchName,
      });
    }
  }, [user, branches]);

  // Load data
  const loadData = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [restoredProds, branchList] = await Promise.all([
        getRestoredProducts(businessId, user?.role || 'staff', isAdmin ? (branchFilter === 'All' ? null : branchFilter) : userBranch),
        getBranches(businessId),
      ]);

      setRestoredProducts(restoredProds);
      setBranches(branchList);

      const map = new Map<string, string>();
      branchList.forEach(b => b.id && map.set(b.id, b.branchName));
      setBranchMap(map);
    } catch {
      toast.error('Failed to load restored products');
    } finally {
      setLoading(false);
    }
  }, [businessId, user?.role, userBranch, isAdmin, branchFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getBranchName = (id: string | undefined | null) => branchMap.get(id || '') || 'Unknown';

  const categories = ['All', ...Array.from(new Set(restoredProducts.map(p => p.category)))];

  // Filtering
  const filteredProducts = useMemo(() => {
    return restoredProducts
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.restoreComment || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => minPrice === '' || (p.sellingPrice || p.costPrice) >= Number(minPrice))
      .filter(p => maxPrice === '' || (p.sellingPrice || p.costPrice) <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty));
  }, [restoredProducts, searchTerm, categoryFilter, branchFilter, minPrice, maxPrice, minQty, maxQty]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof RestoredProduct];
      let bVal: any = b[sortColumn as keyof RestoredProduct];

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

  const handleSort = (column: keyof RestoredProduct | 'branchName') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export
  const restoredExportColumns: ExportColumn[] = [
    { header: 'Product Name', key: 'productName', width: 25 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Model', key: 'model', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Branch', key: 'branchName', width: 20 },
    { header: 'Cost Price', key: 'costPriceFormatted', width: 15 },
    { header: 'Selling Price', key: 'sellingPriceFormatted', width: 15 },
    { header: 'Total Amount', key: 'totalAmount', width: 15 },
    { header: 'Profit/Loss', key: 'profitLoss', width: 15 },
    { header: 'Restored Date', key: 'restoredDateFormatted', width: 15 },
    { header: 'Comment', key: 'restoreComment', width: 25 },
  ];

  const getRestoredExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantity: p.quantity,
      branchName: getBranchName(p.branch),
      costPriceFormatted: `${p.costPrice.toLocaleString()} RWF`,
      sellingPriceFormatted: `${(p.sellingPrice || p.costPrice).toLocaleString()} RWF`,
      totalAmount: `${(p.quantity * (p.sellingPrice || p.costPrice)).toLocaleString()} RWF`,
      profitLoss: `${calculateProfitLoss(p).toLocaleString()} RWF`,
      restoredDateFormatted: new Date(p.restoredDate).toLocaleDateString(),
      restoreComment: p.restoreComment || '-',
    }));
  };

  const handleExportExcel = () => {
    exportToExcel(getRestoredExportData(), restoredExportColumns, 'restored-products');
    toast.success('Exported to Excel');
  };

  const handleExportPDF = () => {
    exportToPDF(getRestoredExportData(), restoredExportColumns, 'restored-products', 'Restored Products Report');
    toast.success('Exported to PDF');
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

  const calculateProfitLoss = (p: RestoredProduct) => {
    const sellPrice = p.sellingPrice || p.costPrice;
    return (sellPrice - p.costPrice) * p.quantity;
  };

  const calculateTotalProfitLoss = () => {
    return filteredProducts.reduce((sum, p) => sum + calculateProfitLoss(p), 0);
  };

  const handleSell = async () => {
    if (!currentProduct || sellForm.quantity === '' || sellForm.sellingPrice === '') return;

    const qty = Number(sellForm.quantity);
    const price = Number(sellForm.sellingPrice);

    if (qty > currentProduct.quantity || price <= 0 || qty <= 0) {
      toast.error('Invalid quantity or price');
      return;
    }

    setActionLoading(true);
    try {
      const success = await sellRestoredProduct(
        currentProduct.id,
        qty,
        price,
        sellForm.deadline || undefined,
        userBranch
      );

      if (success) {
        toast.success(`Successfully re-sold ${qty} unit(s)`);
        setSellDialogOpen(false);
        setCurrentProduct(null);
        setSellForm({ quantity: '', sellingPrice: '', deadline: '' });
        await loadData();
      }
    } catch {
      toast.error('Sale failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await deleteRestoredProduct(currentProduct.id);
      if (success) {
        toast.success('Restored product deleted permanently');
        setDeleteConfirmOpen(false);
        setCurrentProduct(null);
        await loadData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (product: RestoredProduct) => {
    setCurrentProduct(product);
    setDetailsDialogOpen(true);
  };

  const openSell = (product: RestoredProduct) => {
    setCurrentProduct(product);
    setSellForm({ quantity: '', sellingPrice: '', deadline: '' });
    setSellDialogOpen(true);
  };

  const openDelete = (product: RestoredProduct) => {
    setCurrentProduct(product);
    setDeleteConfirmOpen(true);
  };

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
      <SEOHelmet title="Restored Products" description="View and sell restored products" />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Restored Products</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'All restored products across branches' : userBranch ? `Restored products in ${getBranchName(userBranch)}` : 'No branch assigned'}
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

        {/* Expected Profit/Loss Summary */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border">
          <h2 className="text-xl font-semibold mb-3">Expected Profit / Loss (if sold at current price)</h2>
          <p className={`text-3xl font-bold ${getProfitLossColor(calculateTotalProfitLoss())}`}>
            {calculateTotalProfitLoss().toLocaleString()} RWF
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search restored products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

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
                {branches.map(b => <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>)}
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
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('restoredDate')}>
                  <div className="flex items-center gap-1">Restored Date <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-16 text-muted-foreground">
                    No restored products found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.model || '-'}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{p.quantity}</Badge></TableCell>
                    {isAdmin && <TableCell className="text-center">{getBranchName(p.branch)}</TableCell>}
                    <TableCell>{p.costPrice.toLocaleString()} RWF</TableCell>
                    <TableCell className={getPriceColor(p.sellingPrice || p.costPrice)}>
                      {(p.sellingPrice || p.costPrice).toLocaleString()} RWF
                    </TableCell>
                    <TableCell className="font-semibold">
                      {(p.quantity * (p.sellingPrice || p.costPrice)).toLocaleString()} RWF
                    </TableCell>
                    <TableCell className={getProfitLossColor(calculateProfitLoss(p))}>
                      {calculateProfitLoss(p).toLocaleString()} RWF
                    </TableCell>
                    <TableCell>{new Date(p.restoredDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate" title={p.restoreComment || undefined}>
                      {p.restoreComment || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {p.quantity > 0 && (!userBranch || p.branch === userBranch) && (
                          <Button size="sm" variant="ghost" onClick={() => openSell(p)}>
                            <ShoppingCart className="h-4 w-4 text-green-600" />
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Restored Product Details</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{currentProduct.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{currentProduct.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{currentProduct.model || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-medium">{currentProduct.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-medium">{getBranchName(currentProduct.branch)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Price</p>
                    <p className="font-medium">{currentProduct.costPrice.toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="font-medium">{(currentProduct.sellingPrice || currentProduct.costPrice).toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="font-medium text-lg">
                      {(currentProduct.quantity * (currentProduct.sellingPrice || currentProduct.costPrice)).toLocaleString()} RWF
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Profit/Loss</p>
                    <p className={`font-bold text-lg ${getProfitLossColor(calculateProfitLoss(currentProduct))}`}>
                      {calculateProfitLoss(currentProduct).toLocaleString()} RWF
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restored Date</p>
                    <p className="font-medium">{new Date(currentProduct.restoredDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {currentProduct.restoreComment && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Restore Reason</p>
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="whitespace-pre-wrap">{currentProduct.restoreComment}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sell Dialog */}
        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sell Restored Product</DialogTitle>
              <DialogDescription>
                {currentProduct?.productName} {currentProduct?.model && `(${currentProduct.model})`}
                <br />
                Available in restored stock: {currentProduct?.quantity} units
              </DialogDescription>
            </DialogHeader>

            {currentProduct && (
              <div className="space-y-6 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Quantity to Sell *</Label>
                    <Input
                      type="number"
                      min="1"
                      max={currentProduct.quantity}
                      placeholder="How many units?"
                      value={sellForm.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = val === '' ? '' : Number(val);
                        if (num !== '' && (num < 1 || num > currentProduct.quantity)) return;
                        setSellForm(s => ({ ...s, quantity: num }));
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Selling Price per Unit (RWF) *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter selling price"
                      value={sellForm.sellingPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSellForm(s => ({ ...s, sellingPrice: val === '' ? '' : Number(val) }));
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Return Deadline (optional)</Label>
                    <Input
                      type="date"
                      value={sellForm.deadline}
                      onChange={(e) => setSellForm(s => ({ ...s, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Warning for invalid quantity */}
                {sellForm.quantity !== '' && Number(sellForm.quantity) > currentProduct.quantity && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Quantity exceeds available restored stock ({currentProduct.quantity} units).
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sale Summary */}
                {sellForm.quantity !== '' && sellForm.sellingPrice !== '' && Number(sellForm.quantity) > 0 && Number(sellForm.sellingPrice) > 0 && Number(sellForm.quantity) <= currentProduct.quantity && (
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between text-lg">
                        <span>Total Revenue:</span>
                        <span className="font-bold">
                          {(Number(sellForm.quantity) * Number(sellForm.sellingPrice)).toLocaleString()} RWF
                        </span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span>Cost of Goods:</span>
                        <span>
                          {(Number(sellForm.quantity) * currentProduct.costPrice).toLocaleString()} RWF
                        </span>
                      </div>
                      <div className="flex justify-between text-xl font-bold pt-3 border-t">
                        <span>Profit / Loss:</span>
                        <span className={
                          Number(sellForm.sellingPrice) >= currentProduct.costPrice
                            ? 'text-green-600'
                            : 'text-red-600'
                        }>
                          {(
                            (Number(sellForm.sellingPrice) - currentProduct.costPrice) * Number(sellForm.quantity)
                          ).toLocaleString()} RWF
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSellDialogOpen(false);
                  setSellForm({ quantity: '', sellingPrice: '', deadline: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSell}
                disabled={
                  actionLoading ||
                  sellForm.quantity === '' ||
                  sellForm.sellingPrice === '' ||
                  Number(sellForm.quantity) <= 0 ||
                  Number(sellForm.sellingPrice) <= 0 ||
                  Number(sellForm.quantity) > currentProduct?.quantity
                }
              >
                {actionLoading ? 'Processing...' : 'Confirm Sale'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Restored Product?</DialogTitle>
              <DialogDescription>
                This action is permanent and cannot be undone. The restored product record will be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProductsRestoredPage;