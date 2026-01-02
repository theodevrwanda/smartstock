// src/pages/ProductsStorePage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Package,
  DollarSign,
  TrendingUp,
  CalendarDays,
  Info
} from 'lucide-react';
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
  eachDayOfInterval,
  getDay,
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
  const [branchFilter, setBranchFilter] = useState<string>(isAdmin ? 'All' : (userBranch || 'All'));
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');
  const [confirmFilter, setConfirmFilter] = useState<string>('All');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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
    costType: 'costPerUnit' as 'costPerUnit' | 'bulkCost',
    branch: '',
    deadline: '',
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
    getBranches(businessId)
      .then(branchList => {
        setBranches(branchList);
        const map = new Map<string, string>();
        branchList.forEach(b => map.set(b.id!, b.branchName));
        setBranchMap(map);
      })
      .catch(() => {
        toast.warning(isOnline ? 'Failed to load branches' : 'Using cached branch data');
      });

    const unsubscribe = subscribeToProducts(
      businessId,
      user?.role || 'staff',
      isAdmin ? null : userBranch,
      null,
      (updatedProducts) => {
        setProducts(updatedProducts);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [businessId, userBranch, isOnline, isAdmin, branchFilter, user?.role]);

  const currentBranchName = userBranch ? branchMap.get(userBranch) || 'Your Branch' : 'No Branch';
  const getBranchName = (branchId: string) => branchMap.get(branchId) || 'Unknown Branch';

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // Safe cost helpers
  const getUnitCost = (p: Product | null): number => {
    if (!p) return 0;
    return p.costPricePerUnit ?? 0;
  };

  const getTotalValue = (p: Product | null): number => {
    if (!p) return 0;
    return getUnitCost(p) * p.quantity;
  };

  const formatQuantityWithUnit = (p: Product | null): string => {
    if (!p) return '0';
    return `${p.quantity}${p.unit || ''}`;
  };

  // Reference date
  const referenceDate = selectedDate || new Date();

  // Week boundaries
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Current day index (Mon = 0, Sun = 6)
  const currentDayIndex = getDay(new Date()) === 0 ? 6 : getDay(new Date()) - 1;

  // Auto-highlight today
  // Auto-highlight today - REMOVED to show all products by default
  // useEffect(() => {
  //   if (selectedDay === null && !selectedDate) {
  //     setSelectedDay(currentDayIndex);
  //   }
  // }, []);

  // Products for stats: only confirmed + apply all filters except confirmFilter
  const confirmedProductsForStats = useMemo(() => {
    return products
      .filter(p => p.confirm === true)
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => minPrice === '' || getTotalValue(p) >= Number(minPrice))
      .filter(p => maxPrice === '' || getTotalValue(p) <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty))
      .filter(p => {
        if (!selectedDate) return true;
        const pDate = new Date(p.addedDate);
        return isSameDay(pDate, selectedDate);
      });
  }, [products, searchTerm, branchFilter, categoryFilter, minPrice, maxPrice, minQty, maxQty, selectedDate]);

  // Store stats (only confirmed products)
  const storeStats = useMemo(() => {
    const selDate = referenceDate;

    const weekRange = { start: weekStart, end: weekEnd };
    const monthStart = startOfMonth(selDate);
    const monthEnd = endOfMonth(selDate);
    const yearStart = startOfYear(selDate);
    const yearEnd = endOfYear(selDate);

    const stats = {
      week: { value: 0, count: 0 },
      month: { value: 0, count: 0 },
      year: { value: 0, count: 0 },
      daily: Array(7).fill(0).map(() => ({ value: 0, count: 0 })),
    };

    confirmedProductsForStats.forEach(p => {
      const addedDateObj = new Date(p.addedDate);
      const value = getTotalValue(p);

      if (isWithinInterval(addedDateObj, weekRange)) {
        stats.week.value += value;
        stats.week.count++;
        const dayIdx = getDay(addedDateObj);
        const monSunIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        stats.daily[monSunIdx].value += value;
        stats.daily[monSunIdx].count++;
      }

      if (isWithinInterval(addedDateObj, { start: monthStart, end: monthEnd })) {
        stats.month.value += value;
        stats.month.count++;
      }

      if (isWithinInterval(addedDateObj, { start: yearStart, end: yearEnd })) {
        stats.year.value += value;
        stats.year.count++;
      }
    });

    return stats;
  }, [confirmedProductsForStats, referenceDate, weekStart, weekEnd]);

  // Products for display/table: includes unconfirmed if filter allows
  const baseFilteredProductsForDisplay = useMemo(() => {
    return products
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => minPrice === '' || getTotalValue(p) >= Number(minPrice))
      .filter(p => maxPrice === '' || getTotalValue(p) <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty))
      .filter(p => confirmFilter === 'All' || (confirmFilter === 'Confirmed' ? p.confirm : !p.confirm))
      .filter(p => {
        if (!selectedDate) return true;
        const pDate = new Date(p.addedDate);
        return isSameDay(pDate, selectedDate);
      });
  }, [products, searchTerm, branchFilter, categoryFilter, minPrice, maxPrice, minQty, maxQty, confirmFilter, selectedDate]);

  // Final display with day-of-week filter + week/month/year boundary check
  const displayProducts = useMemo(() => {
    return baseFilteredProductsForDisplay.filter(p => {
      if (selectedDay === null) return true;

      const pDate = new Date(p.addedDate);
      const dayIdx = getDay(pDate);
      const monSunIdx = dayIdx === 0 ? 6 : dayIdx - 1;

      // Only show if day matches AND is within current week/month/year context
      return (
        monSunIdx === selectedDay &&
        isWithinInterval(pDate, { start: weekStart, end: weekEnd }) &&
        isWithinInterval(pDate, { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) }) &&
        isWithinInterval(pDate, { start: startOfYear(referenceDate), end: endOfYear(referenceDate) })
      );
    });
  }, [baseFilteredProductsForDisplay, selectedDay, weekStart, weekEnd, referenceDate]);

  const sortedProducts = useMemo(() => {
    return [...displayProducts].sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (sortColumn === 'costPrice') {
        aVal = getTotalValue(a);
        bVal = getTotalValue(b);
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      return (aVal < bVal ? -1 : 1) * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [displayProducts, sortColumn, sortDirection]);

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
    { header: 'Quantity', key: 'quantityWithUnit', width: 12 },
    { header: 'Unit Cost (RWF)', key: 'unitCost', width: 15 },
    { header: 'Total Value (RWF)', key: 'totalValue', width: 15 },
    { header: 'Cost Type', key: 'costType', width: 12 },
    { header: 'Confirmed', key: 'confirmed', width: 10 },
    { header: 'Added Date', key: 'addedDateFormatted', width: 15 },
  ];

  const getExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantityWithUnit: formatQuantityWithUnit(p),
      unitCost: getUnitCost(p).toLocaleString(),
      totalValue: getTotalValue(p).toLocaleString(),
      costType: p.costType === 'bulkCost' ? 'Bulk Cost' : 'Cost Per Unit',
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

  // ADD PRODUCT
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

    let finalDeadline = newProduct.deadline;
    if (!finalDeadline) {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      finalDeadline = d.toISOString().split('T')[0];
    } else {
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

    let costPricePerUnit = 0;
    if (newProduct.costType === 'bulkCost') {
      costPricePerUnit = qty > 0 ? enteredCost / qty : 0;
    } else {
      costPricePerUnit = enteredCost;
    }

    const productData: Product = {
      productName: newProduct.productName.trim(),
      productNameLower: newProduct.productName.trim().toLowerCase(),
      category: newProduct.category,
      categoryLower: newProduct.category.toLowerCase(),
      model: newProduct.model || null,
      modelLower: newProduct.model?.toLowerCase() || null,
      quantity: qty,
      unit: newProduct.unit,
      costPrice: enteredCost,
      costPricePerUnit: costPricePerUnit,
      costType: newProduct.costType,
      branch: targetBranch,
      confirm: isAdmin ? true : false,
      businessId: businessId || '',
      deadline: finalDeadline,
      status: 'store',
      addedDate: new Date().toISOString(),
      sellingPrice: null,
      restoreComment: null,
    };

    const result = await addOrUpdateProduct(productData);

    if (result) {
      setProducts(prev => {
        const existing = prev.find(p => p.id === result.id);
        if (existing) return prev.map(p => p.id === result.id ? result : p);
        return [...prev, result];
      });
      toast.success(isOnline ? 'Product added successfully' : 'Added locally');
      setAddDialogOpen(false);
      setNewProduct({
        productName: '',
        category: '',
        model: '',
        quantity: '',
        costPrice: '',
        branch: '',
        unit: 'pcs',
        costType: 'costPerUnit',
        deadline: '',
      });
    } else {
      toast.error('Failed to add product');
    }
    setActionLoading(false);
  };

  // UPDATE PRODUCT
  const handleUpdateProduct = async () => {
    if (!currentProduct) return;

    setActionLoading(true);
    const qty = currentProduct.quantity;
    const enteredCost = currentProduct.costPrice;

    let costPricePerUnit = 0;
    if (currentProduct.costType === 'bulkCost') {
      costPricePerUnit = qty > 0 ? enteredCost / qty : 0;
    } else {
      costPricePerUnit = enteredCost;
    }

    const updates: Partial<Product> = {
      productName: currentProduct.productName.trim(),
      productNameLower: currentProduct.productName.trim().toLowerCase(),
      category: currentProduct.category,
      categoryLower: currentProduct.category.toLowerCase(),
      model: currentProduct.model?.trim() || null,
      modelLower: currentProduct.model?.trim()?.toLowerCase() || null,
      quantity: qty,
      unit: currentProduct.unit,
      costPrice: enteredCost,
      costPricePerUnit: costPricePerUnit,
      costType: currentProduct.costType,
      updatedAt: new Date().toISOString(),
    };

    const success = await updateProduct(currentProduct.id!, updates);
    if (success) {
      setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, ...updates } : p));
      toast.success('Product updated');
      setEditDialogOpen(false);
      setCurrentProduct(null);
    }
    setActionLoading(false);
  };

  const openConfirmSale = () => setConfirmSaleDialogOpen(true);

  const isSellingRef = React.useRef(false);

  const handleSellConfirm = async () => {
    if (isSellingRef.current) return;
    if (!currentProduct || sellForm.quantity === '' || sellForm.sellingPrice === '') return;

    const qty = Number(sellForm.quantity);
    const price = Number(sellForm.sellingPrice);
    if (qty > currentProduct.quantity || price <= 0 || qty <= 0) {
      toast.error('Invalid sale');
      return;
    }

    isSellingRef.current = true;
    setActionLoading(true);

    try {
      const success = await sellProduct(currentProduct.id!, qty, price, sellForm.deadline, userBranch);
      if (success) {
        setProducts(prev => prev.map(p => p.id === currentProduct.id ? { ...p, quantity: p.quantity - qty } : p));
        toast.success(`Sold ${qty} ${currentProduct.unit}`);
        setSellDialogOpen(false);
        setConfirmSaleDialogOpen(false);
        setSellForm({ quantity: '', sellingPrice: '', deadline: '', sellInBaseUnit: true });
      }
    } finally {
      setActionLoading(false);
      setTimeout(() => { isSellingRef.current = false; }, 500);
    }
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
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
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

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100 uppercase tracking-wider">Weekly Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{storeStats.week.value.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                  <p className="text-xs text-blue-100 mt-1 opacity-80">{storeStats.week.count} confirmed products</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100 uppercase tracking-wider">Monthly Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{storeStats.month.value.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                  <p className="text-xs text-emerald-100 mt-1 opacity-80">{storeStats.month.count} confirmed products</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gray-900 text-white border-none shadow-xl border-l-4 border-l-orange-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays size={14} className="text-orange-500" />
                Yearly Investment
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase border-orange-500/50 text-orange-500 font-bold bg-orange-500/10">
                {format(referenceDate, 'yyyy')}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Confirmed Investment</p>
                  <div className="text-3xl font-bold">{storeStats.year.value.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                  <p className="text-xs text-orange-500 mt-1 font-semibold">{storeStats.year.count} products</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekday Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
            const isSelected = selectedDay === idx;
            const isToday = idx === currentDayIndex && !selectedDate;

            return (
              <motion.div
                key={day}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedDay(isSelected ? null : idx)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all duration-300 relative",
                  isSelected
                    ? "bg-amber-950/90 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-white ring-2 ring-amber-500/50"
                    : isToday
                      ? "bg-blue-50/50 border-blue-400 dark:bg-blue-900/20 dark:border-blue-700 shadow-sm"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                )}
              >
                {isToday && !isSelected && (
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
                      {storeStats.daily[idx].count} products
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
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
            <Input type="number" placeholder="Min Value" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <Input type="number" placeholder="Max Value" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
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
                <TableHead>Model</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                {isAdmin && <TableHead>Branch</TableHead>}
                <TableHead>Unit Cost</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('costPrice')}>
                  <div className="flex items-center gap-1 justify-end">Total Value <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Added Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode='popLayout'>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 11 : 10} className="h-64 text-center text-muted-foreground">
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
                      layout
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
                        {formatQuantityWithUnit(product)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 text-[10px]">
                            {getBranchName(product.branch)}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="font-medium whitespace-nowrap">
                        {getUnitCost(product).toLocaleString()} RWF
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-600 dark:text-amber-400">
                        {getTotalValue(product).toLocaleString()} RWF
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {product.addedDate ? format(new Date(product.addedDate), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(product.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
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
                                setCurrentProduct(product);
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
                                sellingPrice: getUnitCost(product) * 1.5,
                                deadline: product.deadline || '',
                                sellInBaseUnit: true
                              });
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
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {sortedProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No products found.</div>
          ) : (
            <AnimatePresence mode='popLayout'>
              {sortedProducts.map(p => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} layout>
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
                          <Badge variant="outline" className="font-bold">{formatQuantityWithUnit(p)}</Badge>
                          {getStatusBadge(p.quantity)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase">Unit Cost</span>
                          <span className="text-sm font-medium">
                            {getUnitCost(p).toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground uppercase">Total Value</span>
                          <span className="text-lg font-black text-amber-600">
                            {getTotalValue(p).toLocaleString()} RWF
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
                              disabled={user?.role === 'staff' && !p.confirm}
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

        {/* ADD DIALOG */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                {isAdmin ? 'Auto-confirmed' : 'Requires admin confirmation'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={newProduct.productName}
                    onChange={e => setNewProduct(p => ({ ...p, productName: e.target.value }))}
                    placeholder="e.g. Rice"
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
                    <Input value={newProduct.model} onChange={e => setNewProduct(p => ({ ...p, model: e.target.value }))} placeholder="e.g. kigori" />
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
                      variant={newProduct.costType === 'costPerUnit' ? 'default' : 'ghost'}
                      className={`flex-1 text-xs h-8 ${newProduct.costType === 'costPerUnit' ? 'bg-blue-600 shadow-md text-white' : ''}`}
                      onClick={() => setNewProduct(p => ({ ...p, costType: 'costPerUnit' }))}
                    >
                      Cost Per Unit
                    </Button>
                    <Button
                      type="button"
                      variant={newProduct.costType === 'bulkCost' ? 'default' : 'ghost'}
                      className={`flex-1 text-xs h-8 ${newProduct.costType === 'bulkCost' ? 'bg-blue-600 shadow-md text-white' : ''}`}
                      onClick={() => setNewProduct(p => ({ ...p, costType: 'bulkCost' }))}
                    >
                      Total Bulk Cost
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{newProduct.costType === 'costPerUnit' ? 'Cost Price per Unit *' : 'Total Cost Amount *'}</Label>
                  <Input
                    type="number"
                    value={newProduct.costPrice}
                    onChange={e => setNewProduct(p => ({ ...p, costPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder={newProduct.costType === 'costPerUnit' ? "e.g. 3000" : "e.g. 30000"}
                  />
                </div>
                {isAdmin && (
                  <div className="grid gap-2">
                    <Label>Branch *</Label>
                    <Select value={newProduct.branch || userBranch || ''} onValueChange={(val) => setNewProduct(p => ({ ...p, branch: val }))}>
                      <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map(b => <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

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
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Entered Amount</p>
                        <p className="font-bold text-lg">{Number(newProduct.costPrice || 0).toLocaleString()} RWF</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      {newProduct.costType === 'bulkCost' && Number(newProduct.quantity) > 0 && (
                        <div className="flex justify-between items-center text-sm p-2 bg-primary/5 rounded border border-primary/10">
                          <span className="text-muted-foreground font-medium">Calculated Unit Cost:</span>
                          <span className="font-bold text-primary">
                            {(Number(newProduct.costPrice || 0) / Number(newProduct.quantity || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })} RWF
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Total Investment Value</span>
                        <span className="font-black text-xl text-amber-600">
                          {newProduct.costType === 'bulkCost'
                            ? Number(newProduct.costPrice || 0).toLocaleString()
                            : (Number(newProduct.costPrice || 0) * Number(newProduct.quantity || 0)).toLocaleString()} RWF
                        </span>
                      </div>
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
        </Dialog>

        {/* EDIT DIALOG */}
        <Dialog open={editDialogOpen} onOpenChange={(val) => { setEditDialogOpen(val); if (!val) setCurrentProduct(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update product details and see changes in real-time</DialogDescription>
            </DialogHeader>

            {currentProduct ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
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
                      <Button
                        type="button"
                        variant={currentProduct.costType === 'costPerUnit' ? 'default' : 'ghost'}
                        className={`flex-1 text-xs h-8 ${currentProduct.costType === 'costPerUnit' ? 'bg-blue-600 shadow-md text-white' : ''}`}
                        onClick={() => setCurrentProduct(prev => prev ? { ...prev, costType: 'costPerUnit' } : null)}
                      >
                        Cost Per Unit
                      </Button>
                      <Button
                        type="button"
                        variant={currentProduct.costType === 'bulkCost' ? 'default' : 'ghost'}
                        className={`flex-1 text-xs h-8 ${currentProduct.costType === 'bulkCost' ? 'bg-blue-600 shadow-md text-white' : ''}`}
                        onClick={() => setCurrentProduct(prev => prev ? { ...prev, costType: 'bulkCost' } : null)}
                      >
                        Total Bulk Cost
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>{currentProduct.costType === 'costPerUnit' ? 'Cost Price per Unit *' : 'Total Cost Amount *'}</Label>
                    <Input
                      type="number"
                      value={currentProduct.costPrice}
                      onChange={e => setCurrentProduct(prev => prev ? { ...prev, costPrice: Number(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>

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
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Entered Amount</p>
                          <p className="font-bold text-lg">{Number(currentProduct.costPrice || 0).toLocaleString()} RWF</p>
                        </div>
                      </div>

                      {currentProduct.costType === 'bulkCost' && currentProduct.quantity > 0 && (
                        <div className="flex justify-between items-center text-sm p-2 bg-primary/5 rounded border border-primary/10">
                          <span className="text-muted-foreground font-medium">Calculated Unit Cost:</span>
                          <span className="font-bold text-primary">
                            {(Number(currentProduct.costPrice || 0) / currentProduct.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })} RWF
                          </span>
                        </div>
                      )}

                      <div className="pt-4 border-t flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Total Value</span>
                        <span className="font-black text-xl text-amber-600">
                          {currentProduct.costType === 'bulkCost'
                            ? Number(currentProduct.costPrice || 0).toLocaleString()
                            : (getUnitCost(currentProduct) * currentProduct.quantity).toLocaleString()} RWF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">Loading product details...</div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setEditDialogOpen(false); setCurrentProduct(null); }}>Cancel</Button>
              <Button
                onClick={handleUpdateProduct}
                disabled={actionLoading || !currentProduct}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SELL DIALOG */}
        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sell Product</DialogTitle>
              <DialogDescription>
                {currentProduct?.productName} (Available: {currentProduct ? formatQuantityWithUnit(currentProduct) : '0'})
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
                      placeholder={`Max ${currentProduct.quantity}`}
                      min="1"
                      max={currentProduct.quantity}
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

                <div className="grid gap-2">
                  <Label>Return Deadline (optional)</Label>
                  <Input
                    type="date"
                    value={sellForm.deadline}
                    onChange={e => setSellForm(s => ({ ...s, deadline: e.target.value }))}
                  />
                </div>

                {(Number(sellForm.quantity) > 0 && Number(sellForm.sellingPrice) > 0) && (
                  <div className="bg-muted/50 p-4 rounded-xl border space-y-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Profit & Loss Preview
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Unit Cost</p>
                        <p className="text-lg font-bold">{getUnitCost(currentProduct).toLocaleString()} RWF</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Profit per Unit</p>
                        <p className={`text-lg font-bold ${Number(sellForm.sellingPrice) >= getUnitCost(currentProduct) ? 'text-green-600' : 'text-red-600'}`}>
                          {(Number(sellForm.sellingPrice) - getUnitCost(currentProduct)).toLocaleString()} RWF
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Total Revenue</p>
                          <p className="text-xl font-bold">{(Number(sellForm.sellingPrice) * Number(sellForm.quantity)).toLocaleString()} RWF</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase">Total Profit/Loss</p>
                          <p className={`text-2xl font-black ${(Number(sellForm.sellingPrice) - getUnitCost(currentProduct)) * Number(sellForm.quantity) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((Number(sellForm.sellingPrice) - getUnitCost(currentProduct)) * Number(sellForm.quantity)).toLocaleString()} RWF
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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

        {/* CONFIRM SALE DIALOG */}
        <Dialog open={confirmSaleDialogOpen} onOpenChange={setConfirmSaleDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Sale</DialogTitle></DialogHeader>
            <DialogDescription className="space-y-3">
              <p>Are you sure you want to confirm this sale?</p>
              <div className="font-medium space-y-1">
                <p>Product: <strong>{currentProduct?.productName}</strong></p>
                <p>Quantity: <strong>{sellForm.quantity} {currentProduct?.unit}</strong></p>
                <p>Unit Price: <strong>{Number(sellForm.sellingPrice).toLocaleString()} RWF</strong></p>
                <p className="text-lg pt-2">Total Amount: <strong>{(Number(sellForm.quantity) * Number(sellForm.sellingPrice)).toLocaleString()} RWF</strong></p>
                {currentProduct && (
                  <p className={`text-lg font-bold ${(Number(sellForm.sellingPrice) - getUnitCost(currentProduct)) * Number(sellForm.quantity) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Expected Profit: {((Number(sellForm.sellingPrice) - getUnitCost(currentProduct)) * Number(sellForm.quantity)).toLocaleString()} RWF
                  </p>
                )}
              </div>
            </DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmSaleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSellConfirm} disabled={actionLoading}>Yes, Confirm Sale</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CONFIRM PRODUCT DIALOG */}
        <Dialog open={confirmProductDialogOpen} onOpenChange={setConfirmProductDialogOpen}>
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
        </Dialog>

        {/* DETAILS DIALOG */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Product Details</DialogTitle></DialogHeader>
            {currentProduct && (
              <div className="space-y-3 py-4">
                <p><strong>Name:</strong> {currentProduct.productName}</p>
                <p><strong>Category:</strong> {currentProduct.category}</p>
                <p><strong>Model:</strong> {currentProduct.model || '-'}</p>
                <p><strong>Quantity:</strong> {formatQuantityWithUnit(currentProduct)}</p>
                <p><strong>Unit Cost:</strong> {getUnitCost(currentProduct).toLocaleString()} RWF</p>
                <p><strong>Total Value:</strong> {getTotalValue(currentProduct).toLocaleString()} RWF</p>
                <p><strong>Cost Type:</strong> {currentProduct.costType === 'bulkCost' ? 'Bulk Cost' : 'Cost Per Unit'}</p>
                <p><strong>Branch:</strong> {getBranchName(currentProduct.branch)}</p>
                <p><strong>Confirmed:</strong> {currentProduct.confirm ? 'Yes' : 'No'}</p>
                <p><strong>Added:</strong> {currentProduct.addedDate ? format(new Date(currentProduct.addedDate), 'dd MMM yyyy') : '-'}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM DIALOG */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Product?</DialogTitle></DialogHeader>
            <DialogDescription>This action cannot be undone.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteProduct} disabled={actionLoading}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProductsStorePage;