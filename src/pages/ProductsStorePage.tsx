// src/pages/ProductsStorePage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, Eye, Edit, Trash2, ShoppingCart, Download, FileSpreadsheet, FileText, ArrowUpDown, CheckCircle, XCircle, AlertCircle, Package, DollarSign, TrendingUp, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  subscribeToProducts,
  toast,
  setTransactionContext,
} from '@/functions/store';
import { Product, Branch } from '@/types/interface';
import { getBranches } from '@/functions/branch';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/exportUtils';
import { Calendar } from '@/components/ui/calendar';

const MIXED_SHOP_CATEGORIES = [
  'Groceries',
  'Beverages',
  'Personal Care',
  'Electronics',
  'Clothing & Apparel',
  'Home & Kitchen',
  'Pharmacy & Health',
  'Stationery & Office',
  'Construction & Hardware',
  'Automotive',
  'Toys & Games',
  'Cosmetics',
  'Other'
];

const ProductsStorePage: React.FC = () => {
  const { user } = useAuth();

  const userBranch = typeof user?.branch === 'string' ? user.branch : null;
  const businessId = user?.businessId;
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  const canAddProduct = !!userBranch;
  const canDelete = isAdmin;
  const canConfirm = isAdmin;

  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>(isAdmin ? 'All' : (userBranch || 'All')); // Admin defaults to All
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');
  const [confirmFilter, setConfirmFilter] = useState<string>('All');
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // 0 (Sun) to 6 (Sat)

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof Product>('productName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [confirmSaleDialogOpen, setConfirmSaleDialogOpen] = useState(false);
  const [confirmProductDialogOpen, setConfirmProductDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Current product
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productToConfirm, setProductToConfirm] = useState<{ id: string; current: boolean } | null>(null);

  // Forms
  const [newProduct, setNewProduct] = useState({
    productName: '',
    category: '',
    model: '',
    quantity: '' as string | number,
    costPrice: '' as string | number,
    unit: 'pcs',
    branch: '',
    quantityPerUnit: '1' as string | number,
    baseUnit: 'pcs',
    deadline: '',
    confirm: isAdmin ? true : false,
  });

  const [sellForm, setSellForm] = useState({
    quantity: '' as string | number,
    sellingPrice: '' as string | number,
    deadline: '',
    sellInBaseUnit: true,
  });

  // Transaction context
  useEffect(() => {
    if (user && branches.length > 0 && userBranch) {
      const branchInfo = branches.find(b => b.id === userBranch);
      setTransactionContext({
        userId: user.id || '',
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
        userRole: user.role || 'staff',
        businessId: user.businessId || '',
        businessName: user.businessName || '',
        branchId: userBranch,
        branchName: branchInfo?.branchName,
      });
    }
  }, [user, branches, userBranch]);

  // Online/offline sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back Online – Syncing...');
      syncOfflineOperations().then(() => {
        if (businessId) {
          getProducts(businessId, user?.role || 'staff', isAdmin ? (branchFilter === 'All' ? null : branchFilter) : userBranch).then(setProducts);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline – Changes will sync later');
    };

    if (!navigator.onLine) handleOffline();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [businessId, userBranch, isAdmin, branchFilter, user?.role]);

  // Load data
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch branches once
    getBranches(businessId)
      .then(branchList => {
        setBranches(branchList);
        const map = new Map<string, string>();
        branchList.forEach(b => map.set(b.id!, b.branchName));
        setBranchMap(map);
      })
      .catch(err => {
        toast.warning(isOnline ? 'Failed to load branches' : 'Using cached branch data');
      });

    // Real-time subscription for products
    const unsubscribe = subscribeToProducts(
      businessId,
      user?.role || 'staff',
      isAdmin ? null : userBranch, // Admin gets ALL data (branchId=null), Staff gets their branch's data
      null, // category filter handled in UI
      (updatedProducts) => {
        setProducts(updatedProducts);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [businessId, userBranch, isOnline, isAdmin, branchFilter, user?.role]);

  const currentBranchName = userBranch ? branchMap.get(userBranch) || 'Your Branch' : 'No Branch';

  const getBranchName = (branchId: string) => {
    return branchMap.get(branchId) || 'Unknown Branch';
  };

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // Base Filtering (No day filter)
  const baseFilteredProducts = useMemo(() => {
    return products
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => minPrice === '' || p.costPrice >= Number(minPrice))
      .filter(p => maxPrice === '' || p.costPrice <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty))
      .filter(p => confirmFilter === 'All' || (confirmFilter === 'Confirmed' ? p.confirm : !p.confirm));
  }, [products, searchTerm, branchFilter, categoryFilter, minPrice, maxPrice, minQty, maxQty, confirmFilter]);

  // Store Summary Stats
  const storeStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfYear = new Date(currentYear, 0, 1);
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday as start
    startOfWeek.setHours(0, 0, 0, 0);

    const stats = {
      week: { value: 0, count: 0 },
      month: { value: 0, count: 0 },
      year: { value: 0, count: 0 },
      daily: Array(7).fill(0).map(() => ({ value: 0, count: 0 })) // Mon (0) to Sun (6)
    };

    baseFilteredProducts.forEach(p => {
      const addedDate = p.addedDate ? new Date(p.addedDate) : null;
      if (!addedDate) return;

      const value = (p.quantity * (p.costPrice || 0));

      // Global Accumulation
      if (addedDate >= startOfYear) {
        stats.year.value += value;
        stats.year.count++;
      }
      if (addedDate >= startOfMonth) {
        stats.month.value += value;
        stats.month.count++;
      }
      if (addedDate >= startOfWeek) {
        stats.week.value += value;
        stats.week.count++;
      }

      // Weekly (Mon-Sun) breakdown for the CURRENT week
      if (addedDate >= startOfWeek) {
        let dayIdx = addedDate.getDay(); // 0 (Sun) to 6 (Sat)
        // Convert to Mon (0) to Sun (6)
        let monSunIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        if (monSunIdx >= 0 && monSunIdx < 7) {
          stats.daily[monSunIdx].value += value;
          stats.daily[monSunIdx].count++;
        }
      }
    });

    return stats;
  }, [baseFilteredProducts]);

  // Table Filtering (Includes day filter)
  const tableFilteredProducts = useMemo(() => {
    return baseFilteredProducts.filter(p => {
      if (selectedDay === null) return true;
      const date = new Date(p.addedDate);
      let dayIdx = date.getDay();
      let monSunIdx = dayIdx === 0 ? 6 : dayIdx - 1;
      return monSunIdx === selectedDay;
    });
  }, [baseFilteredProducts, selectedDay]);

  const sortedProducts = useMemo(() => {
    return [...tableFilteredProducts].sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      return (aVal < bVal ? -1 : 1) * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [tableFilteredProducts, sortColumn, sortDirection]);

  const getStatusBadge = (quantity: number) => {
    if (quantity <= 0) return <Badge variant="destructive" className="rounded-full px-3 py-1 bg-red-100 text-red-700 border-none font-semibold">Out of Stock</Badge>;
    if (quantity <= 10) return <Badge variant="secondary" className="rounded-full px-3 py-1 bg-orange-100 text-orange-700 border-none font-semibold">Low Stock</Badge>;
    return <Badge variant="secondary" className="rounded-full px-3 py-1 bg-green-100 text-green-700 border-none font-semibold">In Stock</Badge>;
  };

  const handleSort = (column: keyof Product) => {
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
      costPriceFormatted: `${p.costPrice.toLocaleString()} RWF`,
      status: p.quantity === 0 ? 'Out of Stock' : p.quantity <= 5 ? 'Low Stock' : 'In Stock',
      confirmed: p.confirm ? 'Yes' : 'No',
      addedDateFormatted: p.addedDate ? new Date(p.addedDate).toLocaleDateString() : '-',
    }));
  };

  const handleExportExcel = () => {
    exportToExcel(getExportData(), storeExportColumns, `store-products-${currentBranchName}`);
    toast.success('Exported to Excel');
  };

  const handleExportPDF = () => {
    exportToPDF(getExportData(), storeExportColumns, `store-products-${currentBranchName}`, `Store Products - ${currentBranchName}`);
    toast.success('Exported to PDF');
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
    const targetBranch = isAdmin ? (newProduct.branch || userBranch) : userBranch;

    if (!targetBranch) {
      toast.error('Please select a branch');
      return;
    }
    if (!newProduct.productName || !newProduct.category || newProduct.costPrice === '' || newProduct.quantity === '' || Number(newProduct.quantity) < 1 || Number(newProduct.costPrice) < 0) {
      toast.error('Fill all required fields correctly');
      return;
    }

    // Date Logic
    let finalDeadline = newProduct.deadline;
    if (!finalDeadline) {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      finalDeadline = d.toISOString().split('T')[0];
    } else {
      // Validate past date
      const selectedDate = new Date(finalDeadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        toast.error('Cannot set a past date');
        return;
      }
    }

    setActionLoading(true);
    const qty = Number(newProduct.quantity);
    const totalCost = Number(newProduct.costPrice);
    const unitCost = totalCost / qty;

    const productData: Partial<Product> = {
      productName: newProduct.productName,
      category: newProduct.category,
      model: newProduct.model,
      quantity: qty,
      costPrice: unitCost,
      unit: newProduct.unit,
      branch: targetBranch,
      quantityPerUnit: Number(newProduct.quantityPerUnit) || 1,
      baseUnit: newProduct.baseUnit || newProduct.unit,
      status: 'store',
      addedDate: new Date().toISOString(),
      confirm: isAdmin ? true : false,
      businessId: businessId,
      deadline: finalDeadline,
    };

    const result = await addOrUpdateProduct(productData);

    if (result) {
      setProducts(prev => {
        const existing = prev.find(p => p.id === result.id);
        if (existing) return prev.map(p => p.id === result.id ? result : p);
        return [...prev, result];
      });
      toast.success(isOnline ? 'Product added' : 'Added locally');
      setAddDialogOpen(false);
      setNewProduct({
        productName: '',
        category: '',
        model: '',
        quantity: '',
        costPrice: '',
        branch: '',
        unit: 'pcs',
        quantityPerUnit: '1',
        baseUnit: 'pcs',
        deadline: '',
        confirm: false
      });
    }
    setActionLoading(false);
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct) return;
    if (!currentProduct.productName.trim() || !currentProduct.category.trim() || currentProduct.costPrice < 0 || currentProduct.quantity < 0) {
      toast.error('Invalid data');
      return;
    }

    setActionLoading(true);
    const qty = currentProduct.quantity;
    const totalCost = currentProduct.costPrice; // Note: In the EDIT form, we'll also treat this as Total Cost per user request
    const unitCost = totalCost / qty;

    const updates: Partial<Product> = {
      productName: currentProduct.productName.trim(),
      category: currentProduct.category.trim(),
      model: currentProduct.model?.trim() || null,
      costPrice: unitCost,
      quantity: currentProduct.quantity,
      unit: currentProduct.unit,
      quantityPerUnit: currentProduct.quantityPerUnit,
      baseUnit: currentProduct.baseUnit,
      updatedAt: new Date().toISOString()
    };

    const success = await updateProduct(currentProduct.id!, updates);
    if (success) {
      setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...updates } : p));
      toast.success('Updated');
      setEditDialogOpen(false);
      setCurrentProduct(null);
      setNewProduct({ productName: '', category: '', model: '', quantity: '', costPrice: '', unit: 'pcs', branch: '', quantityPerUnit: '1', baseUnit: 'pcs', deadline: '', confirm: isAdmin });
    }
    setActionLoading(false);
  };

  const openConfirmSale = () => setConfirmSaleDialogOpen(true);

  const handleSellConfirm = async () => {
    if (!currentProduct || sellForm.quantity === '' || sellForm.sellingPrice === '') return;
    const qty = Number(sellForm.quantity);
    const price = Number(sellForm.sellingPrice);
    if (qty > currentProduct.quantity || price <= 0 || qty <= 0) {
      toast.error('Invalid sale');
      return;
    }

    setActionLoading(true);
    // Convert to base quantity for the server call
    const qtyPerUnit = currentProduct.quantityPerUnit || 1;
    const baseQtyToSell = sellForm.sellInBaseUnit ? qty : (qty * qtyPerUnit);
    const stockUnitsToDecrement = baseQtyToSell / qtyPerUnit;

    const success = await sellProduct(currentProduct.id!, baseQtyToSell, price, sellForm.deadline, userBranch);
    if (success) {
      setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, quantity: p.quantity - stockUnitsToDecrement } : p));
      toast.success(`Sold ${qty} ${sellForm.sellInBaseUnit ? (currentProduct.baseUnit || 'units') : (currentProduct.unit || 'units')}`);
      setSellDialogOpen(false);
      setConfirmSaleDialogOpen(false);
      setSellForm({ quantity: '', sellingPrice: '', deadline: '', sellInBaseUnit: true });
    }
    setActionLoading(false);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setActionLoading(true);
    const success = await deleteProduct(productToDelete);
    if (success) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      toast.success('Deleted');
      setDeleteConfirmOpen(false);
    }
    setActionLoading(false);
  };

  const openConfirmProductDialog = (id: string, current: boolean) => {
    setProductToConfirm({ id, current });
    setConfirmProductDialogOpen(true);
  };

  const handleConfirmProduct = async () => {
    if (!productToConfirm || !canConfirm) return;
    setActionLoading(true);
    const success = await updateProduct(productToConfirm.id, { confirm: !productToConfirm.current });
    if (success) {
      setProducts(prev => prev.map(p => p.id === productToConfirm.id ? { ...p, confirm: !productToConfirm.current } : p));
      toast.success('Status updated');
      setConfirmProductDialogOpen(false);
      setProductToConfirm(null);
    }
    setActionLoading(false);
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
      <SEOHelmet title="Store Products" description="Manage store inventory" />

      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Store Products</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'All branches' : (canAddProduct ? `Products in ${currentBranchName}` : 'No branch assigned')}
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
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {(isAdmin || canAddProduct) && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            )}
          </div>
        </div>

        {/* Top Summary Stats (This Week, Month, Year) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-all duration-300 transform group-hover:scale-110">
              <Package className="h-16 w-16" />
            </div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium opacity-80 uppercase tracking-wider">This Week</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h2 className="text-3xl font-bold">{storeStats.week.value.toLocaleString()}</h2>
                <span className="text-sm font-semibold opacity-70">RWF</span>
              </div>
              <p className="text-xs mt-4 flex items-center gap-1">
                <Badge variant="outline" className="text-white border-white/30 bg-white/10">
                  {storeStats.week.count} Products Added
                </Badge>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-md overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-all duration-300 transform group-hover:scale-110">
              <Calendar className="h-16 w-16" />
            </div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium opacity-80 uppercase tracking-wider">This Month</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h2 className="text-3xl font-bold">{storeStats.month.value.toLocaleString()}</h2>
                <span className="text-sm font-semibold opacity-70">RWF</span>
              </div>
              <p className="text-xs mt-4 flex items-center gap-1">
                <Badge variant="outline" className="text-white border-white/30 bg-white/10">
                  {storeStats.month.count} Products Added
                </Badge>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-md overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-all duration-300 transform group-hover:scale-110">
              <LayoutDashboard className="h-16 w-16" />
            </div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium opacity-80 uppercase tracking-wider">This Year</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h2 className="text-3xl font-bold">{storeStats.year.value.toLocaleString()}</h2>
                <span className="text-sm font-semibold opacity-70">RWF</span>
              </div>
              <p className="text-xs mt-4 flex items-center gap-1">
                <Badge variant="outline" className="text-white border-white/30 bg-white/10">
                  {storeStats.year.count} Products Added
                </Badge>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monday to Sunday Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
            <Card
              key={day}
              className={`cursor-pointer transition-all duration-200 border shadow-sm hover:ring-2 hover:ring-blue-400 ${selectedDay === idx ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}`}
              onClick={() => setSelectedDay(selectedDay === idx ? null : idx)}
            >
              <CardContent className="p-4 text-center">
                <p className={`text-sm font-bold uppercase ${selectedDay === idx ? 'text-blue-600' : 'text-gray-500'}`}>{day}</p>
                <div className="mt-2 text-xl font-black">{storeStats.daily[idx].count}</div>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  {storeStats.daily[idx].value.toLocaleString()} RWF
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters - No Branch Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-white dark:bg-gray-900 p-6 rounded-none border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search name, category, model..."
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

          {canConfirm && (
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

        {/* Desktop Table - No Branch Column */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1">Product Name <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Category <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('model')}>
                  <div className="flex items-center gap-1">Model <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-1 justify-center">Stock Qty <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Subunit Info</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('costPrice')}>
                  <div className="flex items-center gap-1">Cost per Unit <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('addedDate')}>
                  <div className="flex items-center gap-1">Added Date <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode='popLayout'>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Package className="h-12 w-12 opacity-20" />
                        <p className="text-lg font-medium">No products found matching your filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProducts.map((product, idx) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      layout // Smooth layout transitions
                      className="group hover:bg-muted/30 transition-colors border-b last:border-0"
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                        {product.productName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">
                        {product.model || '-'}
                      </TableCell>
                      <TableCell className="text-center font-bold text-lg">
                        {Math.floor(product.quantity)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {product.unit || 'pcs'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-semibold">{product.quantityPerUnit || 1}</span>
                          <span className="ml-1 text-muted-foreground">{product.baseUnit || product.unit || 'pcs'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {Number(product.costPrice || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">RWF</span>
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-600 dark:text-amber-400">
                        {Number(product.quantity * (product.costPrice || 0)).toLocaleString()} RWF
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={product.confirm ? "default" : "secondary"}
                            className={product.confirm
                              ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"
                            }
                          >
                            {product.confirm ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Confirmed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Pending
                              </span>
                            )}
                          </Badge>
                          {(canConfirm && !product.confirm) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                              onClick={() => openConfirmProductDialog(product.id!, product.confirm)}
                            >
                              Confirm
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {product.addedDate ? new Date(product.addedDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setCurrentProduct(product);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isStaff && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                              onClick={() => {
                                setCurrentProduct({
                                  ...product,
                                  costPrice: product.quantity * (product.costPrice || 0)
                                });
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => {
                              setCurrentProduct(product);
                              setSellForm({
                                quantity: '',
                                sellingPrice: product.sellingPrice || (product.costPrice / (product.quantityPerUnit || 1)),
                                deadline: product.deadline || '',
                                sellInBaseUnit: true
                              });
                              // Staff cannot sell unconfirmed products
                              if (user?.role === 'staff' && !product.confirm) {
                                toast.error("You cannot sell an unconfirmed product.");
                                return;
                              }
                              setSellDialogOpen(true);
                            }}
                            disabled={!isOnline || (user?.role === 'staff' && !product.confirm)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          {!isStaff && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setProductToDelete(product.id!);
                                setDeleteConfirmOpen(true);
                              }}
                              disabled={!isOnline}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div >

        {/* Mobile Cards */}
        < div className="md:hidden space-y-3" >
          {
            sortedProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No products found.</div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {sortedProducts.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    layout // Smooth layout transitions
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold truncate">{p.productName}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                              {p.model && <Badge variant="outline" className="text-xs">{p.model}</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="font-bold">{p.quantity} {p.unit || 'pcs'}</Badge>
                            {getStatusBadge(p.quantity)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className={`text-sm font-medium ${getPriceColor(Number(p.costPrice || 0))}`}>
                            {(p.costPrice && Number(p.costPrice) > 0) ? Number(p.costPrice).toLocaleString() : '0'} RWF
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 gap-1">
                                Actions <ArrowUpDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setCurrentProduct(p); setDetailsDialogOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setCurrentProduct(p); setSellDialogOpen(true); }}
                                disabled={!p.confirm}
                              >
                                <ShoppingCart className="mr-2 h-4 w-4" /> Sell
                              </DropdownMenuItem>

                              {isAdmin && (
                                <DropdownMenuItem onClick={() => { setCurrentProduct(p); setEditDialogOpen(true); }}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem onClick={() => { setProductToDelete(p.id!); setDeleteConfirmOpen(true); }} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )
          }
        </div >

        {/* All Dialogs - Add, Edit, Sell, Confirm, Details, Delete */}
        < Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen} >
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                {isAdmin ? 'Auto-confirmed' : 'Requires admin confirmation'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Product Name *</Label>
                <Input value={newProduct.productName} onChange={e => setNewProduct(p => ({ ...p, productName: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(val) => setNewProduct(p => ({ ...p, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MIXED_SHOP_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Model (optional)</Label>
                <Input value={newProduct.model} onChange={e => setNewProduct(p => ({ ...p, model: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={newProduct.quantity} onChange={e => setNewProduct(p => ({ ...p, quantity: e.target.value === '' ? '' : Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Unit *</Label>
                  <Select
                    value={newProduct.unit}
                    onValueChange={(val) => setNewProduct(p => ({ ...p, unit: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                      <SelectItem value="bag">Bag</SelectItem>
                      <SelectItem value="crate">Crate</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="sack">Sack</SelectItem>
                      <SelectItem value="bottle">Bottle</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Quantity per Unit *</Label>
                  <Input
                    type="number"
                    value={newProduct.quantityPerUnit}
                    onChange={e => setNewProduct(p => ({ ...p, quantityPerUnit: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="e.g. 24 for Bag"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Base Unit *</Label>
                  <Input
                    value={newProduct.baseUnit}
                    onChange={e => setNewProduct(p => ({ ...p, baseUnit: e.target.value }))}
                    placeholder="e.g. kg, liters"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Total Cost Price *</Label>
                  <Input type="number" value={newProduct.costPrice} onChange={e => setNewProduct(p => ({ ...p, costPrice: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Cost of all quantities" />
                </div>
              </div>
              {isAdmin && (
                <div className="grid gap-2">
                  <Label>Branch</Label>
                  <Select
                    value={newProduct.branch || userBranch || ''}
                    onValueChange={(val) => setNewProduct(p => ({ ...p, branch: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddProduct} disabled={actionLoading}>
                {actionLoading ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >
        {/* Edit Product Dialog – Fixed null error */}
        < Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen} >
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update all product details including quantity</DialogDescription>
            </DialogHeader>

            {currentProduct ? (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={currentProduct.productName}
                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, productName: e.target.value } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Category *</Label>
                  <Select
                    value={currentProduct.category}
                    onValueChange={(val) => setCurrentProduct(prev => prev ? { ...prev, category: val } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {MIXED_SHOP_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Model (optional)</Label>
                  <Input
                    value={currentProduct.model || ''}
                    onChange={e => setCurrentProduct(prev => prev ? { ...prev, model: e.target.value || null } : null)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={currentProduct.quantity}
                      onChange={e => setCurrentProduct(prev => prev ? { ...prev, quantity: Number(e.target.value) || 0 } : null)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Unit *</Label>
                    <Select
                      value={currentProduct.unit}
                      onValueChange={(val) => setCurrentProduct(prev => prev ? { ...prev, unit: val } : null)}
                    >
                      <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                        <SelectItem value="bag">Bag</SelectItem>
                        <SelectItem value="crate">Crate</SelectItem>
                        <SelectItem value="liter">Liter</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="sack">Sack</SelectItem>
                        <SelectItem value="bottle">Bottle</SelectItem>
                        <SelectItem value="pack">Pack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Qty per Unit *</Label>
                    <Input
                      type="number"
                      value={currentProduct.quantityPerUnit}
                      onChange={e => setCurrentProduct(prev => prev ? { ...prev, quantityPerUnit: Number(e.target.value) || 1 } : null)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Base Unit *</Label>
                      <Input
                        value={currentProduct.baseUnit}
                        onChange={e => setCurrentProduct(prev => prev ? { ...prev, baseUnit: e.target.value } : null)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Total Cost Price *</Label>
                      <Input
                        type="number"
                        value={currentProduct.costPrice}
                        onChange={e => setCurrentProduct(prev => prev ? { ...prev, costPrice: Number(e.target.value) || 0 } : null)}
                        placeholder="Cost of all quantities"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Loading product details...
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditDialogOpen(false); setCurrentProduct(null); }}>Cancel</Button>
              <Button onClick={handleUpdateProduct} disabled={actionLoading || !currentProduct}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sell Dialog */}
        < Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen} >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sell Product</DialogTitle>
              <DialogDescription>
                {currentProduct?.productName} (Available: {currentProduct?.quantity ?? 0})
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-6 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Selling Unit</Label>
                    <Select
                      value={sellForm.sellInBaseUnit ? 'base' : 'stock'}
                      onValueChange={(val) => setSellForm(s => ({ ...s, sellInBaseUnit: val === 'base' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Selling Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">{currentProduct.unit || 'Stock Unit'}</SelectItem>
                        <SelectItem value="base">{currentProduct.baseUnit || 'Base Unit'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Quantity to Sell *</Label>
                    <Input
                      type="number"
                      value={sellForm.quantity}
                      onChange={e => setSellForm(s => ({ ...s, quantity: e.target.value === '' ? '' : Number(e.target.value) }))}
                      placeholder={sellForm.sellInBaseUnit ? `Amount in ${currentProduct.baseUnit || 'base units'}` : `Number of ${currentProduct.unit || 'stock units'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Selling Price (per {sellForm.sellInBaseUnit ? (currentProduct.baseUnit || 'unit') : (currentProduct.unit || 'unit')}) *</Label>
                    <Input
                      type="number"
                      value={sellForm.sellingPrice}
                      onChange={e => setSellForm(s => ({ ...s, sellingPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
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
                </div>

                {(() => {
                  const qtyPerUnit = currentProduct.quantityPerUnit || 1;
                  const totalBaseStock = currentProduct.quantity * qtyPerUnit;
                  const baseQtyToSell = sellForm.sellInBaseUnit ? Number(sellForm.quantity) : (Number(sellForm.quantity) * qtyPerUnit);

                  if (baseQtyToSell > totalBaseStock) {
                    return (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Quantity exceeds available stock.</AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}

                {Number(sellForm.quantity) > 0 && Number(sellForm.sellingPrice) > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                    <CardContent className="pt-6 space-y-3">
                      {(() => {
                        const qtyPerUnit = currentProduct.quantityPerUnit || 1;
                        const baseQtyToSell = sellForm.sellInBaseUnit ? Number(sellForm.quantity) : (Number(sellForm.quantity) * qtyPerUnit);
                        const costPerBaseUnit = currentProduct.costPrice / qtyPerUnit;
                        const totalCost = baseQtyToSell * costPerBaseUnit;
                        const totalReceived = Number(sellForm.quantity) * Number(sellForm.sellingPrice);
                        const profit = totalReceived - totalCost;

                        return (
                          <>
                            <div className="flex justify-between text-lg">
                              <span>Total Received:</span>
                              <span className="font-bold">
                                {totalReceived.toLocaleString()} RWF
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground italic">
                              <span>Units to Sell:</span>
                              <span>
                                {sellForm.sellInBaseUnit
                                  ? `${Number(sellForm.quantity).toLocaleString()} ${currentProduct.baseUnit || 'units'}`
                                  : `${Number(sellForm.quantity).toLocaleString()} ${currentProduct.unit || 'units'}`}
                              </span>
                            </div>
                            <div className="flex justify-between text-lg">
                              <span>Cost of Goods:</span>
                              <span>{totalCost.toLocaleString()} RWF</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-2 border-t">
                              <span>Profit:</span>
                              <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {profit.toLocaleString()} RWF
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSellDialogOpen(false); setSellForm({ quantity: '', sellingPrice: '', deadline: '', sellInBaseUnit: true }); }}>
                Cancel
              </Button>
              <Button
                onClick={openConfirmSale}
                disabled={
                  actionLoading ||
                  !currentProduct ||
                  Number(sellForm.quantity) <= 0 ||
                  Number(sellForm.sellingPrice) <= 0 ||
                  (sellForm.sellInBaseUnit
                    ? Number(sellForm.quantity) > (currentProduct.quantity * (currentProduct.quantityPerUnit || 1))
                    : Number(sellForm.quantity) > currentProduct.quantity)
                }
              >
                Proceed to Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >

        {/* Confirm Sale Dialog */}
        < Dialog open={confirmSaleDialogOpen} onOpenChange={setConfirmSaleDialogOpen} >
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Sale</DialogTitle></DialogHeader>
            <DialogDescription className="space-y-3">
              <p>Are you sure you want to confirm this sale?</p>
              <div className="font-medium">
                <p>Product: <strong>{currentProduct?.productName}</strong></p>
                <p>Quantity: <strong>{sellForm.quantity} {sellForm.sellInBaseUnit ? currentProduct?.baseUnit : currentProduct?.unit}</strong></p>
                <p>Price: <strong>{Number(sellForm.sellingPrice).toLocaleString()} RWF / {sellForm.sellInBaseUnit ? currentProduct?.baseUnit : currentProduct?.unit}</strong></p>
                <p className="text-lg pt-2">Total Total: <strong>{(Number(sellForm.quantity) * Number(sellForm.sellingPrice)).toLocaleString()} RWF</strong></p>
              </div>
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmSaleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSellConfirm} disabled={actionLoading}>Yes, Confirm Sale</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >

        {/* Confirm Product Status */}
        < Dialog open={confirmProductDialogOpen} onOpenChange={setConfirmProductDialogOpen} >
          <DialogContent>
            <DialogHeader><DialogTitle>Change Confirmation Status</DialogTitle></DialogHeader>
            <DialogDescription>
              Are you sure you want to <strong>{productToConfirm && !productToConfirm.current ? 'confirm' : 'unconfirm'}</strong> this product?
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmProductDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmProduct} disabled={actionLoading}>Confirm Change</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >

        {/* Details Dialog */}
        < Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} >
          <DialogContent>
            <DialogHeader><DialogTitle>Product Details</DialogTitle></DialogHeader>
            {currentProduct && (
              <div className="space-y-2 py-4">
                <p><strong>Name:</strong> {currentProduct.productName}</p>
                <p><strong>Category:</strong> {currentProduct.category}</p>
                <p><strong>Model:</strong> {currentProduct.model || '-'}</p>
                <p><strong>Quantity:</strong> {currentProduct.quantity} {currentProduct.unit || 'pcs'}</p>
                <p><strong>Branch:</strong> {getBranchName(currentProduct.branch)}</p>
                <p><strong>Cost Price:</strong> {currentProduct.costPrice.toLocaleString()} RWF</p>
                <p><strong>Status:</strong> {getStatusBadge(currentProduct.quantity)}</p>
                <p><strong>Confirmed:</strong> {currentProduct.confirm ? 'Yes' : 'No'}</p>
                <p><strong>Added:</strong> {currentProduct.addedDate ? new Date(currentProduct.addedDate).toLocaleDateString() : '-'}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >

        {/* Delete Confirmation */}
        < Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} >
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Product?</DialogTitle></DialogHeader>
            <DialogDescription>This action cannot be undone.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteProduct} disabled={actionLoading}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >

      </div >
    </>
  );
};

export default ProductsStorePage;