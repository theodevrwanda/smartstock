import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, Eye, Edit, Trash2, ShoppingCart, Loader2, Download, CheckCircle, XCircle, ArrowUpDown } from 'lucide-react';
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
  getProducts,
  addOrUpdateProduct,
  updateProduct,
  sellProduct,
  deleteProduct,
  Product,
} from '@/functions/store';
import { getBranches, Branch } from '@/functions/branch';
import { Skeleton } from '@/components/ui/skeleton';

const ProductsStorePage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const userBranch = user?.branch || null;
  const businessId = user?.businessId;

  const [products, setProducts] = useState<Product[]>([]);
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
  const [confirmFilter, setConfirmFilter] = useState<string>('All');

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof Product | 'branchName'>('productName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Form & current data
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    productName: '',
    category: '',
    model: '',
    costPrice: 0,
    quantity: 1,
  });

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
        const [prods, branchList] = await Promise.all([
          getProducts(businessId, user?.role || 'staff', userBranch),
          getBranches(businessId),
        ]);

        setProducts(prods);
        setBranches(branchList);

        const map = new Map<string, string>();
        branchList.forEach(b => map.set(b.id!, b.branchName));
        setBranchMap(map);
      } catch {
        toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId, user?.role, userBranch]);

  const getBranchName = (id: string) => branchMap.get(id) || 'Unknown';

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering
  const filteredProducts = useMemo(() => {
    return products
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => minPrice === '' || p.costPrice >= Number(minPrice))
      .filter(p => maxPrice === '' || p.costPrice <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty))
      .filter(p => confirmFilter === 'All' || (confirmFilter === 'Confirmed' ? p.confirm : !p.confirm));
  }, [products, searchTerm, categoryFilter, branchFilter, minPrice, maxPrice, minQty, maxQty, confirmFilter]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Product];
      let bVal: any = b[sortColumn as keyof Product];

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

  const handleSort = (column: keyof Product | 'branchName') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Status based on quantity
  const getStatusBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">OutStock</Badge>;
    }
    if (quantity <= 5) {
      return <Badge variant="secondary">LowStock</Badge>;
    }
    if (quantity <= 20) {
      return <Badge variant="default">InStock</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">ExcellentStock</Badge>;
  };

  // Color for cost price
  const getPriceColor = (price: number) => {
    if (price < 100000) return 'text-blue-600 font-bold';
    if (price < 500000) return 'text-green-600 font-bold';
    if (price < 1000000) return 'text-yellow-600 font-bold';
    if (price < 2000000) return 'text-orange-600 font-bold';
    return 'text-red-600 font-bold';
  };

  const handleAddProduct = async () => {
    if (!userBranch) {
      toast({ title: 'Error', description: 'You are not assigned to any branch', variant: 'destructive' });
      return;
    }

    if (!newProduct.productName || !newProduct.category || newProduct.costPrice <= 0 || newProduct.quantity <= 0) {
      toast({ title: 'Error', description: 'Please fill all required fields correctly', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    try {
      const result = await addOrUpdateProduct({
        productName: newProduct.productName,
        category: newProduct.category,
        model: newProduct.model || undefined,
        costPrice: newProduct.costPrice,
        quantity: newProduct.quantity,
        branch: userBranch,
        businessId: businessId!,
        confirm: isAdmin,
      });

      if (result) {
        setProducts(prev => {
          const existing = prev.find(p => p.id === result.id);
          if (existing) {
            return prev.map(p => p.id === result.id ? result : p);
          }
          return [...prev, result];
        });
        toast({ title: 'Success', description: 'Product added/updated in store' });
        setAddDialogOpen(false);
        setNewProduct({ productName: '', category: '', model: '', costPrice: 0, quantity: 1 });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await updateProduct(currentProduct.id, currentProduct);
      if (success) {
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? currentProduct : p));
        toast({ title: 'Success', description: 'Product updated' });
        setEditDialogOpen(false);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSellProduct = async () => {
    if (!currentProduct || sellForm.quantity > currentProduct.quantity || sellForm.sellingPrice <= 0) {
      toast({ title: 'Error', description: 'Invalid quantity or price', variant: 'destructive' });
      return;
    }

    setActionLoading(true);
    try {
      const success = await sellProduct(currentProduct.id, sellForm.quantity, sellForm.sellingPrice, sellForm.deadline, userBranch);
      if (success) {
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, quantity: p.quantity - sellForm.quantity } : p));
        toast({ title: 'Success', description: `Sold ${sellForm.quantity} unit(s)` });
        setSellDialogOpen(false);
        setSellForm({ quantity: 1, sellingPrice: 0, deadline: '' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setActionLoading(true);
    try {
      await deleteProduct(productToDelete);
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      toast({ title: 'Success', description: 'Product marked as deleted' });
      setDeleteConfirmOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleConfirm = async (id: string, currentConfirm: boolean) => {
    if (!isAdmin) return;
    setActionLoading(true);
    try {
      const success = await updateProduct(id, { confirm: !currentConfirm });
      if (success) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, confirm: !currentConfirm } : p));
        toast({ title: 'Success', description: `Product ${!currentConfirm ? 'confirmed' : 'unconfirmed'}` });
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Skeleton className="h-10 w-full" />
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
      <SEOHelmet title="Store Products" description="Manage store inventory" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Store Products</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'All products across branches' : userBranch ? `Products in ${getBranchName(userBranch)}` : 'You are not assigned to any branch'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} disabled={!userBranch}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product {!userBranch && '(No Branch)'}
            </Button>
          </div>
        </div>

        {/* Professional Filter Bar at Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border">
          {/* Search */}
          <div className="relative col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search by name, category, model..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category */}
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

          {/* Branch - Admin Only */}
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

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
            />
          </div>

          {/* Quantity Range */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min Qty"
              value={minQty}
              onChange={e => setMinQty(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Max Qty"
              value={maxQty}
              onChange={e => setMaxQty(e.target.value)}
            />
          </div>

          {/* Confirmation Filter - Admin Only */}
          {isAdmin && (
            <Select value={confirmFilter} onValueChange={setConfirmFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Confirmation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Confirmed">Confirmed Only</SelectItem>
                <SelectItem value="Unconfirmed">Unconfirmed Only</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table className="w-full">
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
                <TableHead className="cursor-pointer" onClick={() => handleSort('addedDate')}>
                  <div className="flex items-center gap-1">
                    Added At
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-muted-foreground">
                    No products found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.model || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">
                        {p.quantity}
                      </Badge>
                    </TableCell>
                    {isAdmin && <TableCell className="text-center">{getBranchName(p.branch)}</TableCell>}
                    <TableCell className={getPriceColor(p.costPrice)}>
                      {p.costPrice.toLocaleString()} RWF
                    </TableCell>
                    <TableCell>{new Date(p.addedDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(p.quantity)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleConfirm(p.id, p.confirm)}
                          disabled={!isAdmin || actionLoading}
                        >
                          {p.confirm ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setCurrentProduct(p); setDetailsDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => { setCurrentProduct(p); setEditDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {p.quantity > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => { setCurrentProduct(p); setSellDialogOpen(true); }}>
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => { setProductToDelete(p.id); setDeleteConfirmOpen(true); }}>
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

        {/* Add Product Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                {isAdmin ? 'Product will be confirmed automatically' : 'Product will need admin confirmation'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Product Name *</Label>
                <Input
                  value={newProduct.productName}
                  onChange={e => setNewProduct(prev => ({ ...prev, productName: e.target.value }))}
                  placeholder="Enter product name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Input
                  value={newProduct.category}
                  onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Enter category"
                />
              </div>
              <div className="grid gap-2">
                <Label>Model (optional)</Label>
                <Input
                  value={newProduct.model}
                  onChange={e => setNewProduct(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Enter model"
                />
              </div>
              <div className="grid gap-2">
                <Label>Cost Price (RWF) *</Label>
                <Input
                  type="number"
                  value={newProduct.costPrice}
                  onChange={e => setNewProduct(prev => ({ ...prev, costPrice: Number(e.target.value) || 0 }))}
                  placeholder="Enter cost price"
                />
              </div>
              <div className="grid gap-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={newProduct.quantity}
                  onChange={e => setNewProduct(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                  placeholder="Enter product quantity"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct} disabled={actionLoading}>
                {actionLoading ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Product Name</Label>
                  <Input
                    value={currentProduct.productName}
                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, productName: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Input
                    value={currentProduct.category}
                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, category: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Model</Label>
                  <Input
                    value={currentProduct.model || ''}
                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, model: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cost Price</Label>
                  <Input
                    type="number"
                    value={currentProduct.costPrice}
                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, costPrice: Number(e.target.value) || 0 } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Branch</Label>
                  <Select
                    value={currentProduct.branch}
                    onValueChange={v => setCurrentProduct(prev => prev ? { ...prev, branch: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id!}>
                          {b.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProduct} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sell Product Dialog */}
        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sell Product</DialogTitle>
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
              <Button variant="outline" onClick={() => setSellDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSellProduct} disabled={actionLoading}>
                {actionLoading ? 'Selling...' : 'Sell'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-2 py-4">
                <p><strong>Name:</strong> {currentProduct.productName}</p>
                <p><strong>Category:</strong> {currentProduct.category}</p>
                <p><strong>Model:</strong> {currentProduct.model || '-'}</p>
                <p><strong>Quantity:</strong> {currentProduct.quantity}</p>
                <p><strong>Branch:</strong> {getBranchName(currentProduct.branch)}</p>
                <p><strong>Cost Price:</strong> {currentProduct.costPrice.toLocaleString()} RWF</p>
                <p><strong>Status:</strong> {getStatusBadge(currentProduct.quantity)}</p>
                <p><strong>Confirmed:</strong> {currentProduct.confirm ? 'Yes' : 'No'}</p>
                <p><strong>Added At:</strong> {new Date(currentProduct.addedDate).toLocaleDateString()}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The product will be marked as deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteProduct} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProductsStorePage;