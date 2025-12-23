import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Undo, Eye, Trash2, Loader2 } from 'lucide-react';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Real auth

// Interfaces
interface Product {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: string;
  status: 'sold' | 'sold & restored';
  costPrice: number;
  sellingPrice: number | null;
  addedDate: Date | null;
  soldDate: Date | null;
  deadline: Date | null;
  restoreComment: string | null;
}

interface Branch {
  id: string;
  branchName: string;
}

type SortableProductKeys = 'productName' | 'category' | 'model' | 'quantity' | 'status' | 'costPrice' | 'sellingPrice' | 'deadline' | 'soldDate' | 'branch';
type SortDirection = 'asc' | 'desc';

// Mock Data
const mockBranches: Branch[] = [
  { id: '1', branchName: 'Kigali Main' },
  { id: '2', branchName: 'Nyamirambo Branch' },
  { id: '3', branchName: 'Gisozi Branch' },
  { id: '4', branchName: 'Remera Branch' },
];

const mockSoldProducts: Product[] = [
  {
    id: 's1',
    productName: 'Samsung Galaxy A55',
    category: 'Smartphones',
    model: 'A55 5G',
    quantity: 2,
    branch: '1',
    status: 'sold',
    costPrice: 520000,
    sellingPrice: 580000,
    addedDate: new Date('2025-11-10'),
    soldDate: new Date('2025-12-15'),
    deadline: new Date('2026-01-15'),
    restoreComment: null,
  },
  {
    id: 's2',
    productName: 'iPhone 14 Pro',
    category: 'Smartphones',
    model: '256GB',
    quantity: 1,
    branch: '1',
    status: 'sold & restored',
    costPrice: 1350000,
    sellingPrice: 1500000,
    addedDate: new Date('2025-12-01'),
    soldDate: new Date('2025-12-18'),
    deadline: new Date('2026-01-18'),
    restoreComment: 'Customer returned due to screen issue',
  },
  {
    id: 's3',
    productName: 'Tecno Camon 30',
    category: 'Smartphones',
    model: 'Premier 5G',
    quantity: 5,
    branch: '2',
    status: 'sold',
    costPrice: 350000,
    sellingPrice: 400000,
    addedDate: new Date('2025-12-10'),
    soldDate: new Date('2025-12-20'),
    deadline: new Date('2026-01-20'),
    restoreComment: null,
  },
  {
    id: 's4',
    productName: 'MacBook Air M2',
    category: 'Laptops',
    model: '13-inch 2024',
    quantity: 1,
    branch: '3',
    status: 'sold',
    costPrice: 1450000,
    sellingPrice: 1600000,
    addedDate: new Date('2025-11-25'),
    soldDate: new Date('2025-12-10'),
    deadline: new Date('2026-01-10'),
    restoreComment: null,
  },
  {
    id: 's5',
    productName: 'HP EliteBook 840 G9',
    category: 'Laptops',
    model: 'i7 12th Gen',
    quantity: 3,
    branch: '4',
    status: 'sold',
    costPrice: 980000,
    sellingPrice: 1050000,
    addedDate: new Date('2025-12-05'),
    soldDate: new Date('2025-12-21'),
    deadline: new Date('2026-01-21'),
    restoreComment: null,
  },
  {
    id: 's6',
    productName: 'Sony WH-1000XM5',
    category: 'Audio',
    model: 'Wireless Headphones',
    quantity: 1,
    branch: '2',
    status: 'sold & restored',
    costPrice: 420000,
    sellingPrice: 450000,
    addedDate: new Date('2025-12-18'),
    soldDate: new Date('2025-12-22'),
    deadline: new Date('2026-01-22'),
    restoreComment: 'Defective unit - replaced',
  },
];

const ProductsSoldPage: React.FC = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [branches] = useState<Branch[]>(mockBranches);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [soldDateFilter, setSoldDateFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortableProductKeys>('productName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productForAction, setProductForAction] = useState<Product | null>(null);
  const [restoreComment, setRestoreComment] = useState('');
  const [restoreQuantity, setRestoreQuantity] = useState<number | string>('');
  const [restoreError, setRestoreError] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Load mock data
  useEffect(() => {
    setTimeout(() => {
      setProducts(mockSoldProducts);
      setLoading(false);
    }, 800);
  }, []);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simulate async action
  const simulateAsync = async (action: () => void) => {
    setActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    action();
    setActionLoading(false);
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null || amount === 0) return '–';
    return `Rwf ${amount.toLocaleString('en-US')}`;
  };

  const calculateTotalAmount = (quantity: number, sellingPrice: number | null) => {
    if (sellingPrice === null) return '–';
    const total = quantity * sellingPrice;
    return `Rwf ${total.toLocaleString('en-US')}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '–';
    return date.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.branchName || 'Unknown';
  };

  const isReturnDeadlineValid = (deadline: Date | null) => {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate >= today;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      sold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'sold & restored': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateProfitLoss = () => {
    return filteredProducts.reduce((total, product) => {
      if (product.sellingPrice !== null) {
        return total + (product.sellingPrice - product.costPrice) * product.quantity;
      }
      return total;
    }, 0);
  };

  const getProfitLossColor = (product: Product) => {
    if (product.sellingPrice === null) return 'text-gray-900 dark:text-white';
    const profit = (product.sellingPrice - product.costPrice) * product.quantity;
    return profit > 0 ? 'text-green-600 dark:text-green-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white';
  };

  const handleSort = (field: SortableProductKeys) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Product Name', 'Category', 'Model', 'Quantity', 'Branch', 'Status', 'Cost Price', 'Selling Price', 'Total Amount', 'Sold Date', 'Return Deadline'],
      ...filteredProducts.map(p => [
        p.productName,
        p.category,
        p.model || '',
        p.quantity,
        getBranchName(p.branch),
        p.status,
        formatAmount(p.costPrice),
        formatAmount(p.sellingPrice),
        calculateTotalAmount(p.quantity, p.sellingPrice),
        formatDate(p.soldDate),
        formatDate(p.deadline),
      ])
    ]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sold_products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetails = (product: Product) => {
    setProductForAction(product);
    setViewDetailsDialogOpen(true);
  };

  const handleRestore = (product: Product) => {
    if (!isReturnDeadlineValid(product.deadline)) {
      toast({ title: 'Error', description: 'Return deadline has expired.', variant: 'destructive' });
      return;
    }
    setProductForAction(product);
    setRestoreComment('');
    setRestoreQuantity('');
    setRestoreError('');
    setRestoreDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    if (!isAdmin) {
      toast({ title: 'Error', description: 'Only admins can delete sold products.', variant: 'destructive' });
      return;
    }
    setProductForAction(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!productForAction) return;
    simulateAsync(() => {
      setProducts(prev => prev.filter(p => p.id !== productForAction.id));
      setDeleteDialogOpen(false);
      setProductForAction(null);
      toast({ title: 'Success', description: 'Sold product deleted.' });
    });
  };

  const handleRestoreQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRestoreQuantity(value);
    const numValue = Number(value);

    if (!productForAction) return;

    if (value === '') {
      setRestoreError('');
    } else if (numValue <= 0) {
      setRestoreError('Quantity must be greater than 0.');
    } else if (numValue > productForAction.quantity) {
      setRestoreError(`Cannot restore more than sold quantity (${productForAction.quantity}).`);
    } else {
      setRestoreError('');
    }
  };

  const confirmRestore = () => {
    if (!productForAction) return;
    const qty = Number(restoreQuantity);

    if (!restoreComment.trim() || qty <= 0 || qty > productForAction.quantity || !isReturnDeadlineValid(productForAction.deadline)) {
      setRestoreError('Valid quantity and comment required. Deadline must be active.');
      return;
    }

    simulateAsync(() => {
      setProducts(prev => prev.map(p =>
        p.id === productForAction.id
          ? { ...p, status: 'sold & restored', restoreComment: restoreComment.trim() }
          : p
      ));
      setRestoreDialogOpen(false);
      setProductForAction(null);
      setRestoreComment('');
      setRestoreQuantity('');
      toast({ title: 'Success', description: 'Product restored to inventory.' });
    });
  };

  const branchesList = ['All', ...branches.map(b => b.branchName)];
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const statuses = ['All', 'sold', 'sold & restored'];

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = (
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        getBranchName(p.branch).toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.status.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesBranch = branchFilter === 'All' || getBranchName(p.branch) === branchFilter;
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

      const matchesSoldDate = !soldDateFilter || (
        p.soldDate &&
        new Date(p.soldDate).toLocaleDateString('en-RW') === new Date(soldDateFilter).toLocaleDateString('en-RW')
      );

      return matchesSearch && matchesBranch && matchesCategory && matchesStatus && matchesSoldDate;
    })
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
        <p>Please log in to view sold products.</p>
      </div>
    );
  }

  return (
    <>
      <SEOHelmet
        title="Sold Products - EMS: Inventory Management Platform"
        description="Manage sold products and process customer returns in the Electronic Management System."
        canonical="/products/sold"
      />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Sold Products</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track sold products and process customer returns</p>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Profit/Loss Summary */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold">Profit/Loss Summary</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Total for {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}:
            <span className={`ml-2 font-bold ${calculateProfitLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateProfitLoss() >= 0 ? '+' : ''}{formatAmount(calculateProfitLoss())}
            </span>
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl border p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Sold Date</Label>
                <Input type="date" value={soldDateFilter} onChange={e => setSoldDateFilter(e.target.value)} />
              </div>
              <div>
                <Label>Branch</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branchesList.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No sold products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><button onClick={() => handleSort('productName')} className="flex items-center gap-1">Product Name {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                  {!isMobile && (
                    <>
                      <TableHead><button onClick={() => handleSort('category')}>Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                      <TableHead><button onClick={() => handleSort('model')}>Model {sortField === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                    </>
                  )}
                  <TableHead><button onClick={() => handleSort('quantity')}>Qty {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                  {!isMobile && <TableHead><button onClick={() => handleSort('branch')}>Branch {sortField === 'branch' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>}
                  <TableHead><button onClick={() => handleSort('status')}>Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                  {!isMobile && (
                    <>
                      <TableHead><button onClick={() => handleSort('costPrice')}>Cost Price {sortField === 'costPrice' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                      <TableHead><button onClick={() => handleSort('sellingPrice')}>Selling Price {sortField === 'sellingPrice' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead><button onClick={() => handleSort('soldDate')}>Sold Date {sortField === 'soldDate' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                      <TableHead><button onClick={() => handleSort('deadline')}>Return Deadline {sortField === 'deadline' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                    </>
                  )}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    {!isMobile && (
                      <>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.model || '–'}</TableCell>
                      </>
                    )}
                    <TableCell>{product.quantity}</TableCell>
                    {!isMobile && <TableCell>{getBranchName(product.branch)}</TableCell>}
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    {!isMobile && (
                      <>
                        <TableCell>{formatAmount(product.costPrice)}</TableCell>
                        <TableCell className={getProfitLossColor(product)}>{formatAmount(product.sellingPrice)}</TableCell>
                        <TableCell className={getProfitLossColor(product)}>{calculateTotalAmount(product.quantity, product.sellingPrice)}</TableCell>
                        <TableCell>{formatDate(product.soldDate)}</TableCell>
                        <TableCell>{formatDate(product.deadline)}</TableCell>
                      </>
                    )}
                    <TableCell className="flex gap-2">
                      {isMobile ? (
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(product)}>
                          <Eye size={18} />
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(product)} title="View"><Eye size={18} /></Button>
                          {isReturnDeadlineValid(product.deadline) && (
                            <Button variant="ghost" size="icon" onClick={() => handleRestore(product)} title="Restore"><Undo size={18} /></Button>
                          )}
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product)} title="Delete"><Trash2 size={18} /></Button>
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

        {/* View Details Dialog */}
        <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Product Details</DialogTitle></DialogHeader>
            {productForAction && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Name:</strong> {productForAction.productName}</p>
                    <p><strong>Category:</strong> {productForAction.category}</p>
                    <p><strong>Model:</strong> {productForAction.model || '–'}</p>
                    <p><strong>Quantity:</strong> {productForAction.quantity}</p>
                    <p><strong>Status:</strong> {productForAction.status.charAt(0).toUpperCase() + productForAction.status.slice(1)}</p>
                  </div>
                  <div>
                    <p><strong>Branch:</strong> {getBranchName(productForAction.branch)}</p>
                    <p><strong>Cost Price:</strong> {formatAmount(productForAction.costPrice)}</p>
                    <p><strong>Selling Price:</strong> {formatAmount(productForAction.sellingPrice)}</p>
                    <p><strong>Total Amount:</strong> {calculateTotalAmount(productForAction.quantity, productForAction.sellingPrice)}</p>
                    <p><strong>Sold Date:</strong> {formatDate(productForAction.soldDate)}</p>
                    <p><strong>Return Deadline:</strong> {formatDate(productForAction.deadline)}</p>
                  </div>
                </div>
                {productForAction.restoreComment && (
                  <div>
                    <p><strong>Restore Comment:</strong></p>
                    <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded">{productForAction.restoreComment}</p>
                  </div>
                )}
                {isMobile && (
                  <div className="flex flex-col gap-2">
                    {isReturnDeadlineValid(productForAction.deadline) && (
                      <Button variant="outline" size="sm" onClick={() => { setViewDetailsDialogOpen(false); handleRestore(productForAction); }}>
                        <Undo size={16} className="mr-2" /> Restore
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => { setViewDetailsDialogOpen(false); handleDelete(productForAction); }}>
                        <Trash2 size={16} className="mr-2" /> Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Restore Product</DialogTitle></DialogHeader>
            {productForAction && (
              <div className="space-y-4">
                <p>Restore <strong>{productForAction.productName}</strong> back to inventory.</p>
                <p>Sold Quantity: {productForAction.quantity}</p>
                <p>Return Deadline: {formatDate(productForAction.deadline)}</p>
                <Label>Quantity to Restore</Label>
                <Input type="number" value={restoreQuantity} onChange={handleRestoreQuantityChange} placeholder={`Max: ${productForAction.quantity}`} />
                {restoreError && <p className="text-red-500 text-sm">{restoreError}</p>}
                <Label>Reason for Return</Label>
                <Textarea value={restoreComment} onChange={e => setRestoreComment(e.target.value)} placeholder="Enter reason..." />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmRestore} disabled={actionLoading || !!restoreError || !restoreComment.trim() || restoreQuantity === ''}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Restore
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
            <DialogDescription>
              Permanently delete <strong>{productForAction?.productName}</strong>?
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading}>
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

export default ProductsSoldPage;