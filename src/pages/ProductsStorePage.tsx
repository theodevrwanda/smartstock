import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Layers, Eye, Edit, Trash2, ShoppingCart, CheckCircle, XCircle, Loader2, Download, Calendar } from 'lucide-react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext'; 

// Interfaces
interface Product {
  id: string;
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  sellingPrice: number | null;
  status: 'store' | 'sold' | 'restored' | 'deleted';
  addedDate?: Date;
  deadline?: Date;
  updatedAt?: Date;
  quantity: number;
  branch: string;
  confirm: boolean;
}

interface Branch {
  id: string;
  branchName: string;
}

interface SellForm {
  quantity: number | '';
  sellingPrice: number | '';
  deadline: string | '';
  error: string;
  totalAmount: number;
}

// Mock Data - Offline/Demo Mode
const mockBranches: Branch[] = [
  { id: '1', branchName: 'Kigali Main' },
  { id: '2', branchName: 'Nyamirambo Branch' },
  { id: '3', branchName: 'Gisozi Branch' },
  { id: '4', branchName: 'Remera Branch' },
];

const mockProducts: Product[] = [
  {
    id: 'p1',
    productName: 'Samsung Galaxy A55',
    category: 'Smartphones',
    model: 'A55 5G',
    costPrice: 520000,
    sellingPrice: null,
    status: 'store',
    quantity: 15,
    branch: '1',
    addedDate: new Date('2025-11-10'),
    deadline: new Date('2026-03-10'),
    confirm: true,
  },
  {
    id: 'p2',
    productName: 'iPhone 14 Pro',
    category: 'Smartphones',
    model: '256GB',
    costPrice: 1350000,
    sellingPrice: null,
    status: 'store',
    quantity: 4,
    branch: '1',
    addedDate: new Date('2025-12-01'),
    confirm: true,
  },
  {
    id: 'p3',
    productName: 'Tecno Camon 30',
    category: 'Smartphones',
    model: 'Premier 5G',
    costPrice: 350000,
    sellingPrice: null,
    status: 'store',
    quantity: 22,
    branch: '2',
    addedDate: new Date('2025-12-15'),
    confirm: false,
  },
  {
    id: 'p4',
    productName: 'MacBook Air M2',
    category: 'Laptops',
    model: '13-inch 2024',
    costPrice: 1450000,
    sellingPrice: null,
    status: 'store',
    quantity: 3,
    branch: '3',
    addedDate: new Date('2025-11-25'),
    confirm: true,
  },
  {
    id: 'p5',
    productName: 'HP EliteBook 840 G9',
    category: 'Laptops',
    model: 'i7 12th Gen',
    costPrice: 980000,
    sellingPrice: null,
    status: 'store',
    quantity: 8,
    branch: '4',
    addedDate: new Date('2025-12-05'),
    confirm: true,
  },
  {
    id: 'p6',
    productName: 'Sony WH-1000XM5',
    category: 'Audio',
    model: 'Wireless Headphones',
    costPrice: 420000,
    sellingPrice: null,
    status: 'store',
    quantity: 0,
    branch: '2',
    addedDate: new Date('2025-12-18'),
    confirm: true,
  },
  {
    id: 'p7',
    productName: 'JBL Charge 5',
    category: 'Audio',
    model: 'Portable Speaker',
    costPrice: 185000,
    sellingPrice: null,
    status: 'store',
    quantity: 12,
    branch: '1',
    addedDate: new Date('2025-12-20'),
    confirm: false,
  },
];

