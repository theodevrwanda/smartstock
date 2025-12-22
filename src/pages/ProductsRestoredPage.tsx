import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ShoppingBasket, Eye, Trash2, Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface Product {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: {
    id: string;
    branchName: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  status: 'store' | 'sold' | 'restored' | 'deleted';
  costPrice: number;
  sellingPrice: number | null;
  addedDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  restoreComment?: string;
}

interface Branch {
  id: string;
  branchName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

type SortableProductKeys = 'productName' | 'category' | 'model' | 'quantity' | 'branch' | 'status' | 'costPrice' | 'sellingPrice';
type SortDirection = 'asc' | 'desc';

// Mock Data
const mockBranches: Branch[] = [
  { id: '1', branchName: 'Kigali Main', district: 'Nyarugenge', sector: 'Kigali', cell: 'City Center', village: 'Downtown' },
  { id: '2', branchName: 'Nyamirambo Branch', district: 'Nyarugenge', sector: 'Nyamirambo', cell: 'Rweza', village: 'Market' },
  { id: '3', branchName: 'Gisozi Branch', district: 'Gasabo', sector: 'Gisozi', cell: 'Kacyiru', village: 'Memorial' },
  { id: '4', branchName: 'Remera Branch', district: 'Gasabo', sector: 'Remera', cell: 'Airport Road', village: 'Kisimenti' },
];

const mockRestoredProducts: Product[] = [
  {
    id: 'r1',
    productName: 'Samsung Galaxy A55',
    category: 'Smartphones',
    model: 'A55 5G',
    quantity: 3,
    branch: mockBranches[0],
    status: 'restored',
    costPrice: 520000,
    sellingPrice: null,
    addedDate: new Date('2025-12-18'),
    restoreComment: 'Customer returned - minor screen scratch',
  },
  {
    id: 'r2',
    productName: 'iPhone 14 Pro',
    category: 'Smartphones',
    model: '256GB',
    quantity: 1,
    branch: mockBranches[1],
    status: 'restored',
    costPrice: 1350000,
    sellingPrice: 1400000,
    addedDate: new Date('2025-12-20'),
    restoreComment: 'Returned within 7-day policy - changed mind',
  },
  {
    id: 'r3',
    productName: 'Tecno Camon 30',
    category: 'Smartphones',
    model: 'Premier 5G',
    quantity: 4,
    branch: mockBranches[2],
    status: 'restored',
    costPrice: 350000,
    sellingPrice: null,
    addedDate: new Date('2025-12-19'),
    restoreComment: 'Defective camera - replaced under warranty',
  },
  {
    id: 'r4',
    productName: 'MacBook Air M2',
    category: 'Laptops',
    model: '13-inch 2024',
    quantity: 2,
    branch: mockBranches[3],
    status: 'restored',
    costPrice: 1450000,
    sellingPrice: null,
    addedDate: new Date('2025-12-21'),
    restoreComment: 'Customer upgraded to Pro model',
  },
];

// Sell Product Dialog Component
interface SellProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (id: string, newQuantity: number, newSellingPrice: number) => void;
  actionLoading: boolean;
}

const SellProductDialog: React.FC<SellProductDialogProps> = ({ open, onOpenChange, product, onConfirm, actionLoading }) => {
  const [quantity, setQuantity] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);

  useEffect(() => {
    if (open && product) {
      setQuantity('');
      setSellingPrice(product.sellingPrice || '');
      setError('');
      setTotalAmount(0);
    }
  }, [open, product]);

  useEffect(() => {
    const qty = Number(quantity);
    const price = Number(sellingPrice);
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      setTotalAmount(qty * price);
    } else {
      setTotalAmount(0);
    }
  }, [quantity, sellingPrice]);

  const handleConfirm = () => {
    if (!product) return;

    const qty = Number(quantity);
    if (qty <= 0 || qty > product.quantity) {
      setError(`Quantity must be between 1 and ${product.quantity}.`);
      return;
    }

    if (Number(sellingPrice) <= 0) {
      setError('Selling price must be greater than 0.');
      return;
    }

    setError('');
    onConfirm(product.id, qty, Number(sellingPrice));
  };

  const formatAmount = (amount: number) => `Rwf ${amount.toLocaleString('en-US')}`;

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell Restored Product: {product.productName}</DialogTitle>
          <DialogDescription>
            Available quantity: {product.quantity}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Quantity to Sell</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              min={1}
              max={product.quantity}
              placeholder="Enter quantity"
            />
          </div>
          <div>
            <Label>Selling Price (RWF)</Label>
            <Input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Enter selling price"
            />
          </div>
          {totalAmount > 0 && (
            <p className="font-bold text-lg">Total Amount: {formatAmount(totalAmount)}</p>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={actionLoading || quantity === '' || sellingPrice === '' || !!error}>
            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const ProductsRestoredPage: React.FC = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const canSell = isAdmin || isStaff;

  const [products, setProducts] = useState<Product[]>([]);
  const [branches] = useState<Branch[]>(mockBranches);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortableProductKeys>('productName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [productForAction, setProductForAction] = useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Load mock data
  useEffect(() => {
    setTimeout(() => {
      setProducts(mockRestoredProducts);
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

  const getBranchName = (branch: Product['branch']): string => branch?.branchName || 'Unknown';

  const formatAmount = (amount: number | null) => amount ? `Rwf ${amount.toLocaleString('en-US')}` : '–';

  const calculateTotalAmount = (quantity: number, sellingPrice: number | null) =>
    sellingPrice ? `Rwf ${(quantity * sellingPrice).toLocaleString('en-US')}` : '–';

  const formatDate = (date: Date | undefined) =>
    date ? date.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' }) : '–';

  const getStatusBadge = (status: string) => {
    const colors = {
      store: 'bg-green-100 text-green-800',
      sold: 'bg-yellow-100 text-yellow-800',
      restored: 'bg-blue-100 text-blue-800',
      deleted: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleSort = (field: SortableProductKeys) => {
    setSortField(field);
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleExport = () => {
    const csv = [
      ['Product Name', 'Category', 'Model', 'Quantity', 'Branch', 'Status', 'Cost Price', 'Selling Price', 'Total Amount', 'Date Added', 'Restore Comment'],
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
        formatDate(p.addedDate),
        p.restoreComment || '',
      ])
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restored_products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetails = (product: Product) => {
    setProductForAction(product);
    setViewDetailsDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    if (!isAdmin) {
      toast({ title: 'Error', description: 'Only admins can delete products.', variant: 'destructive' });
      return;
    }
    setProductForAction(product);
    setDeleteDialogOpen(true);
  };

  const handleSell = (product: Product) => {
    if (!canSell) {
      toast({ title: 'Error', description: 'Only admin/staff can sell.', variant: 'destructive' });
      return;
    }
    setProductForAction(product);
    setSellDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!productForAction) return;
    simulateAsync(() => {
      setProducts(prev => prev.filter(p => p.id !== productForAction.id));
      setDeleteDialogOpen(false);
      setProductForAction(null);
      toast({ title: 'Success', description: 'Product deleted.' });
    });
  };

  const confirmSell = (id: string, newQuantity: number, newSellingPrice: number) => {
    simulateAsync(() => {
      setProducts(prev => prev.map(p =>
        p.id === id
          ? { ...p, quantity: p.quantity - newQuantity, sellingPrice: newSellingPrice }
          : p
      ));
      toast({ title: 'Success', description: `Sold ${newQuantity} unit(s).` });
    });
  };

  const filteredProducts = products
    .filter(p =>
      (p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       getBranchName(p.branch).toLowerCase().includes(searchTerm.toLowerCase()) ||
       (p.restoreComment || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
      (branchFilter === 'All' || getBranchName(p.branch) === branchFilter) &&
      (categoryFilter === 'All' || p.category === categoryFilter)
    )
    .sort((a, b) => {
      const aVal = sortField === 'branch' ? getBranchName(a.branch) : (a[sortField] ?? '');
      const bVal = sortField === 'branch' ? getBranchName(b.branch) : (b[sortField] ?? '');
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const branchesList = ['All', ...branches.map(b => b.branchName)];

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
        <p>Please log in to view restored products.</p>
      </div>
    );
  }

  return (
    <>
      <SEOHelmet
        title="Restored Products - EMS"
        description="View and manage restored products"
        canonical="/products/restored"
      />
      <div className="space-y-6 p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Restored Products</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Products returned and restored to inventory</p>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search by name, category, model, branch, comment..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Branch</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{branchesList.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No restored products found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><button onClick={() => handleSort('productName')}>Product Name {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}</button></TableHead>
                  {!isMobile && (
                    <>
                      <TableHead><button onClick={() => handleSort('category')}>Category</button></TableHead>
                      <TableHead><button onClick={() => handleSort('model')}>Model</button></TableHead>
                    </>
                  )}
                  <TableHead><button onClick={() => handleSort('quantity')}>Qty</button></TableHead>
                  {!isMobile && <TableHead><button onClick={() => handleSort('branch')}>Branch</button></TableHead>}
                  <TableHead><button onClick={() => handleSort('status')}>Status</button></TableHead>
                  {!isMobile && (
                    <>
                      <TableHead><button onClick={() => handleSort('costPrice')}>Cost Price</button></TableHead>
                      <TableHead><button onClick={() => handleSort('sellingPrice')}>Selling Price</button></TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Restore Comment</TableHead>
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
                        <TableCell>{formatAmount(product.sellingPrice)}</TableCell>
                        <TableCell>{calculateTotalAmount(product.quantity, product.sellingPrice)}</TableCell>
                        <TableCell>{formatDate(product.addedDate)}</TableCell>
                        <TableCell className="truncate max-w-xs">{product.restoreComment || '–'}</TableCell>
                      </>
                    )}
                    <TableCell className="flex gap-2">
                      {isMobile ? (
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(product)}>
                          <Eye size={18} /> View
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(product)} title="View"><Eye size={18} /></Button>
                          {canSell && (
                            <Button variant="ghost" size="icon" onClick={() => handleSell(product)} title="Sell"><ShoppingBasket size={18} /></Button>
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
                  </div>
                  <div>
                    <p><strong>Branch:</strong> {getBranchName(productForAction.branch)}</p>
                    <p><strong>Cost Price:</strong> {formatAmount(productForAction.costPrice)}</p>
                    <p><strong>Selling Price:</strong> {formatAmount(productForAction.sellingPrice)}</p>
                    <p><strong>Date Added:</strong> {formatDate(productForAction.addedDate)}</p>
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
                    {canSell && (
                      <Button variant="outline" size="sm" onClick={() => { setViewDetailsDialogOpen(false); handleSell(productForAction); }}>
                        <ShoppingBasket size={16} className="mr-2" /> Sell
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

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
            <DialogDescription>Delete <strong>{productForAction?.productName}</strong> permanently?</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sell Dialog */}
        <SellProductDialog
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
          product={productForAction}
          onConfirm={confirmSell}
          actionLoading={actionLoading}
        />
      </div>
    </>
  );
};

export default ProductsRestoredPage;