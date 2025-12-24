import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Eye, Trash2, Loader2, ArrowUpDown, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRestoredProducts,
  deleteRestoredProduct,
  sellRestoredProduct,
  RestoredProduct,
} from '@/functions/restored';
import { getBranches, Branch } from '@/functions/branch';
import { Skeleton } from '@/components/ui/skeleton';

const ProductsRestoredPage: React.FC = () => {
  const { toast } = useToast();
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
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
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
    quantity: 1,
    sellingPrice: 0,
    deadline: '',
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
        const [restoredProds, branchList] = await Promise.all([
          getRestoredProducts(businessId, user?.role || 'staff', userBranch),
          getBranches(businessId),
        ]);

        setRestoredProducts(restoredProds);
        setBranches(branchList);

        const map = new Map<string, string>();
        branchList.forEach(b => map.set(b.id!, b.branchName));
        setBranchMap(map);
      } catch {
        toast({ title: 'Error', description: 'Failed to load restored products', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId, user?.role, userBranch]);

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
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await sellRestoredProduct(
        currentProduct.id,
        sellForm.quantity,
        sellForm.sellingPrice,
        sellForm.deadline || undefined,
        userBranch
      );
      if (success) {
        setRestoredProducts(prev => {
          const remaining = currentProduct.quantity - sellForm.quantity;
          if (remaining <= 0) {
            return prev.filter(p => p.id !== currentProduct.id);
          }
          return prev.map(p => p.id === currentProduct.id ? { ...p, quantity: remaining } : p);
        });
        toast({ title: 'Success', description: `Sold ${sellForm.quantity} unit(s)` });
        setSellDialogOpen(false);
        setCurrentProduct(null);
        setSellForm({ quantity: 1, sellingPrice: 0, deadline: '' });
      }
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
        setRestoredProducts(prev => prev.filter(p => p.id !== currentProduct.id));
        setDeleteConfirmOpen(false);
        setCurrentProduct(null);
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
    setSellForm({ quantity: 1, sellingPrice: product.costPrice * 1.2, deadline: '' });
    setSellDialogOpen(true);
  };

  const openDelete = (product: RestoredProduct) => {
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
      <SEOHelmet title="Restored Products" description="View and sell restored products" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Restored Products</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'All restored products across branches' : userBranch ? `Restored products in ${getBranchName(userBranch)}` : 'No branch assigned'}
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Profit/Loss Summary */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Expected Profit/Loss (if sold at current price)</h2>
          <p className={getProfitLossColor(calculateTotalProfitLoss())}>
            {calculateTotalProfitLoss().toLocaleString()} RWF
          </p>
        </div>

        {/* Professional Filters */}
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
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('restoredDate')}>
                  <div className="flex items-center gap-1">
                    Restored Date
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
                  <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-12 text-muted-foreground">
                    No restored products found.
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
                    <TableCell className={getPriceColor(p.sellingPrice || p.costPrice)}>
                      {(p.sellingPrice || p.costPrice).toLocaleString()} RWF
                    </TableCell>
                    <TableCell>{(p.quantity * (p.sellingPrice || p.costPrice)).toLocaleString()} RWF</TableCell>
                    <TableCell className={getProfitLossColor(calculateProfitLoss(p))}>
                      {calculateProfitLoss(p).toLocaleString()} RWF
                    </TableCell>
                    <TableCell>{new Date(p.restoredDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.restoreComment || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {p.quantity > 0 && p.branch === userBranch && (
                          <Button size="sm" variant="ghost" onClick={() => openSell(p)}>
                            <ShoppingCart className="h-4 w-4" />
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
              <DialogTitle>Restored Product Details</DialogTitle>
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
                <p><strong>Total Amount:</strong> {(currentProduct.quantity * (currentProduct.sellingPrice || currentProduct.costPrice)).toLocaleString()} RWF</p>
                <p><strong>Profit/Loss:</strong> {calculateProfitLoss(currentProduct).toLocaleString()} RWF</p>
                <p><strong>Restored Date:</strong> {new Date(currentProduct.restoredDate).toLocaleDateString()}</p>
                {currentProduct.restoreComment && (
                  <div>
                    <p><strong>Restore Reason:</strong></p>
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

        {/* Sell Dialog */}
        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sell Restored Product</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-4 py-4">
                <p className="font-medium">{currentProduct.productName}</p>
                <p className="text-sm text-muted-foreground">Available: {currentProduct.quantity}</p>
                <div className="grid gap-2">
                  <Label>Quantity to Sell</Label>
                  <Input
                    type="number"
                    min="1"
                    max={currentProduct.quantity}
                    value={sellForm.quantity}
                    onChange={e => setSellForm(s => ({ ...s, quantity: Number(e.target.value) || 1 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Selling Price (RWF)</Label>
                  <Input
                    type="number"
                    value={sellForm.sellingPrice}
                    onChange={e => setSellForm(s => ({ ...s, sellingPrice: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Return Deadline (optional)</Label>
                  <Input
                    type="date"
                    value={sellForm.deadline}
                    onChange={e => setSellForm(s => ({ ...s, deadline: e.target.value }))}
                  />
                </div>
                {sellForm.sellingPrice > 0 && sellForm.quantity > 0 && (
                  <p className="font-bold">
                    Total: {(sellForm.quantity * sellForm.sellingPrice).toLocaleString()} RWF
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSellDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSell} disabled={actionLoading}>
                {actionLoading ? 'Selling...' : 'Sell'}
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

export default ProductsRestoredPage;