const ProductsStorePage: React.FC = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // From your real AuthContext

  const isAdmin = user?.role === 'admin';
  const userBranch = user?.branch || null;

  const [products, setProducts] = useState<Product[]>([]);
  const [branches] = useState<Branch[]>(mockBranches);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [addedDateFilter, setAddedDateFilter] = useState<string>('');
  const [sortField, setSortField] = useState<keyof Product>('productName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [productToSell, setProductToSell] = useState<Product | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [productToView, setProductToView] = useState<Product | null>(null);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    productName: '',
    category: '',
    model: '',
    quantity: 0,
    costPrice: 0,
    branch: userBranch || '',
    confirm: isAdmin,
  });

  const [sellForm, setSellForm] = useState<SellForm>({
    quantity: '',
    sellingPrice: '',
    deadline: '',
    error: '',
    totalAmount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Load mock products
  useEffect(() => {
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 800);
  }, []);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Warn if no branch assigned
  useEffect(() => {
    if (!authLoading && user && !userBranch) {
      toast({
        title: 'Warning',
        description: 'No branch assigned to your account. Some features are limited.',
        variant: 'destructive',
      });
    }
  }, [user, userBranch, authLoading, toast]);

  // Simulate async delay
  const simulateAsync = async (action: () => void) => {
    setActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    action();
    setActionLoading(false);
  };

  const handleConfirmProduct = (product: Product) => {
    if (!isAdmin) {
      toast({ title: 'Access Denied', description: 'Only admins can confirm products.', variant: 'destructive' });
      return;
    }
    simulateAsync(() => {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, confirm: !p.confirm } : p));
      toast({ title: 'Success', description: `Product ${product.confirm ? 'unconfirmed' : 'confirmed'}.` });
    });
  };

  const handleDeleteProduct = () => {
    if (!isAdmin) return;
    if (!productToDelete) return;
    simulateAsync(() => {
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      toast({ title: 'Success', description: 'Product deleted.' });
    });
  };

  const handleUpdateProduct = () => {
    if (!isAdmin) {
      toast({ title: 'Access Denied', description: 'Only admins can edit products.', variant: 'destructive' });
      return;
    }
    if (!productToEdit || !productToEdit.productName || !productToEdit.category || productToEdit.costPrice <= 0 || productToEdit.quantity < 0 || !productToEdit.branch) {
      toast({ title: 'Error', description: 'Please fill all required fields correctly.', variant: 'destructive' });
      return;
    }
    simulateAsync(() => {
      setProducts(prev => prev.map(p => p.id === productToEdit.id ? productToEdit : p));
      setEditDialogOpen(false);
      setProductToEdit(null);
      toast({ title: 'Success', description: 'Product updated.' });
    });
  };

  const handleSellProduct = () => {
    if (!userBranch) {
      toast({ title: 'Error', description: 'You must be assigned a branch to sell.', variant: 'destructive' });
      return;
    }
    if (!productToSell?.confirm) {
      toast({ title: 'Error', description: 'Product must be confirmed by admin first.', variant: 'destructive' });
      return;
    }
    const qty = Number(sellForm.quantity);
    const price = Number(sellForm.sellingPrice);
    if (qty <= 0 || qty > productToSell.quantity || price <= 0) {
      setSellForm(prev => ({ ...prev, error: 'Invalid quantity or price.' }));
      return;
    }
    simulateAsync(() => {
      setProducts(prev => prev.map(p => p.id === productToSell.id ? { ...p, quantity: p.quantity - qty, sellingPrice: price } : p));
      setSellDialogOpen(false);
      setProductToSell(null);
      setSellForm({ quantity: '', sellingPrice: '', deadline: '', error: '', totalAmount: 0 });
      toast({ title: 'Success', description: `Sold ${qty} unit(s).` });
    });
  };

  const handleAddProduct = () => {
    if (!userBranch) {
      toast({ title: 'Error', description: 'You must be assigned a branch to add products.', variant: 'destructive' });
      return;
    }
    if (!newProduct.productName || !newProduct.category || newProduct.costPrice! <= 0 || newProduct.quantity! <= 0) {
      toast({ title: 'Error', description: 'All required fields must be valid.', variant: 'destructive' });
      return;
    }
    simulateAsync(() => {
      const newProd: Product = {
        id: Date.now().toString(),
        productName: newProduct.productName!,
        category: newProduct.category!,
        model: newProduct.model,
        costPrice: newProduct.costPrice!,
        sellingPrice: null,
        status: 'store',
        quantity: newProduct.quantity!,
        branch: userBranch,
        addedDate: new Date(),
        confirm: isAdmin,
      };
      setProducts(prev => [...prev, newProd]);
      setAddProductDialogOpen(false);
      setNewProduct({ productName: '', category: '', model: '', quantity: 0, costPrice: 0 });
      toast({ title: 'Success', description: 'Product added.' });
    });
  };

  const formatAmount = (amount: number) => `Rwf ${amount.toLocaleString('en-US')}`;
  const formatDate = (date?: Date) => date ? date.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' }) : '–';

  const getStatusBadge = (quantity: number) => {
    if (quantity > 5) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">In Store</Badge>;
    if (quantity > 0) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Low Stock</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Out of Stock</Badge>;
  };

  const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.branchName || branchId;

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Product Name', 'Category', 'Model/Variant', 'Quantity', 'Branch', 'Cost Price', 'Date Added', 'Deadline', isAdmin ? 'Confirmed' : ''],
      ...filteredProducts.map(p => [
        p.productName,
        p.category,
        p.model || '',
        p.quantity,
        getBranchName(p.branch),
        formatAmount(p.costPrice),
        formatDate(p.addedDate),
        formatDate(p.deadline),
        isAdmin ? (p.confirm ? 'Yes' : 'No') : '',
      ])
    ]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store_products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProducts = products
    .filter(p => p.status === 'store')
    .filter(p =>
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getBranchName(p.branch).toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(p => branchFilter === 'All' || p.branch === branchFilter)
    .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
    .filter(p => !addedDateFilter || (p.addedDate && p.addedDate.toLocaleDateString('en-RW') === new Date(addedDateFilter).toLocaleDateString('en-RW')))
    .sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === 'branch') { aVal = getBranchName(a.branch); bVal = getBranchName(b.branch); }
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      return (aVal > bVal ? 1 : aVal < bVal ? -1 : 0) * (sortDirection === 'asc' ? 1 : -1);
    });

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  useEffect(() => {
    if (sellDialogOpen && productToSell) {
      const qty = Number(sellForm.quantity);
      const price = Number(sellForm.sellingPrice);
      if (qty > 0 && price > 0) {
        setSellForm(prev => ({ ...prev, totalAmount: qty * price }));
      } else {
        setSellForm(prev => ({ ...prev, totalAmount: 0 }));
      }
    }
  }, [sellForm.quantity, sellForm.sellingPrice, sellDialogOpen, productToSell]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-gray-500">
        <p>Please log in to access the store inventory.</p>
      </div>
    );
  }

  return (
    <>
      <SEOHelmet
        title="Store Products - EMS: Inventory Management Platform"
        description="Manage your in-store inventory with EMS. View, search, and filter products by branch, category, and date added."
        canonical="https://ems.pages.dev/products"
      />
      <div className="space-y-6 p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Store Inventory</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage products currently in store</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto">
                <Download size={16} className="mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setAddProductDialogOpen(true)} variant="outline" size="sm" className="w-full sm:w-auto">
                Add Product
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 w-full sm:w-48">
              <MapPin size={16} className="text-gray-400" />
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.branchName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-48">
              <Layers size={16} className="text-gray-400" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-48">
              <Calendar size={16} className="text-gray-400" />
              <Input
                type="date"
                value={addedDateFilter}
                onChange={e => setAddedDateFilter(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search by name, category, model, branch"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-200 dark:border-gray-700" />

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <p>No store products found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="font-semibold">
                    <button onClick={() => handleSort('productName')} className="flex items-center gap-1">
                      Product Name
                      {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  {!isMobile && (
                    <>
                      <TableHead className="font-semibold">
                        <button onClick={() => handleSort('category')} className="flex items-center gap-1">
                          Category
                          {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button onClick={() => handleSort('model')} className="flex items-center gap-1">
                          Model/Variant
                          {sortField === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </button>
                      </TableHead>
                    </>
                  )}
                  <TableHead className="font-semibold">
                    <button onClick={() => handleSort('quantity')} className="flex items-center gap-1">
                      Qty
                      {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  {!isMobile && (
                    <TableHead className="font-semibold">
                      <button onClick={() => handleSort('branch')} className="flex items-center gap-1">
                        Branch
                        {sortField === 'branch' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="font-semibold">Status</TableHead>
                  {!isMobile && (
                    <>
                      <TableHead className="font-semibold">
                        <button onClick={() => handleSort('costPrice')} className="flex items-center gap-1">
                          Cost Price
                          {sortField === 'costPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button onClick={() => handleSort('addedDate')} className="flex items-center gap-1">
                          Date Added
                          {sortField === 'addedDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </button>
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="font-semibold">
                          <button onClick={() => handleSort('confirm')} className="flex items-center gap-1">
                            Confirmed
                            {sortField === 'confirm' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </button>
                        </TableHead>
                      )}
                    </>
                  )}
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    {!isMobile && (
                      <>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.model || '–'}</TableCell>
                      </>
                    )}
                    <TableCell>{product.quantity}</TableCell>
                    {!isMobile && <TableCell>{getBranchName(product.branch)}</TableCell>}
                    <TableCell>{getStatusBadge(product.quantity)}</TableCell>
                    {!isMobile && (
                      <>
                        <TableCell>{formatAmount(product.costPrice)}</TableCell>
                        <TableCell>{formatDate(product.addedDate)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            {product.confirm ? (
                              <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">Not Confirmed</Badge>
                            )}
                          </TableCell>
                        )}
                      </>
                    )}
                    <TableCell className="flex gap-2">
                      {isMobile ? (
                        <Button variant="ghost" size="sm" onClick={() => { setProductToView(product); setViewDialogOpen(true); }}>
                          <Eye size={18} />
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { setProductToView(product); setViewDialogOpen(true); }} title="View">
                            <Eye size={18} />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => { setProductToEdit({ ...product }); setEditDialogOpen(true); }} title="Edit">
                                <Edit size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { setProductToDelete(product); setDeleteConfirmOpen(true); }} title="Delete">
                                <Trash2 size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleConfirmProduct(product)} title={product.confirm ? 'Unconfirm' : 'Confirm'}>
                                {product.confirm ? <XCircle size={18} /> : <CheckCircle size={18} />}
                              </Button>
                            </>
                          )}
                          {(isAdmin || (product.quantity > 0 && product.confirm)) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setProductToSell(product);
                                setSellForm({
                                  quantity: '',
                                  sellingPrice: product.sellingPrice?.toString() || '',
                                  deadline: product.deadline ? product.deadline.toISOString().split('T')[0] : '',
                                  error: '',
                                  totalAmount: 0,
                                });
                                setSellDialogOpen(true);
                              }}
                              title="Sell"
                            >
                              <ShoppingCart size={18} />
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {productToView && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Name:</strong> {productToView.productName}</p>
                    <p><strong>Category:</strong> {productToView.category}</p>
                    <p><strong>Model:</strong> {productToView.model || '–'}</p>
                    <p><strong>Quantity:</strong> {productToView.quantity}</p>
                    {isAdmin && <p><strong>Confirmed:</strong> {productToView.confirm ? 'Yes' : 'No'}</p>}
                  </div>
                  <div>
                    <p><strong>Branch:</strong> {getBranchName(productToView.branch)}</p>
                    <p><strong>Cost Price:</strong> {formatAmount(productToView.costPrice)}</p>
                    <p><strong>Selling Price:</strong> {productToView.sellingPrice ? formatAmount(productToView.sellingPrice) : '–'}</p>
                    <p><strong>Date Added:</strong> {formatDate(productToView.addedDate)}</p>
                    <p><strong>Deadline:</strong> {formatDate(productToView.deadline)}</p>
                  </div>
                </div>
                {isMobile && (
                  <div className="flex flex-col gap-2">
                    {isAdmin && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); setProductToEdit(productToView); setEditDialogOpen(true); }}>
                          <Edit size={16} className="mr-2" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); setProductToDelete(productToView); setDeleteConfirmOpen(true); }}>
                          <Trash2 size={16} className="mr-2" /> Delete
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleConfirmProduct(productToView); }}>
                          {productToView.confirm ? <XCircle size={16} className="mr-2" /> : <CheckCircle size={16} className="mr-2" />}
                          {productToView.confirm ? 'Unconfirm' : 'Confirm'}
                        </Button>
                      </>
                    )}
                    {(isAdmin || (productToView.quantity > 0 && productToView.confirm)) && (
                      <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); setProductToSell(productToView); setSellDialogOpen(true); }}>
                        <ShoppingCart size={16} className="mr-2" /> Sell
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            {productToEdit && (
              <div className="space-y-4">
                <Input value={productToEdit.productName} onChange={e => setProductToEdit({ ...productToEdit, productName: e.target.value })} placeholder="Product Name" />
                <Input value={productToEdit.category} onChange={e => setProductToEdit({ ...productToEdit, category: e.target.value })} placeholder="Category" />
                <Input value={productToEdit.model || ''} onChange={e => setProductToEdit({ ...productToEdit, model: e.target.value })} placeholder="Model/Variant" />
                <Input type="number" value={productToEdit.quantity} onChange={e => setProductToEdit({ ...productToEdit, quantity: Number(e.target.value) || 0 })} placeholder="Quantity" />
                <Input type="number" value={productToEdit.costPrice} onChange={e => setProductToEdit({ ...productToEdit, costPrice: Number(e.target.value) || 0 })} placeholder="Cost Price (RWF)" />
                <Select value={productToEdit.branch} onValueChange={v => setProductToEdit({ ...productToEdit, branch: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branchName}</SelectItem>)}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={productToEdit.confirm} onCheckedChange={c => setProductToEdit({ ...productToEdit, confirm: !!c })} />
                    <Label>Confirmed</Label>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateProduct} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sell Dialog */}
        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sell Product</DialogTitle>
            </DialogHeader>
            {productToSell && (
              <div className="space-y-4">
                <p className="text-sm">Product: {productToSell.productName} (Available: {productToSell.quantity})</p>
                <p className="text-sm">Branch: {getBranchName(productToSell.branch)}</p>
                <div>
                  <Label>Quantity to Sell</Label>
                  <Input
                    type="number"
                    value={sellForm.quantity}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setSellForm(prev => ({
                        ...prev,
                        quantity: val,
                        error: val !== '' && (val > productToSell.quantity || val <= 0) ? 'Invalid quantity' : '',
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label>Selling Price (RWF)</Label>
                  <Input
                    type="number"
                    value={sellForm.sellingPrice}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setSellForm(prev => ({
                        ...prev,
                        sellingPrice: val,
                        error: val !== '' && val <= 0 ? 'Price must be > 0' : prev.error,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label>Deadline (Optional)</Label>
                  <Input type="date" value={sellForm.deadline} onChange={e => setSellForm(prev => ({ ...prev, deadline: e.target.value }))} />
                </div>
                {sellForm.totalAmount > 0 && <p className="font-bold text-lg">Total: {formatAmount(sellForm.totalAmount)}</p>}
                {sellForm.error && <p className="text-red-500 text-sm">{sellForm.error}</p>}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSellDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSellProduct}
                disabled={actionLoading || sellForm.quantity === '' || sellForm.sellingPrice === '' || !!sellForm.error}
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sell
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Product Dialog */}
        <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={newProduct.productName || ''} onChange={e => setNewProduct({ ...newProduct, productName: e.target.value })} placeholder="Product Name" />
              <Input value={newProduct.category || ''} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Category" />
              <Input value={newProduct.model || ''} onChange={e => setNewProduct({ ...newProduct, model: e.target.value })} placeholder="Model/Variant" />
              <Input type="number" value={newProduct.quantity || ''} onChange={e => setNewProduct({ ...newProduct, quantity: Number(e.target.value) || 0 })} placeholder="Quantity" />
              <Input type="number" value={newProduct.costPrice || ''} onChange={e => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) || 0 })} placeholder="Cost Price (RWF)" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddProductDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddProduct} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This will permanently delete <span className="font-semibold text-red-600">{productToDelete?.productName}</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteProduct} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProductsStorePage;