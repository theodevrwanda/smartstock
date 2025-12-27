// src/pages/ProductsStorePage.tsx (or src/components/ProductsStorePage.tsx)

import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, Eye, Edit, Trash2, ShoppingCart, Download, FileSpreadsheet, FileText, ArrowUpDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  getProducts,
  addOrUpdateProduct,
  updateProduct,
  sellProduct,
  deleteProduct,
  syncOfflineOperations,
  Product,
  toast,
  setTransactionContext,
} from '@/functions/store';
import { getBranches, Branch } from '@/functions/branch';
import { Skeleton } from '@/components/ui/skeleton';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/exportUtils';

const ProductsStorePage: React.FC = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const userBranch = typeof user?.branch === 'string' ? user.branch : null;
  const businessId = user?.businessId;

  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
  const [confirmSaleDialogOpen, setConfirmSaleDialogOpen] = useState(false);
  const [confirmProductDialogOpen, setConfirmProductDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Current product states
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productToConfirm, setProductToConfirm] = useState<{ id: string; current: boolean } | null>(null);

  // Add product form
  const [newProduct, setNewProduct] = useState({
    productName: '',
    category: '',
    model: '',
    costPrice: '' as string | number,
    quantity: '' as string | number,
  });

  // Sell form
  const [sellForm, setSellForm] = useState({
    quantity: '' as string | number,
    sellingPrice: '' as string | number,
    deadline: '',
  });

  // Set transaction logging context when user and branches are available
  useEffect(() => {
    if (user && branches.length > 0) {
      const branchInfo = branches.find(b => b.id === user.branch);
      setTransactionContext({
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

  // Online/Offline Detection & Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back Online – Syncing your offline changes...');
      syncOfflineOperations().then(() => {
        if (businessId) {
          getProducts(businessId, user?.role || 'staff', userBranch).then(setProducts);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are Offline – Working locally. Changes will sync when you reconnect.');
    };

    if (!navigator.onLine) handleOffline();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [businessId, user?.role, userBranch]);

  // Load Products & Branches
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
      } catch (err) {
        toast.warning(isOnline ? 'Failed to load latest data' : 'Using cached data (offline)');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId, user?.role, userBranch, isOnline]);

  const getBranchName = (id: string | undefined | null) => branchMap.get(id || '') || 'Unknown';

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

      return (aVal < bVal ? -1 : 1) * (sortDirection === 'asc' ? 1 : -1);
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

  // Export
  const storeExportColumns: ExportColumn[] = [
    { header: 'Product Name', key: 'productName', width: 25 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Model', key: 'model', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Branch', key: 'branchName', width: 20 },
    { header: 'Cost Price', key: 'costPriceFormatted', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Confirmed', key: 'confirmed', width: 10 },
    { header: 'Added Date', key: 'addedDateFormatted', width: 15 },
  ];

  const getExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantity: p.quantity,
      branchName: getBranchName(p.branch),
      costPriceFormatted: `${p.costPrice.toLocaleString()} RWF`,
      status: p.quantity === 0 ? 'Out of Stock' : p.quantity <= 5 ? 'Low Stock' : 'In Stock',
      confirmed: p.confirm ? 'Yes' : 'No',
      addedDateFormatted: p.addedDate ? new Date(p.addedDate).toLocaleDateString() : '-',
    }));
  };

  const handleExportExcel = () => {
    exportToExcel(getExportData(), storeExportColumns, 'store-products');
    toast.success('Exported to Excel');
  };

  const handleExportPDF = () => {
    exportToPDF(getExportData(), storeExportColumns, 'store-products', 'Store Products Report');
    toast.success('Exported to PDF');
  };

  // UI Helpers
  const getStatusBadge = (quantity: number) => {
    if (quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (quantity <= 5) return <Badge variant="secondary">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">In Stock</Badge>;
  };

  const getPriceColor = (price: number) => {
    if (price < 100000) return 'text-blue-600 font-bold';
    if (price < 500000) return 'text-green-600 font-bold';
    if (price < 1000000) return 'text-yellow-600 font-bold';
    if (price < 2000000) return 'text-orange-600 font-bold';
    return 'text-red-600 font-bold';
  };

  // Handlers
  const handleAddProduct = async () => {
    if (!userBranch) {
      toast.error('You are not assigned to any branch');
      return;
    }
    if (
      !newProduct.productName ||
      !newProduct.category ||
      newProduct.costPrice === '' ||
      newProduct.quantity === '' ||
      Number(newProduct.quantity) < 1 ||
      Number(newProduct.costPrice) < 0
    ) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    setActionLoading(true);
    const result = await addOrUpdateProduct({
      productName: newProduct.productName,
      category: newProduct.category,
      model: newProduct.model,
      costPrice: Number(newProduct.costPrice),
      quantity: Number(newProduct.quantity),
      branch: userBranch,
      businessId: businessId!,
      confirm: isAdmin,
    });

    if (result) {
      setProducts(prev => {
        const existing = prev.find(p => p.id === result.id);
        if (existing) return prev.map(p => p.id === result.id ? result : p);
        return [...prev, result];
      });
      toast.success(isOnline ? 'Product added successfully' : 'Product added locally – will sync when online');
      setAddDialogOpen(false);
      setNewProduct({ productName: '', category: '', model: '', costPrice: '', quantity: '' });
    }
    setActionLoading(false);
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    const success = await updateProduct(currentProduct.id!, currentProduct);
    if (success) {
      setProducts(prev => prev.map(p => p.id === currentProduct.id ? currentProduct : p));
      toast.success(isOnline ? 'Product updated' : 'Product updated locally – will sync when online');
      setEditDialogOpen(false);
    }
    setActionLoading(false);
  };

  const openConfirmSale = () => {
    setConfirmSaleDialogOpen(true);
  };

  const handleSellConfirm = async () => {
    if (!currentProduct || sellForm.quantity === '' || sellForm.sellingPrice === '') return;

    const qty = Number(sellForm.quantity);
    const price = Number(sellForm.sellingPrice);

    if (qty > currentProduct.quantity || price <= 0 || qty <= 0) {
      toast.error('Invalid quantity or price');
      return;
    }

    setActionLoading(true);
    const success = await sellProduct(currentProduct.id!, qty, price, sellForm.deadline, userBranch);
    if (success) {
      setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, quantity: p.quantity - qty } : p));
      toast.success(isOnline ? `Sold ${qty} unit(s)` : `Sale recorded locally – will sync when online`);
      setSellDialogOpen(false);
      setConfirmSaleDialogOpen(false);
      setSellForm({ quantity: '', sellingPrice: '', deadline: '' });
    }
    setActionLoading(false);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setActionLoading(true);
    const success = await deleteProduct(productToDelete);
    if (success) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      toast.success(isOnline ? 'Product marked as deleted' : 'Product marked as deleted locally – will sync when online');
      setDeleteConfirmOpen(false);
    }
    setActionLoading(false);
  };

  const openConfirmProductDialog = (id: string, current: boolean) => {
    setProductToConfirm({ id, current });
    setConfirmProductDialogOpen(true);
  };

  const handleConfirmProduct = async () => {
    if (!productToConfirm || !isAdmin) return;

    setActionLoading(true);
    const success = await updateProduct(productToConfirm.id, { confirm: !productToConfirm.current });
    if (success) {
      setProducts(prev => prev.map(p => p.id === productToConfirm.id ? { ...p, confirm: !productToConfirm.current } : p));
      toast.success(`Product ${!productToConfirm.current ? 'confirmed' : 'unconfirmed'} successfully`);
      setConfirmProductDialogOpen(false);
      setProductToConfirm(null);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
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
              {isAdmin
                ? 'All products across branches'
                : userBranch
                ? `Products in ${getBranchName(userBranch)}`
                : 'You are not assigned to any branch'}
            </p>
          </div>
          <div className="flex gap-3">
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
            <Button onClick={() => setAddDialogOpen(true)} disabled={!userBranch}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product {!userBranch && '(No Branch)'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border">
          <div className="relative col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search by name, category, model..."
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

          {isAdmin && (
            <Select value={confirmFilter} onValueChange={setConfirmFilter}>
              <SelectTrigger><SelectValue placeholder="Confirmation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Confirmed">Confirmed Only</SelectItem>
                <SelectItem value="Unconfirmed">Unconfirmed Only</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                <TableHead className="cursor-pointer" onClick={() => handleSort('costPrice')}>
                  <div className="flex items-center gap-1">Cost Price <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-muted-foreground">
                    No products found matching your filters.
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
                    <TableCell className={getPriceColor(p.costPrice)}>{p.costPrice.toLocaleString()} RWF</TableCell>
                    <TableCell>{getStatusBadge(p.quantity)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openConfirmProductDialog(p.id!, p.confirm)}
                          disabled={!isAdmin || actionLoading}
                        >
                          {p.confirm ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
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
                          <Button size="sm" variant="ghost" onClick={() => { setProductToDelete(p.id!); setDeleteConfirmOpen(true); }}>
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

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No products found matching your filters.
            </div>
          ) : (
            sortedProducts.map(p => (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{p.productName}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                        {p.model && <Badge variant="outline" className="text-xs">{p.model}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="font-bold">{p.quantity}</Badge>
                      {getStatusBadge(p.quantity)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className={`text-sm font-medium ${getPriceColor(p.costPrice)}`}>
                      {p.costPrice.toLocaleString()} RWF
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 gap-1">
                          Actions
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setCurrentProduct(p); setDetailsDialogOpen(true); }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {p.quantity > 0 && (
                          <DropdownMenuItem onClick={() => { setCurrentProduct(p); setSellDialogOpen(true); }}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Sell Product
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => { setCurrentProduct(p); setEditDialogOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openConfirmProductDialog(p.id!, p.confirm)}
                              disabled={actionLoading}
                            >
                              {p.confirm ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Unconfirm
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Confirm
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => { setProductToDelete(p.id!); setDeleteConfirmOpen(true); }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
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
                <Label>Cost Price per Unit (RWF) *</Label>
                <Input
                  type="number"
                  value={newProduct.costPrice}
                  onChange={e => {
                    const val = e.target.value;
                    setNewProduct(prev => ({ ...prev, costPrice: val === '' ? '' : Number(val) }));
                  }}
                  placeholder="Enter cost price"
                />
              </div>
              <div className="grid gap-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newProduct.quantity}
                  onChange={e => {
                    const val = e.target.value;
                    setNewProduct(prev => ({ ...prev, quantity: val === '' ? '' : Number(val) }));
                  }}
                  placeholder="Enter quantity"
                />
              </div>

              {newProduct.costPrice !== '' && newProduct.quantity !== '' && Number(newProduct.costPrice) > 0 && Number(newProduct.quantity) > 0 && (
                <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200">
                  <CardContent className="pt-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Cost Value:</span>
                      <span>{(Number(newProduct.costPrice) * Number(newProduct.quantity)).toLocaleString()} RWF</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAddProduct}
                disabled={actionLoading || !newProduct.productName || !newProduct.category || newProduct.costPrice === '' || newProduct.quantity === ''}
              >
                {actionLoading ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
            {currentProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Product Name</Label>
                  <Input value={currentProduct.productName} onChange={e => setCurrentProduct(prev => prev ? { ...prev, productName: e.target.value } : null)} />
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Input value={currentProduct.category} onChange={e => setCurrentProduct(prev => prev ? { ...prev, category: e.target.value } : null)} />
                </div>
                <div className="grid gap-2">
                  <Label>Model</Label>
                  <Input value={currentProduct.model || ''} onChange={e => setCurrentProduct(prev => prev ? { ...prev, model: e.target.value } : null)} />
                </div>
                <div className="grid gap-2">
                  <Label>Cost Price</Label>
                  <Input type="number" value={currentProduct.costPrice} onChange={e => setCurrentProduct(prev => prev ? { ...prev, costPrice: Number(e.target.value) || 0 } : null)} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateProduct} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sell Product Dialog */}
        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sell Product</DialogTitle>
              <DialogDescription>
                {currentProduct?.productName} (Available: {currentProduct?.quantity})
              </DialogDescription>
            </DialogHeader>

            {currentProduct && (
              <div className="space-y-6 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Quantity to Sell</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      value={sellForm.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSellForm(s => ({ ...s, quantity: val === '' ? '' : Number(val) }));
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Selling Price per Unit (RWF)</Label>
                    <Input
                      type="number"
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

                {sellForm.quantity !== '' && Number(sellForm.quantity) > currentProduct.quantity && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Quantity entered ({sellForm.quantity}) exceeds available stock ({currentProduct.quantity}).
                    </AlertDescription>
                  </Alert>
                )}

                {sellForm.quantity !== '' && sellForm.sellingPrice !== '' && Number(sellForm.quantity) > 0 && Number(sellForm.sellingPrice) > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex justify-between text-lg">
                        <span>Total Money Received:</span>
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
                      <div className="flex justify-between text-xl font-bold pt-2 border-t">
                        <span>Profit / Loss:</span>
                        <span className={
                          Number(sellForm.sellingPrice) * Number(sellForm.quantity) >= currentProduct.costPrice * Number(sellForm.quantity)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }>
                          {(
                            Number(sellForm.sellingPrice) * Number(sellForm.quantity) -
                            currentProduct.costPrice * Number(sellForm.quantity)
                          ).toLocaleString()} RWF
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSellDialogOpen(false);
                setSellForm({ quantity: '', sellingPrice: '', deadline: '' });
              }}>
                Cancel
              </Button>
              <Button
                onClick={openConfirmSale}
                disabled={
                  actionLoading ||
                  sellForm.quantity === '' ||
                  sellForm.sellingPrice === '' ||
                  Number(sellForm.quantity) <= 0 ||
                  Number(sellForm.sellingPrice) <= 0 ||
                  Number(sellForm.quantity) > currentProduct?.quantity
                }
              >
                Proceed to Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Final Sale Confirmation Dialog */}
        <Dialog open={confirmSaleDialogOpen} onOpenChange={setConfirmSaleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Sale</DialogTitle>
              <DialogDescription className="space-y-3">
                <p>Are you sure you want to confirm this sale?</p>
                <div className="font-medium">
                  <p>Product: <strong>{currentProduct?.productName}</strong></p>
                  <p>Quantity: <strong>{sellForm.quantity}</strong></p>
                  <p>Selling Price per Unit: <strong>{Number(sellForm.sellingPrice).toLocaleString()} RWF</strong></p>
                  <p className="text-lg pt-2">
                    Total Amount: <strong>{(Number(sellForm.quantity) * Number(sellForm.sellingPrice)).toLocaleString()} RWF</strong>
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmSaleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSellConfirm} disabled={actionLoading}>
                {actionLoading ? 'Selling...' : 'Yes, Confirm Sale'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Product Status Dialog (Admin only) */}
        <Dialog open={confirmProductDialogOpen} onOpenChange={setConfirmProductDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Confirmation Status</DialogTitle>
              <DialogDescription>
                Are you sure you want to <strong>{productToConfirm && !productToConfirm.current ? 'confirm' : 'unconfirm'}</strong> this product?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmProductDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmProduct} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Yes, Confirm Change'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Product Details</DialogTitle></DialogHeader>
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
                <p><strong>Added At:</strong> {currentProduct.addedDate ? new Date(currentProduct.addedDate).toLocaleDateString() : '-'}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The product will be marked as deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
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