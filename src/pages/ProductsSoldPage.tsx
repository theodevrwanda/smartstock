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
  Undo,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Info,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Package
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getSoldProducts,
  deleteSoldProduct,
  restoreSoldProduct,
  subscribeToSoldProducts,
  toast,
  setSoldTransactionContext,
} from '@/functions/sold';
import { SoldProduct, Branch } from '@/types/interface';
import { getBranches } from '@/functions/branch';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/exportUtils';

const ProductsSoldPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const isAdmin = user?.role === 'admin';
  const userBranch = typeof user?.branch === 'string' ? user.branch : null;
  const businessId = user?.businessId;

  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
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
  const [showFullReport, setShowFullReport] = useState(false);

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof SoldProduct | 'branchName'>('soldDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<SoldProduct | null>(null);

  // Restore form
  const [restoreForm, setRestoreForm] = useState({
    quantity: '' as string | number,
    comment: '',
  });

  // Set transaction context for logging
  useEffect(() => {
    if (user && branches.length > 0) {
      const branchInfo = branches.find(b => b.id === user.branch);
      setSoldTransactionContext({
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

  // Load sold products & branches
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    getBranches(businessId).then(branchList => {
      setBranches(branchList);
      const map = new Map<string, string>();
      branchList.forEach(b => map.set(b.id!, b.branchName));
      setBranchMap(map);
    });

    const unsubscribe = subscribeToSoldProducts(
      businessId,
      user?.role || 'staff',
      isAdmin ? null : userBranch,
      (products) => {
        setSoldProducts(products);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [businessId, user?.role, userBranch, isAdmin]);

  const getBranchName = useCallback((id: string | undefined | null) => branchMap.get(id || '') || 'Unknown', [branchMap]);

  const categories = ['All', ...Array.from(new Set(soldProducts.map(p => p.category)))];

  // Income stats + timeline for week cards
  const incomeStats = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const yearStart = startOfYear(selectedDate);

    const weeklyDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let daily = 0;
    let weekly = 0;
    let monthly = 0;
    let yearly = 0;

    const timelineData = weeklyDays.map(day => {
      const dayIncome = soldProducts
        .filter(p => isSameDay(new Date(p.soldDate), day))
        .reduce((sum, p) => sum + (p.quantity * p.sellingPrice), 0);
      return {
        dayName: format(day, 'EEE').toUpperCase(),
        date: day,
        income: dayIncome
      };
    });

    soldProducts.forEach(p => {
      const soldDateObj = new Date(p.soldDate);
      const amount = p.quantity * p.sellingPrice;

      if (isSameDay(soldDateObj, selectedDate)) daily += amount;
      if (isWithinInterval(soldDateObj, { start: weekStart, end: weekEnd })) weekly += amount;
      if (isWithinInterval(soldDateObj, { start: monthStart, end: monthEnd })) monthly += amount;
      if (isWithinInterval(soldDateObj, { start: yearStart, end: endOfYear(selectedDate) })) yearly += amount;
    });

    return { daily, weekly, monthly, yearly, timelineData };
  }, [soldProducts, selectedDate]);

  // FILTERED PRODUCTS - Shows only products sold on the selected date
  const filteredProducts = useMemo(() => {
    return soldProducts
      .filter(p => showFullReport || isSameDay(new Date(p.soldDate), selectedDate))
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter)
      .filter(p => branchFilter === 'All' || p.branch === branchFilter)
      .filter(p => minPrice === '' || p.sellingPrice >= Number(minPrice))
      .filter(p => maxPrice === '' || p.sellingPrice <= Number(maxPrice))
      .filter(p => minQty === '' || p.quantity >= Number(minQty))
      .filter(p => maxQty === '' || p.quantity <= Number(maxQty));
  }, [soldProducts, selectedDate, searchTerm, categoryFilter, branchFilter, minPrice, maxPrice, minQty, maxQty, showFullReport]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal = a[sortColumn as keyof SoldProduct] as string | number;
      let bVal = b[sortColumn as keyof SoldProduct] as string | number;

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

  const handleSort = (column: keyof SoldProduct | 'branchName') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getActualUnitCost = (p: SoldProduct): number => {
    return p.costPricePerUnit ?? p.unitCost ?? p.costPrice ?? 0;
  };

  const calculateProfitLoss = (p: SoldProduct): number => {
    const unitCost = getActualUnitCost(p);
    return (p.sellingPrice - unitCost) * p.quantity;
  };

  const calculateTotalProfitLoss = () => {
    return filteredProducts.reduce((sum, p) => sum + calculateProfitLoss(p), 0);
  };

  // Export
  const soldExportColumns: ExportColumn[] = [
    { header: t('product_name'), key: 'productName', width: 25 },
    { header: t('category_label'), key: 'category', width: 15 },
    { header: t('model_label'), key: 'model', width: 15 },
    { header: t('quantity_label'), key: 'quantityFormatted', width: 15 },
    { header: t('branch'), key: 'branchName', width: 20 },
    { header: t('actual_unit_cost'), key: 'unitCostActual', width: 18 },
    { header: t('selling_price'), key: 'sellingPriceFormatted', width: 15 },
    { header: t('total_amount'), key: 'totalAmount', width: 15 },
    { header: t('profit_loss'), key: 'profitLoss', width: 15 },
    { header: t('sold_date'), key: 'soldDateFormatted', width: 15 },
    { header: t('return_deadline'), key: 'deadlineFormatted', width: 15 },
  ];

  const getSoldExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantityFormatted: `${p.quantity} ${p.unit || 'pcs'}`,
      branchName: getBranchName(p.branch),
      unitCostActual: `${getActualUnitCost(p).toLocaleString()} RWF`,
      sellingPriceFormatted: `${p.sellingPrice.toLocaleString()} RWF`,
      totalAmount: `${(p.quantity * p.sellingPrice).toLocaleString()} RWF`,
      profitLoss: `${calculateProfitLoss(p).toLocaleString()} RWF`,
      soldDateFormatted: new Date(p.soldDate).toLocaleDateString(),
      deadlineFormatted: p.deadline ? new Date(p.deadline).toLocaleDateString() : '-',
    }));
  };

  const handleExportExcel = () => {
    exportToExcel(getSoldExportData(), soldExportColumns, 'sold-products');
    toast.success(t('success'));
  };

  const handleExportPDF = () => {
    exportToPDF(getSoldExportData(), soldExportColumns, 'sold-products', `Sold Products Report - Total P/L: ${calculateTotalProfitLoss().toLocaleString()} RWF`);
    toast.success(t('success'));
  };

  const handleRestore = async () => {
    if (!currentProduct || restoreForm.quantity === '' || Number(restoreForm.quantity) <= 0) {
      toast.error(t('error')); // Detailed verification needed
      return;
    }

    const qty = Number(restoreForm.quantity);

    if (qty > currentProduct.quantity) {
      toast.error(t('error'));
      return;
    }

    if (restoreForm.comment.trim() === '') {
      toast.error(t('error'));
      return;
    }

    setActionLoading(true);
    try {
      const success = await restoreSoldProduct(currentProduct.id, qty, restoreForm.comment, userBranch, isAdmin);
      if (success) {
        setSoldProducts(prev => {
          const remaining = currentProduct.quantity - qty;
          if (remaining <= 0) {
            return prev.filter(p => p.id !== currentProduct.id);
          }
          return prev.map(p => p.id === currentProduct.id ? { ...p, quantity: remaining } : p);
        });
        toast.success(t('success'));
        setRestoreDialogOpen(false);
        setCurrentProduct(null);
        setRestoreForm({ quantity: '', comment: '' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProduct) return;
    setActionLoading(true);
    try {
      const success = await deleteSoldProduct(currentProduct.id);
      if (success) {
        setSoldProducts(prev => prev.filter(p => p.id !== currentProduct.id));
        toast.success(t('success'));
        setDeleteConfirmOpen(false);
        setCurrentProduct(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (product: SoldProduct) => {
    setCurrentProduct(product);
    setDetailsDialogOpen(true);
  };

  const openRestore = (product: SoldProduct) => {
    setCurrentProduct(product);
    setRestoreForm({ quantity: '', comment: '' });
    setRestoreDialogOpen(true);
  };

  const openDelete = (product: SoldProduct) => {
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
      <SEOHelmet title={t('sold_products')} description={t('sold_products_desc')} />
      <div className="space-y-6 p-4 md:p-6 bg-background min-h-[calc(100vh-64px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('sold_products')}</h1>
            <p className="text-muted-foreground">
              {isAdmin ? t('all_sold_products_admin') : userBranch ? `${t('sold_products_from')} ${getBranchName(userBranch)}` : t('no_branch_assigned')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFullReport ? "default" : "outline"}
              onClick={() => setShowFullReport(!showFullReport)}
            >
              <FileText className="mr-2 h-4 w-4" />
              {showFullReport ? "Standard View" : "Full Report"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  {t('export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t('export_excel')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t('export_pdf')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Date Context or Full Report Indicator */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {showFullReport ? (
            <Badge variant="default" className="px-3 py-1 bg-blue-600 text-white flex items-center gap-2">
              <Award size={14} className="text-white" />
              <span className="font-semibold">Full Sales History - All Time Data</span>
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="px-3 py-1 bg-secondary border-dashed border-border flex items-center gap-2">
                <CalendarIcon size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground">{t('displaying_sales_for')}:</span>
                <span className="font-semibold text-foreground">{format(selectedDate, 'MMMM do, yyyy')}</span>
              </Badge>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-background shadow-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : <span>{t('pick_date')}</span>}
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
            </>
          )}
        </div>

        {!showFullReport && (
          <>
            {/* Income Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-100 uppercase tracking-wider">{t('weekly_income')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">{incomeStats.weekly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-none shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-100 uppercase tracking-wider">{t('monthly_income')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold">{incomeStats.monthly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-card text-foreground border-none shadow-xl border-l-4 border-l-orange-500">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Award size={14} className="text-orange-500" />
                    {t('yearly_income')}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] uppercase border-orange-500/50 text-orange-500 font-bold bg-orange-500/10">
                    {format(selectedDate, 'yyyy')}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('total_revenue')}</p>
                      <div className="text-3xl font-bold">{incomeStats.yearly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Day Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {incomeStats.timelineData.map((item, idx) => {
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
                        {t('today')}
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
                          isSelected ? "text-primary-foreground" : "text-foreground"
                        )}>
                          {item.income.toLocaleString()}
                        </span>
                        <span className={cn(
                          "text-[9px] uppercase font-medium opacity-60",
                          isSelected ? "text-amber-200" : "text-gray-500"
                        )}>
                          {t('income_label')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-card p-6 rounded-xl shadow-md border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder={t('search_sold_products')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder={t('all_categories')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{t('all_categories')}</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue placeholder={t('all_branches')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">{t('all_branches')}</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder={t('min_value')} value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <Input type="number" placeholder={t('max_value')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder={t('min_qty')} value={minQty} onChange={e => setMinQty(e.target.value)} />
            <Input type="number" placeholder={t('max_qty')} value={maxQty} onChange={e => setMaxQty(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1">{t('product_name')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">{t('category_label')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('branchName')}>
                  <div className="flex items-center gap-1">{t('branch')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-1 justify-center">{t('sold_qty')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>{t('actual_unit_cost')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('sellingPrice')}>
                  <div className="flex items-center gap-1">{t('selling_price')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>{t('total_received')}</TableHead>
                <TableHead>{t('profit_loss')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('soldDate')}>
                  <div className="flex items-center gap-1">{t('sold_date')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode='popLayout'>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-64 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Package className="h-12 w-12 opacity-20" />
                        <p className="text-lg font-medium">{t('no_sold_products_date')}</p>
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
                          <span className="text-base text-foreground">{product.productName}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{product.model || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-secondary text-foreground">
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
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {getActualUnitCost(product).toLocaleString()} RWF
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {product.sellingPrice.toLocaleString()} RWF
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-amber-600 dark:text-amber-400">
                          {(product.quantity * product.sellingPrice).toLocaleString()} RWF
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "flex items-center gap-1 font-bold",
                          calculateProfitLoss(product) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        )}>
                          {calculateProfitLoss(product) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {Math.abs(calculateProfitLoss(product)).toLocaleString()} RWF
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(product.soldDate), 'dd MMM yyyy')}
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
                            onClick={() => openRestore(product)}
                            title={t('return_product')}
                          >
                            <Undo className="h-4 w-4" />
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

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {sortedProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('no_products_found')}</div>
          ) : (
            <AnimatePresence mode='popLayout'>
              {sortedProducts.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  layout
                  className="rounded-xl overflow-hidden"
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
                          <span className="text-xs text-muted-foreground">{format(new Date(p.soldDate), 'dd MMM')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase">{t('selling_price')}</span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {p.sellingPrice.toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground uppercase">{t('total_received')}</span>
                          <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                            {(p.quantity * p.sellingPrice).toLocaleString()} RWF
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {calculateProfitLoss(p) >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                          <span className={calculateProfitLoss(p) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(calculateProfitLoss(p)).toLocaleString()} RWF
                          </span>
                        </div>
                        {isAdmin && <span>{getBranchName(p.branch)}</span>}
                      </div>

                      <div className="mt-3 flex gap-2 justify-end bg-muted/20 p-2 rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary transition-colors"
                          onClick={() => openDetails(p)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary/80 transition-colors"
                          onClick={() => openRestore(p)}
                          title={t('return_product')}
                        >
                          <Undo className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/80 transition-colors"
                            onClick={() => openDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('sold_product_details')}</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('name')}</p>
                    <p className="font-medium">{currentProduct.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('category_label')}</p>
                    <p className="font-medium">{currentProduct.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('model_label')}</p>
                    <p className="font-medium">{currentProduct.model || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('quantity_label')}</p>
                    <p className="font-medium">{currentProduct.quantity} {currentProduct.unit || 'pcs'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('branch')}</p>
                    <p className="font-medium">{getBranchName(currentProduct.branch)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('actual_unit_cost')}</p>
                    <p className="font-medium text-purple-600 dark:text-purple-400">{getActualUnitCost(currentProduct).toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('selling_price')}</p>
                    <p className="font-medium text-green-600 dark:text-green-400">{currentProduct.sellingPrice.toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('total_received')}</p>
                    <p className="font-medium text-lg text-amber-600 dark:text-amber-400">{(currentProduct.quantity * currentProduct.sellingPrice).toLocaleString()} RWF</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('profit_loss')}</p>
                    <p className={cn(
                      "font-bold text-lg",
                      calculateProfitLoss(currentProduct) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {calculateProfitLoss(currentProduct).toLocaleString()} RWF
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('sold_date')}</p>
                    <p className="font-medium">{format(new Date(currentProduct.soldDate), 'dd MMM yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('return_deadline')}</p>
                    <p className="font-medium">
                      {currentProduct.deadline ? format(new Date(currentProduct.deadline), 'dd MMM yyyy') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>{t('close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('restore_sold_product')}</DialogTitle>
              <DialogDescription>
                {currentProduct && `${t('restoring_from_sale')}: ${currentProduct.productName} (${t('sold')}: ${currentProduct.quantity} units)`}
              </DialogDescription>
            </DialogHeader>

            {currentProduct && (
              <div className="space-y-6 py-4">
                <div className="grid gap-2">
                  <Label>{t('quantity_restore')}</Label>
                  <Input
                    type="number"
                    min="1"
                    max={currentProduct.quantity}
                    placeholder={t('restore_qty_placeholder')}
                    value={restoreForm.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = val === '' ? '' : Number(val);
                      if (num !== '' && (num < 1 || num > currentProduct.quantity)) return;
                      setRestoreForm(prev => ({ ...prev, quantity: num }));
                    }}
                  />
                </div>

                {restoreForm.quantity !== '' && Number(restoreForm.quantity) > currentProduct.quantity && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('error')}
                    </AlertDescription>
                  </Alert>
                )}

                {restoreForm.quantity !== '' && Number(restoreForm.quantity) === currentProduct.quantity && (
                  <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 dark:text-amber-200">
                      <strong>Full Restore:</strong> This will return all units to stock and <strong>permanently delete this sale record</strong>.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-2">
                  <Label>{t('restore_reason')}</Label>
                  <Textarea
                    placeholder={t('restore_reason_placeholder')}
                    value={restoreForm.comment}
                    onChange={(e) => setRestoreForm(prev => ({ ...prev, comment: e.target.value }))}
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRestoreDialogOpen(false);
                  setRestoreForm({ quantity: '', comment: '' });
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleRestore}
                disabled={
                  actionLoading ||
                  restoreForm.quantity === '' ||
                  Number(restoreForm.quantity) <= 0 ||
                  Number(restoreForm.quantity) > currentProduct?.quantity ||
                  restoreForm.comment.trim() === ''
                }
              >
                {actionLoading ? 'Restoring...' : t('confirm_restore')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delete_sale_record')}</DialogTitle>
              <DialogDescription>
                {t('delete_sale_warning')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>{t('cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : t('delete_permanently')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProductsSoldPage;