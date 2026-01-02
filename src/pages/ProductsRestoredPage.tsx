// src/pages/ProductsRestoredPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Download,
  Eye,
  Trash2,
  ArrowUpDown,
  ShoppingCart,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Package,
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Award
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval
} from 'date-fns';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRestoredProducts,
  deleteRestoredProduct,
  sellRestoredProduct,
  subscribeToRestoredProducts,
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
  const [branchFilter, setBranchFilter] = useState<string>(isAdmin ? 'All' : (userBranch || 'All'));
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  // Load data & Real-time subscription
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    getBranches(businessId).then(branchList => {
      setBranches(branchList);
      const map = new Map<string, string>();
      branchList.forEach(b => b.id && map.set(b.id, b.branchName));
      setBranchMap(map);
    });

    const unsubscribe = subscribeToRestoredProducts(
      businessId,
      user?.role || 'staff',
      isAdmin ? null : userBranch,
      (products) => {
        setRestoredProducts(products);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [businessId, user?.role, userBranch, isAdmin]);

  const getBranchName = useCallback((id: string | undefined | null) => branchMap.get(id || '') || 'Unknown', [branchMap]);

  const categories = ['All', ...Array.from(new Set(restoredProducts.map(p => p.category)))];

  // CRITICAL FIX: Define getActualUnitCost BEFORE any useMemo that uses it
  const getActualUnitCost = (p: RestoredProduct): number => {
    return p.costPricePerUnit ?? p.costPrice ?? 0;
  };

  // Restored stats (week, month, year) using actual unit cost
  const restoredStats = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const yearStart = startOfYear(selectedDate);

    const weeklyDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let weekly = 0;
    let monthly = 0;
    let yearly = 0;

    const timelineData = weeklyDays.map(day => {
      const dayValue = restoredProducts
        .filter(p => isSameDay(new Date(p.restoredDate), day))
        .reduce((sum, p) => sum + (p.quantity * getActualUnitCost(p)), 0);
      return {
        dayName: format(day, 'EEE').toUpperCase(),
        date: day,
        value: dayValue
      };
    });

    restoredProducts.forEach(p => {
      const restoredDateObj = new Date(p.restoredDate);
      const value = p.quantity * getActualUnitCost(p);

      if (isWithinInterval(restoredDateObj, { start: weekStart, end: weekEnd })) weekly += value;
      if (isWithinInterval(restoredDateObj, { start: monthStart, end: monthEnd })) monthly += value;
      if (isWithinInterval(restoredDateObj, { start: yearStart, end: endOfYear(selectedDate) })) yearly += value;
    });

    return { weekly, monthly, yearly, timelineData };
  }, [restoredProducts, selectedDate]);

  // Filtered products - only those restored on selectedDate
  const filteredProducts = useMemo(() => {
    return restoredProducts
      .filter(p => isSameDay(new Date(p.restoredDate), selectedDate))
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.restoreComment || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => minPrice === '' || getActualUnitCost(p) >= Number(minPrice))
      .filter(p => maxPrice === '' || getActualUnitCost(p) <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty));
  }, [restoredProducts, selectedDate, searchTerm, categoryFilter, branchFilter, minPrice, maxPrice, minQty, maxQty]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal = a[sortColumn as keyof RestoredProduct] as string | number;
      let bVal = b[sortColumn as keyof RestoredProduct] as string | number;

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
  }, [filteredProducts, sortColumn, sortDirection, getBranchName]);

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
    { header: 'Quantity', key: 'quantityFormatted', width: 15 },
    { header: 'Branch', key: 'branchName', width: 20 },
    { header: 'Actual Unit Cost', key: 'unitCostActual', width: 18 },
    { header: 'Total Cost Value', key: 'totalCostValue', width: 18 },
    { header: 'Restored Date', key: 'restoredDateFormatted', width: 15 },
    { header: 'Comment', key: 'restoreComment', width: 25 },
  ];

  const getRestoredExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantityFormatted: `${p.quantity} ${p.unit || 'pcs'}`,
      branchName: getBranchName(p.branch),
      unitCostActual: `${getActualUnitCost(p).toLocaleString()} RWF`,
      totalCostValue: `${(p.quantity * getActualUnitCost(p)).toLocaleString()} RWF`,
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
    const defaultPrice = product.sellingPrice || Math.round(getActualUnitCost(product) * 1.3);
    setSellForm({
      quantity: '',
      sellingPrice: defaultPrice,
      deadline: ''
    });
    setSellDialogOpen(true);
  };

  const openDelete = (product: RestoredProduct) => {
    setCurrentProduct(product);
    setDeleteConfirmOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <SEOHelmet title="Restored Products" description="View and sell restored products" />
      <div className="space-y-6 p-4 md:p-6 bg-background min-h-[calc(100vh-64px)]">
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

        {/* Date Context */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 bg-white/50 dark:bg-white/5 border-dashed border-gray-300 dark:border-gray-700 flex items-center gap-2">
            <CalendarIcon size={14} className="text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">Showing restored products for:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{format(selectedDate, 'MMMM do, yyyy')}</span>
          </Badge>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-background shadow-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Restored Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100 uppercase tracking-wider">Weekly Restored Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{restoredStats.weekly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100 uppercase tracking-wider">Monthly Restored Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{restoredStats.monthly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gray-900 text-white border-none shadow-xl border-l-4 border-l-orange-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Award size={14} className="text-orange-500" />
                Yearly Restored Value
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase border-orange-500/50 text-orange-500 font-bold bg-orange-500/10">
                {format(selectedDate, 'yyyy')} Yearly
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Cost Value</p>
                  <div className="text-3xl font-bold">{restoredStats.yearly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Day Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {restoredStats.timelineData.map((item, idx) => {
            const isSelected = isSameDay(item.date, selectedDate);
            const isToday = isSameDay(item.date, new Date());

            return (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedDate(item.date)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all duration-300 relative",
                  isSelected
                    ? "bg-primary border-primary shadow-lg text-primary-foreground ring-2 ring-primary/50"
                    : isToday
                      ? "bg-secondary/50 border-border dark:bg-secondary/20 shadow-sm"
                      : "bg-card border-border hover:border-primary/50"
                )}
              >
                {isToday && !isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 bg-secondary0 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm uppercase">
                    Today
                  </div>
                )}
                <div className="flex flex-col items-center text-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold tracking-tighter uppercase",
                    isSelected ? "text-amber-500" : "text-gray-400 dark:text-gray-600"
                  )}>
                    {item.dayName} {isSelected && "•"}
                  </span>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-sm font-black",
                      isSelected ? "text-white" : "text-gray-900 dark:text-gray-100 dark:text-blue-400"
                    )}>
                      {item.value.toLocaleString()}
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

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-card p-6 rounded-xl shadow-md border">
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
            <Input type="number" placeholder="Min Unit Cost" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <Input type="number" placeholder="Max Unit Cost" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
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
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1">Product Name <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Category <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('branchName')}>
                  <div className="flex items-center gap-1">Branch <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-1 justify-center">Restored Qty <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Actual Unit Cost</TableHead>
                <TableHead>Total Cost Value</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('restoredDate')}>
                  <div className="flex items-center gap-1">Restored Date <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode='popLayout'>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Package className="h-12 w-12 opacity-20" />
                        <p className="text-lg font-medium">No restored products found for this date.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProducts.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      layout
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-base text-gray-900 dark:text-gray-100">{product.productName}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{product.model || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-secondary text-gray-900 dark:text-gray-100 dark:bg-accent/30 dark:text-gray-900 dark:text-gray-100">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/50 text-foreground text-[10px]">
                          {getBranchName(product.branch)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">
                          {product.quantity.toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">{product.unit || 'pcs'}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-purple-600">
                          {getActualUnitCost(product).toLocaleString()} RWF
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-amber-600">
                          {(product.quantity * getActualUnitCost(product)).toLocaleString()} RWF
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(product.restoredDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground" title={product.restoreComment}>
                        {product.restoreComment || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => openDetails(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
                            onClick={() => openSell(product)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-colors"
                              onClick={() => openDelete(product)}
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
                    <p className="text-sm text-muted-foreground">Restored Qty</p>
                    <p className="font-medium">{currentProduct.quantity} {currentProduct.unit || 'pcs'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-medium">{getBranchName(currentProduct.branch)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Price (Base)</p>
                    <p className="font-medium">{currentProduct.costPrice.toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price (Base)</p>
                    <p className="font-medium">{(currentProduct.sellingPrice || currentProduct.costPrice).toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="font-medium text-lg text-amber-600">
                      {(currentProduct.quantity * (currentProduct.sellingPrice || currentProduct.costPrice)).toLocaleString()} RWF
                    </p>
                  </div>
                  <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Restored Date</p>
                    <p className="font-medium">{new Date(currentProduct.restoredDate).toLocaleDateString()} {new Date(currentProduct.restoredDate).toLocaleTimeString()}</p>
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

        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sell Restored Product</DialogTitle>
              <DialogDescription>
                {currentProduct?.productName} {currentProduct?.model && `(${currentProduct.model})`}
                <br />
                Available in restored stock: {currentProduct?.quantity} {currentProduct?.unit || 'pcs'}
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

                {/* Sale Summary - NOW USES getActualUnitCost (costPricePerUnit) */}
                {sellForm.quantity !== '' &&
                  sellForm.sellingPrice !== '' &&
                  Number(sellForm.quantity) > 0 &&
                  Number(sellForm.sellingPrice) > 0 &&
                  Number(sellForm.quantity) <= currentProduct.quantity && (
                    <Card className="bg-secondary dark:bg-card border-border">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between text-lg">
                          <span>Total Revenue:</span>
                          <span className="font-bold text-green-600">
                            {(Number(sellForm.quantity) * Number(sellForm.sellingPrice)).toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span>Cost of Goods (Actual):</span>
                          <span className="font-medium text-purple-600">
                            {(Number(sellForm.quantity) * getActualUnitCost(currentProduct)).toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-3 border-t">
                          <span>Profit / Loss:</span>
                          <span className={cn(
                            Number(sellForm.sellingPrice) >= getActualUnitCost(currentProduct)
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}>
                            {(
                              (Number(sellForm.sellingPrice) - getActualUnitCost(currentProduct)) * Number(sellForm.quantity)
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
                  Number(sellForm.quantity) <= 0 ||
                  Number(sellForm.quantity) > currentProduct?.quantity ||
                  sellForm.sellingPrice === '' ||
                  Number(sellForm.sellingPrice) <= 0
                }
              >
                {actionLoading ? 'Selling...' : 'Confirm Sale'}
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