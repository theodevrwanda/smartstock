// src/pages/ProductsStorePage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, Eye, Edit, Trash2, ShoppingCart, Download, FileSpreadsheet, FileText, ArrowUpDown, CheckCircle, XCircle, AlertCircle, Info, Package, DollarSign, TrendingUp, LayoutDashboard, Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isSameDay,
  isWithinInterval,
  eachDayOfInterval
} from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

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
    costType: 'per' as 'per' | 'all',
    branch: '',
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
      .filter(p => confirmFilter === 'All' || (confirmFilter === 'Confirmed' ? p.confirm : !p.confirm))
      .filter(p => {
        if (!selectedDate) return true;
        const pDate = new Date(p.addedDate);
        return pDate.getFullYear() === selectedDate.getFullYear() &&
          pDate.getMonth() === selectedDate.getMonth() &&
          pDate.getDate() === selectedDate.getDate();
      })
      .filter(p => {
        if (selectedDay === null) return true;
        const pDate = new Date(p.addedDate);
        const dayIdx = pDate.getDay();
        const monSunIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        return monSunIdx === selectedDay;
      });
  }, [products, searchTerm, branchFilter, categoryFilter, minPrice, maxPrice, minQty, maxQty, confirmFilter, selectedDate, selectedDay]);

  // Store Summary Stats
  const storeStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const selDate = selectedDate || new Date();
    const startOfSelectedYear = startOfYear(selDate);
    const startOfSelectedMonth = startOfMonth(selDate);
    const startOfSelectedWeek = startOfWeek(selDate, { weekStartsOn: 1 });
    const endOfSelectedWeek = endOfWeek(selDate, { weekStartsOn: 1 });
    const weeklyDays = eachDayOfInterval({ start: startOfSelectedWeek, end: endOfSelectedWeek });

    const stats = {
      today: { value: 0, count: 0 },
      week: { value: 0, count: 0 },
      month: { value: 0, count: 0 },
      year: { value: 0, count: 0 },
      daily: Array(7).fill(0).map(() => ({ value: 0, count: 0 })),
      currentDayIdx: selDate.getDay() === 0 ? 6 : selDate.getDay() - 1,
      timelineDays: weeklyDays.map(day => format(day, 'EEE').toUpperCase()),
      timelineDates: weeklyDays
    };

    baseFilteredProducts.forEach(p => {
      const addedDateObj = p.addedDate ? new Date(p.addedDate) : null;
      if (!addedDateObj) return;

      const value = p.costType === 'all'
        ? (p.costPrice || 0)
        : (p.quantity * (p.costPrice || 0));

      if (isSameDay(addedDateObj, selDate)) {
        stats.today.value += value;
        stats.today.count++;
      }
      if (isWithinInterval(addedDateObj, { start: startOfSelectedWeek, end: endOfSelectedWeek })) {
        stats.week.value += value;
        stats.week.count++;

        const dayIdx = addedDateObj.getDay();
        const monSunIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        if (monSunIdx >= 0 && monSunIdx < 7) {
          stats.daily[monSunIdx].value += value;
          stats.daily[monSunIdx].count++;
        }
      }
      if (isWithinInterval(addedDateObj, { start: startOfSelectedMonth, end: endOfMonth(selDate) })) {
        stats.month.value += value;
        stats.month.count++;
      }
      if (isWithinInterval(addedDateObj, { start: startOfSelectedYear, end: endOfYear(selDate) })) {
        stats.year.value += value;
        stats.year.count++;
      }
    });

    return stats;
  }, [baseFilteredProducts, selectedDate]);

  // Table Filtering (Now identical to baseFilteredProducts)
  const tableFilteredProducts = baseFilteredProducts;

  const sortedProducts = useMemo(() => {
    return [...tableFilteredProducts].sort((a, b) => {
      let aVal = a[sortColumn as keyof Product];
      let bVal = b[sortColumn as keyof Product];

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
    const enteredCost = Number(newProduct.costPrice);
    const unitPrice = newProduct.costType === 'all' ? enteredCost / qty : enteredCost;

    const productData: {
      productName: string;
      category: string;
      model?: string;
      quantity: number;
      costPrice: number;
      costPricePerUnit: number;
      unit?: string;
      branch: string;
      confirm: boolean;
      businessId: string;
      deadline?: string;
      costType?: 'unit' | 'total';
      status: 'store';
      addedDate: string;
    } = {
      productName: newProduct.productName,
      category: newProduct.category,
      model: newProduct.model || undefined,
      quantity: qty,
      costPrice: enteredCost,
      costPricePerUnit: unitPrice,
      unit: newProduct.unit,
      branch: targetBranch,
      status: 'store',
      addedDate: new Date().toISOString(),
      confirm: isAdmin ? true : false,
      businessId: businessId || '',
      deadline: finalDeadline,
      costType: newProduct.costType,
    };

    const result = await addOrUpdateProduct(productData as unknown as Product);

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
        costType: 'unit' as 'unit' | 'total',
        deadline: '',
        confirm: isAdmin ? true : false
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
    const qty = Number(currentProduct.quantity);
    const enteredCost = Number(currentProduct.costPrice);
    const unitPrice = currentProduct.costType === 'all' ? enteredCost / qty : enteredCost;

    const updates: Partial<Product> = {
      productName: currentProduct.productName.trim(),
      category: currentProduct.category.trim(),
      model: currentProduct.model?.trim() || null,
      costPrice: enteredCost,
      costPricePerUnit: unitPrice,
      quantity: qty,
      unit: currentProduct.unit,
      costType: currentProduct.costType,
      updatedAt: new Date().toISOString()
    };

    const success = await updateProduct(currentProduct.id!, updates);
    if (success) {
      setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...updates } : p));
      toast.success('Updated');
      setEditDialogOpen(false);
      setCurrentProduct(null);
      setNewProduct({ productName: '', category: '', model: '', quantity: '', costPrice: '', unit: 'pcs', costType: 'unit', branch: '', deadline: '', confirm: isAdmin });
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
    // Calculate unit cost for profit later if needed
    const unitCost = currentProduct.costType === 'all' ? (currentProduct.costPrice / currentProduct.quantity) : currentProduct.costPrice;

    // We pass the price per unit to sellProduct
    const success = await sellProduct(currentProduct.id!, qty, price, sellForm.deadline, userBranch);
    if (success) {
      setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, quantity: p.quantity - qty } : p));
      toast.success(`Sold ${qty} units`);
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
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={selectedDate ? 'border-primary text-primary' : ''}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
                {selectedDate && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" className="w-full text-xs" onClick={() => setSelectedDate(undefined)}>Clear Date</Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

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
              <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            )}
          </div>
        </div>

        {/* Analytics Cards - Redesigned like Sold Page */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Weekly Added Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100 uppercase tracking-wider">Weekly Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{storeStats.week.value.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                  <p className="text-xs text-blue-100 mt-1 opacity-80">{storeStats.week.count} products added this week</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <TrendingUp size={120} />
            </div>
          </Card>

          {/* Monthly Added Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100 uppercase tracking-wider">Monthly Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{storeStats.month.value.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                  <p className="text-xs text-emerald-100 mt-1 opacity-80">{storeStats.month.count} products added this month</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Package size={120} />
            </div>
          </Card>

          {/* Yearly Added Card */}
          <Card className="relative overflow-hidden bg-gray-900 text-white border-none shadow-xl border-l-4 border-l-orange-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays size={14} className="text-orange-500" />
                Yearly Investment
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase border-orange-500/50 text-orange-500 font-bold bg-orange-500/10">
                {selectedDate ? format(selectedDate, 'yyyy') : format(new Date(), 'yyyy')} Yearly
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Period Investment</p>
                  <div className="text-3xl font-bold">{storeStats.year.value.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                  <p className="text-xs text-orange-500 mt-1 font-semibold">{storeStats.year.count} products added</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monday to Sunday Grid - Matching Sold Page Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
            const isSelected = selectedDay === idx;
            const now = new Date();
            const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
            const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
            const isTodayInGrid = isSameDay(storeStats.timelineDates[idx], now);

            return (
              <motion.div
                key={day}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedDay(isSelected ? null : idx)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all duration-300 relative",
                  isSelected
                    ? "bg-amber-950/90 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-white ring-2 ring-amber-500/50"
                    : isTodayInGrid
                      ? "bg-blue-50/50 border-blue-400 dark:bg-blue-900/20 dark:border-blue-700 shadow-sm"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                )}
              >
                {isTodayInGrid && !isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm uppercase">
                    Today
                  </div>
                )}
                <div className="flex flex-col items-center text-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold tracking-tighter uppercase",
                    isSelected ? "text-amber-500" : "text-gray-400 dark:text-gray-600"
                  )}>
                    {day} {isSelected && "•"}
                  </span>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-sm font-black",
                      isSelected ? "text-white" : "text-blue-600 dark:text-blue-400"
                    )}>
                      {storeStats.daily[idx].value.toLocaleString()}
                    </span>
                    <span className={cn(
                      "text-[9px] uppercase font-medium opacity-60",
                      isSelected ? "text-amber-200" : "text-gray-500"
                    )}>
                      value
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
                  <div className="flex items-center gap-1">Name <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Category <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('model')}>
                  <div className="flex items-center gap-1">Model <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-1 justify-center">Quantity <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                {isAdmin && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort('branch')}>
                    <div className="flex items-center gap-1">Branch Name <ArrowUpDown className="h-4 w-4" /></div>
                  </TableHead>
                )}
                <TableHead className="cursor-pointer" onClick={() => handleSort('costPrice')}>
                  <div className="flex items-center gap-1">Cost Price <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('addedDate')}>
                  <div className="flex items-center gap-1">Added Date <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode='popLayout'>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 13 : 12} className="h-64 text-center text-muted-foreground">
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
                      <TableCell className="text-center font-bold">
                        {product.quantity}{product.unit || 'pcs'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 text-[10px]">
                            {getBranchName(product.branch)}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{Number(product.costType === 'all' ? (product.costPricePerUnit || (product.costPrice / product.quantity)) : product.costPrice || 0).toLocaleString()} RWF</span>
                          {product.costType === 'all' && (
                            <span className="text-[10px] text-muted-foreground">Budget: {Number(product.costPrice).toLocaleString()} RWF</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-600 dark:text-amber-400">
                        {product.costType === 'all'
                          ? Number(product.costPrice || 0).toLocaleString()
                          : Number(product.quantity * (product.costPrice || 0)).toLocaleString()} RWF
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {product.addedDate ? format(new Date(product.addedDate), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(product.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          {/* Confirmation Icon Toggle */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${product.confirm ? 'text-green-500 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`}
                            onClick={() => isAdmin && openConfirmProductDialog(product.id!, product.confirm)}
                            disabled={!isAdmin}
                          >
                            {product.confirm ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <AlertCircle className="h-5 w-5 shadow-sm" />
                            )}
                          </Button>

                          <div className="h-4 w-[1px] bg-gray-200 mx-1" />

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
                                sellingPrice: product.sellingPrice || (product.costPrice / 1),
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
        <div className="md:hidden space-y-3">
          {sortedProducts.length === 0 ? (
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
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase">Unit Cost</span>
                          <span className={`text-sm font-medium ${getPriceColor(Number(p.costPricePerUnit || (p.costType === 'all' ? p.costPrice / p.quantity : p.costPrice) || 0))}`}>
                            {Number(p.costPricePerUnit || (p.costType === 'all' ? p.costPrice / p.quantity : p.costPrice) || 0).toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground uppercase">Total Value</span>
                          <span className="text-lg font-black text-amber-600">
                            {p.costType === 'all'
                              ? Number(p.costPrice || 0).toLocaleString()
                              : Number(p.quantity * (p.costPrice || 0)).toLocaleString()} RWF
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                        <span>Added: {p.addedDate ? format(new Date(p.addedDate), 'dd MMM yyyy') : '-'}</span>
                        {isAdmin && <span>{getBranchName(p.branch)}</span>}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 flex-1 gap-1">
                              Actions <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setCurrentProduct(p); setDetailsDialogOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setCurrentProduct(p); setSellDialogOpen(true); }}
                              disabled={!p.confirm}
                            >
                              <ShoppingCart className="mr-2 h-4 w-4" /> Sell Product
                            </DropdownMenuItem>

                            {isAdmin && (
                              <DropdownMenuItem onClick={() => { setCurrentProduct(p); setEditDialogOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Product
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => { setProductToDelete(p.id!); setDeleteConfirmOpen(true); }} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 rounded-full ${p.confirm ? 'text-green-500 bg-green-50' : 'text-amber-500 bg-amber-50'}`}
                          onClick={() => isAdmin && openConfirmProductDialog(p.id!, p.confirm)}
                          disabled={!isAdmin}
                        >
                          {p.confirm ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* All Dialogs - Add, Edit, Sell, Confirm, Details, Delete */}
        < Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen} >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                {isAdmin ? 'Auto-confirmed' : 'Requires admin confirmation'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              {/* Form Section */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={newProduct.productName}
                    onChange={e => setNewProduct(p => ({ ...p, productName: e.target.value }))}
                    placeholder="e.g. Milk"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category *</Label>
                    <Select value={newProduct.category} onValueChange={(val) => setNewProduct(p => ({ ...p, category: val }))}>
                      <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {MIXED_SHOP_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Model (optional)</Label>
                    <Input value={newProduct.model} onChange={e => setNewProduct(p => ({ ...p, model: e.target.value }))} placeholder="e.g. 500ml" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newProduct.quantity}
                      onChange={e => setNewProduct(p => ({ ...p, quantity: e.target.value === '' ? '' : Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Unit *</Label>
                    <Select value={newProduct.unit} onValueChange={(val) => setNewProduct(p => ({ ...p, unit: val }))}>
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
                <div className="grid gap-2">
                  <Label>Cost Configuration *</Label>
                  <div className="flex bg-muted p-1 rounded-lg">
                    <Button
                      type="button"
                      variant={newProduct.costType === 'per' ? 'default' : 'ghost'}
                      className={`flex-1 text-xs h-8 ${newProduct.costType === 'per' ? 'bg-blue-600 shadow-md text-white' : 'border border-blue-200 hover:bg-blue-50'}`}
                      onClick={() => setNewProduct(p => ({ ...p, costType: 'per' }))}
                    >
                      Cost Per Unit
                    </Button>
                    <Button
                      type="button"
                      variant={newProduct.costType === 'all' ? 'default' : 'ghost'}
                      className={`flex-1 text-xs h-8 ${newProduct.costType === 'all' ? 'bg-blue-600 shadow-md text-white' : 'border border-blue-200 hover:bg-blue-50'}`}
                      onClick={() => setNewProduct(p => ({ ...p, costType: 'all' }))}
                    >
                      Total Bulk Cost
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{newProduct.costType === 'per' ? 'Cost Price per Unit *' : 'Total Cost Amount *'}</Label>
                  <Input
                    type="number"
                    value={newProduct.costPrice}
                    onChange={e => setNewProduct(p => ({ ...p, costPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder={newProduct.costType === 'per' ? "e.g. 500" : "e.g. 50000"}
                  />
                </div>
                {isAdmin && (
                  <div className="grid gap-2">
                    <Label>Branch Name *</Label>
                    <Select value={newProduct.branch || userBranch || ''} onValueChange={(val) => setNewProduct(p => ({ ...p, branch: val }))}>
                      <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map(b => <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Live Preview Section */}
              <div className="space-y-4">
                <div className="bg-muted/30 p-6 rounded-xl border h-full space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                    <Eye className="h-3 w-3" /> Live Preview
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Product Identity</p>
                      <p className="font-bold text-lg leading-tight">
                        {newProduct.productName || <span className="text-muted-foreground/30 italic">No Name</span>}
                        {newProduct.model && <span className="text-muted-foreground font-medium text-sm ml-2">({newProduct.model})</span>}
                      </p>
                      <Badge variant="secondary" className="mt-1">{newProduct.category || 'No Category'}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Quantity</p>
                        <p className="font-bold text-lg text-primary">{newProduct.quantity || 0} <span className="text-sm font-medium">{newProduct.unit}</span></p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">
                          {newProduct.costType === 'per' ? 'Unit Cost' : 'Budget (Total)'}
                        </p>
                        <p className="font-bold text-lg">{Number(newProduct.costPrice || 0).toLocaleString()} RWF</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      {newProduct.costType === 'all' && Number(newProduct.quantity) > 0 && (
                        <div className="flex justify-between items-center text-sm mb-2 p-2 bg-primary/5 rounded border border-primary/10">
                          <span className="text-muted-foreground font-medium">Calculated Unit Cost:</span>
                          <span className="font-bold text-primary">
                            {(Number(newProduct.costPrice || 0) / Number(newProduct.quantity)).toLocaleString(undefined, { maximumFractionDigits: 1 })} RWF
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Total Investment</span>
                        <span className="font-black text-xl text-amber-600">
                          {newProduct.costType === 'per'
                            ? (Number(newProduct.costPrice || 0) * Number(newProduct.quantity || 0)).toLocaleString()
                            : Number(newProduct.costPrice || 0).toLocaleString()} RWF
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-dashed">
                          <span className="text-muted-foreground">Target Branch</span>
                          <span className="font-semibold">{getBranchName(newProduct.branch || userBranch || '')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!newProduct.productName || !newProduct.category || !newProduct.costPrice || !newProduct.quantity ? (
                    <Alert className="bg-amber-50 border-amber-200 mt-4">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <AlertDescription className="text-amber-700 text-[10px]">
                        Please fill all required fields to record.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-blue-50 border-blue-200 mt-4">
                      <Info className="h-3 w-3 text-blue-600" />
                      <AlertDescription className="text-blue-700 text-[10px]">
                        Product ready for recording to inventory.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAddProduct}
                disabled={actionLoading || !newProduct.productName || !newProduct.category || !newProduct.costPrice || !newProduct.quantity}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
              >
                {actionLoading ? 'Recording...' : 'Record Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >
        {/* Edit Product Dialog – Fixed null error */}
        <Dialog open={editDialogOpen} onOpenChange={(val) => { setEditDialogOpen(val); if (!val) { setCurrentProduct(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update product details and see changes in real-time</DialogDescription>
            </DialogHeader>

            {currentProduct ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                {/* Form Section */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Product Name *</Label>
                    <Input
                      value={currentProduct.productName}
                      onChange={e => setCurrentProduct(prev => prev ? { ...prev, productName: e.target.value } : null)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Category *</Label>
                      <Select
                        value={currentProduct.category}
                        onValueChange={(val) => setCurrentProduct(prev => prev ? { ...prev, category: val } : null)}
                      >
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                          {MIXED_SHOP_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                  <div className="grid gap-2">
                    <Label>Cost Configuration *</Label>
                    <div className="flex bg-muted p-1 rounded-lg">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button
                          type="button"
                          variant={currentProduct.costType === 'per' ? 'default' : 'ghost'}
                          className={`text-xs h-8 ${currentProduct.costType === 'per' ? 'bg-blue-600 shadow-md' : 'border border-blue-200 hover:bg-blue-50'}`}
                          onClick={() => setCurrentProduct(prev => prev ? { ...prev, costType: 'per' } : null)}
                        >
                          Price per Unit
                        </Button>
                        <Button
                          type="button"
                          variant={currentProduct.costType === 'all' ? 'default' : 'ghost'}
                          className={`text-xs h-8 ${currentProduct.costType === 'all' ? 'bg-blue-600 shadow-md' : 'border border-blue-200 hover:bg-blue-50'}`}
                          onClick={() => setCurrentProduct(prev => prev ? { ...prev, costType: 'all' } : null)}
                        >
                          Total Bulk Cost
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>{currentProduct.costType === 'per' ? 'Cost Price per Unit *' : 'Total Cost Amount *'}</Label>
                      <Input
                        type="number"
                        value={currentProduct.costPrice}
                        onChange={e => setCurrentProduct(prev => prev ? { ...prev, costPrice: Number(e.target.value) || 0 } : null)}
                        placeholder={currentProduct.costType === 'per' ? "e.g. 500" : "e.g. 50000"}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Section */}
                <div className="space-y-4">
                  <div className="bg-muted/30 p-6 rounded-xl border h-full space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                      <Eye className="h-3 w-3" /> Live Preview
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Product Identity</p>
                        <p className="font-bold text-lg leading-tight">
                          {currentProduct.productName || <span className="text-muted-foreground/30 italic">No Name</span>}
                          {currentProduct.model && <span className="text-muted-foreground font-medium text-sm ml-2">({currentProduct.model})</span>}
                        </p>
                        <Badge variant="secondary" className="mt-1">{currentProduct.category || 'No Category'}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Quantity</p>
                          <p className="font-bold text-lg text-primary">{currentProduct.quantity || 0} <span className="text-sm font-medium">{currentProduct.unit}</span></p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase font-semibold">
                            {currentProduct.costType === 'per' ? 'Unit Cost' : 'Budget (Total)'}
                          </p>
                          <p className="font-bold text-lg">{Number(currentProduct.costPrice || 0).toLocaleString()} RWF</p>
                        </div>
                      </div>

                      {currentProduct.quantity > 0 && (
                        <div className="flex justify-between items-center text-sm mb-2 p-2 bg-primary/5 rounded border border-primary/10">
                          <span className="text-muted-foreground font-medium">Effective Unit Cost:</span>
                          <span className="font-bold text-primary">
                            {(currentProduct.costPricePerUnit || (currentProduct.costType === 'all' ? (Number(currentProduct.costPrice || 0) / Number(currentProduct.quantity)) : Number(currentProduct.costPrice || 0))).toLocaleString(undefined, { maximumFractionDigits: 1 })} RWF
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Total Value</span>
                        <span className="font-black text-xl text-amber-600">
                          {currentProduct.costType === 'per'
                            ? (Number(currentProduct.costPrice || 0) * Number(currentProduct.quantity || 0)).toLocaleString()
                            : Number(currentProduct.costPrice || 0).toLocaleString()} RWF
                        </span>
                      </div>
                    </div>
                  </div>
                  <Alert className="bg-blue-50 border-blue-200 mt-4">
                    <Info className="h-3 w-3 text-blue-600" />
                    <AlertDescription className="text-blue-700 text-[10px]">
                      Review changes and click save to apply updates.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">Loading product details...</div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setEditDialogOpen(false); setCurrentProduct(null); }}>Cancel</Button>
              <Button
                onClick={handleUpdateProduct}
                disabled={actionLoading || !currentProduct || !currentProduct.productName || !currentProduct.category}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog >

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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Quantity to Sell *</Label>
                    <Input
                      type="number"
                      value={sellForm.quantity}
                      onChange={e => setSellForm(s => ({ ...s, quantity: e.target.value === '' ? '' : Number(e.target.value) }))}
                      placeholder={`Amount in ${currentProduct.unit || 'units'}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Selling Price (per unit) *</Label>
                    <Input
                      type="number"
                      value={sellForm.sellingPrice}
                      onChange={e => setSellForm(s => ({ ...s, sellingPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                      placeholder="Price per unit"
                    />
                  </div>
                </div>

                {/* Profit Preview */}
                {(Number(sellForm.sellingPrice) > 0 || Number(sellForm.quantity) > 0) && (
                  <div className="bg-muted/50 p-4 rounded-xl border space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider">Unit Economics</span>
                      <Badge variant="outline" className="text-[10px] bg-white/50">
                        Cost Type: {currentProduct.costType === 'all' ? 'Bulk' : 'Per Unit'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Effective Unit Cost</p>
                        <p className="text-sm font-bold">
                          {(currentProduct.costPricePerUnit || (currentProduct.costType === 'all'
                            ? (currentProduct.costPrice / currentProduct.quantity)
                            : currentProduct.costPrice)).toLocaleString(undefined, { maximumFractionDigits: 1 })} RWF
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] text-muted-foreground uppercase">Profit Margin</p>
                        <p className={`text-sm font-bold ${(Number(sellForm.sellingPrice) - (currentProduct.costPricePerUnit || (currentProduct.costType === 'all' ? (currentProduct.costPrice / currentProduct.quantity) : currentProduct.costPrice))) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(Number(sellForm.sellingPrice) - (currentProduct.costPricePerUnit || (currentProduct.costType === 'all' ? (currentProduct.costPrice / currentProduct.quantity) : currentProduct.costPrice))).toLocaleString(undefined, { maximumFractionDigits: 1 })} RWF
                        </p>
                      </div>
                    </div>

                    {Number(sellForm.quantity) > 0 && (
                      <div className="pt-3 border-t flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">Total Sale</p>
                          <p className="text-base font-bold">
                            {(Number(sellForm.sellingPrice) * Number(sellForm.quantity)).toLocaleString()} RWF
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase">Total Profit</p>
                          <p className={`text-xl font-black ${(Number(sellForm.sellingPrice) - (currentProduct.costPricePerUnit || (currentProduct.costType === 'all' ? (currentProduct.costPrice / currentProduct.quantity) : currentProduct.costPrice))) * Number(sellForm.quantity) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((Number(sellForm.sellingPrice) - (currentProduct.costPricePerUnit || (currentProduct.costType === 'all' ? (currentProduct.costPrice / currentProduct.quantity) : currentProduct.costPrice))) * Number(sellForm.quantity)).toLocaleString()} RWF
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Return Deadline (optional)</Label>
                  <Input
                    type="date"
                    value={sellForm.deadline}
                    onChange={e => setSellForm(s => ({ ...s, deadline: e.target.value }))}
                  />
                </div>

                {Number(sellForm.quantity) > currentProduct.quantity && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Quantity exceeds available stock.</AlertDescription>
                  </Alert>
                )}

                {Number(sellForm.quantity) > 0 && Number(sellForm.sellingPrice) > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                    <CardContent className="pt-6 space-y-3">
                      {(() => {
                        const costOfSoldQty = Number(sellForm.quantity) * (currentProduct.costPrice || 0);
                        const totalReceived = Number(sellForm.quantity) * Number(sellForm.sellingPrice);
                        const profit = totalReceived - costOfSoldQty;

                        return (
                          <>
                            <div className="flex justify-between text-lg">
                              <span>Total Received:</span>
                              <span className="font-bold">
                                {totalReceived.toLocaleString()} RWF
                              </span>
                            </div>
                            <div className="flex justify-between text-lg">
                              <span>Cost of Goods (Sold):</span>
                              <span>{costOfSoldQty.toLocaleString()} RWF</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-2 border-t">
                              <span>Total Profit:</span>
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
                  Number(sellForm.quantity) > currentProduct.quantity
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
                <p>Quantity: <strong>{sellForm.quantity} {currentProduct?.unit}</strong></p>
                <p>Price: <strong>{Number(sellForm.sellingPrice).toLocaleString()} RWF / {currentProduct?.unit}</strong></p>
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