import React, { useState, useEffect, useMemo } from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Download, ArrowUpDown, FileSpreadsheet, FileText, Package, Calendar as CalendarIcon, TrendingUp, DollarSign, Award } from 'lucide-react';
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
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getReportData } from '@/functions/report';
import { getBranches } from '@/functions/branch';
import { ProductReport, ReportSummary, Branch } from '@/types/interface';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/exportUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ReportsPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isAdmin = user?.role === 'admin';
  const userBranch = user?.branch;
  const businessId = user?.businessId;

  const [products, setProducts] = useState<ProductReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'store' | 'sold' | 'restored' | 'deleted'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof ProductReport | 'branchName'>('addedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load data
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { products: prods, summary: sum } = await getReportData(
          businessId,
          user?.role || 'staff',
          userBranch
        );

        setProducts(prods);
        setSummary(sum);

        if (isAdmin) {
          const branchList = await getBranches(businessId);
          setBranches(branchList);
          const map = new Map<string, string>();
          branchList.forEach(b => b.id && map.set(b.id, b.branchName));
          setBranchMap(map);
        } else if (userBranch) {
          const staffBranchName = (user as any).branchName || 'Assigned Branch';
          const map = new Map<string, string>();
          map.set(userBranch, staffBranchName);
          setBranchMap(map);
        }
      } catch (err) {
        toast({ title: t('error'), description: 'Failed to load report data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId, user?.role, userBranch, isAdmin, toast, t]);

  const getBranchName = (id: string) => branchMap.get(id) || 'Unknown Branch';

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  // NEW: Daily/Weekly/Monthly/Yearly activity stats (added, sold, restored value)
  const activityStats = useMemo(() => {
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
      let dayValue = 0;

      products.forEach(p => {
        const dateStr = p.addedDate || p.soldDate || p.restoredDate || p.deletedDate || '';
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (!isSameDay(date, day)) return;

        if (p.status === 'store' && p.confirm === true) {
          dayValue += (p.costPricePerUnit ?? p.costPrice) * p.quantity;
        }
      });

      return {
        dayName: format(day, 'EEE').toUpperCase(),
        date: day,
        value: dayValue
      };
    });

    products.forEach(p => {
      // Only confirmed store products for Activity Value
      if (p.status !== 'store' || !p.confirm) return;

      const dateStr = p.addedDate || '';
      if (!dateStr) return;

      const date = new Date(dateStr);
      const value = (p.costPricePerUnit ?? p.costPrice) * p.quantity;

      if (isWithinInterval(date, { start: weekStart, end: weekEnd })) weekly += value;
      if (isWithinInterval(date, { start: monthStart, end: monthEnd })) monthly += value;
      if (isWithinInterval(date, { start: yearStart, end: endOfYear(selectedDate) })) yearly += value;
    });

    return { weekly, monthly, yearly, timelineData };
  }, [products, selectedDate]);

  // Filtering
  const filteredProducts = useMemo(() => {
    let filtered = products
      .filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.restoreComment || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => statusFilter === 'all' || p.status === statusFilter)
      .filter(p => categoryFilter === 'All' || p.category === categoryFilter);

    if (isAdmin && branchFilter !== 'All') {
      filtered = filtered.filter(p => p.branch === branchFilter);
    }

    return filtered;
  }, [products, searchTerm, statusFilter, categoryFilter, branchFilter, isAdmin]);

  // Sorting
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal: any = sortColumn === 'branchName' ? getBranchName(a.branch) : a[sortColumn as keyof ProductReport];
      let bVal: any = sortColumn === 'branchName' ? getBranchName(b.branch) : b[sortColumn as keyof ProductReport];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortColumn, sortDirection]);

  const handleSort = (column: keyof ProductReport | 'branchName') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getProfitColor = (profit: number | null) => {
    if (!profit || profit === 0) return 'text-gray-600 dark:text-gray-400';
    return profit > 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold';
  };

  // Export
  const reportExportColumns: ExportColumn[] = [
    { header: t('product_name'), key: 'productName', width: 30 },
    { header: t('category_label'), key: 'category', width: 15 },
    { header: t('model_label'), key: 'model', width: 20 },
    { header: t('quantity_label'), key: 'quantityFormatted', width: 15 },
    ...(isAdmin ? [{ header: t('branch'), key: 'branchName', width: 20 }] : []),
    { header: t('status_label'), key: 'status', width: 12 },
    { header: t('cost_price'), key: 'costPriceFormatted', width: 15 },
    { header: t('total_value'), key: 'totalValueFormatted', width: 15 },
    { header: t('selling_price'), key: 'sellingPriceFormatted', width: 15 },
    { header: 'Profit/Loss', key: 'profitLossFormatted', width: 15 },
    { header: t('added_date'), key: 'addedDateFormatted', width: 15 },
    { header: t('expiry_date'), key: 'expiryDateFormatted', width: 15 },
    { header: 'Sold/Deleted Date', key: 'soldDeletedDate', width: 15 },
    { header: 'Comment', key: 'restoreComment', width: 25 },
  ];

  const getReportExportData = () => {
    return sortedProducts.map(p => ({
      productName: p.productName,
      category: p.category,
      model: p.model || '-',
      quantityFormatted: `${p.quantity} ${p.unit || 'pcs'}`,
      ...(isAdmin ? { branchName: getBranchName(p.branch) } : {}),
      status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
      costPriceFormatted: `${(p.costPricePerUnit ?? p.costPrice).toLocaleString()} RWF`,
      totalValueFormatted: `${((p.costPricePerUnit ?? p.costPrice) * p.quantity).toLocaleString()} RWF`,
      sellingPriceFormatted: p.sellingPrice !== null ? `${p.sellingPrice.toLocaleString()} RWF` : 'N/A',
      profitLossFormatted: p.profitLoss !== null ? `${p.profitLoss >= 0 ? '+' : ''}${p.profitLoss.toLocaleString()} RWF` : 'N/A',
      addedDateFormatted: new Date(p.addedDate).toLocaleDateString(),
      expiryDateFormatted: p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'N/A',
      soldDeletedDate: p.soldDate ? new Date(p.soldDate).toLocaleDateString() : p.deletedDate ? new Date(p.deletedDate).toLocaleDateString() : 'N/A',
      restoreComment: p.restoreComment || '-',
    }));
  };

  const handleExportExcel = () => {
    if (sortedProducts.length === 0) {
      toast({ title: t('error'), description: t('no_data_available'), variant: 'destructive' });
      return;
    }
    exportToExcel(getReportExportData(), reportExportColumns, 'business-report');
    toast({ title: t('success'), description: 'Report exported to Excel' });
  };

  const handleExportPDF = () => {
    if (sortedProducts.length === 0) {
      toast({ title: t('error'), description: t('no_data_available'), variant: 'destructive' });
      return;
    }
    const netProfit = summary?.netProfit?.toLocaleString() || '0';
    exportToPDF(
      getReportExportData(),
      reportExportColumns,
      'business-report',
      `Business Report - Net Profit: ${netProfit} RWF`
    );
    toast({ title: t('success'), description: 'Report exported to PDF' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0f172a] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {t('no_data_available')}
      </div>
    );
  }

  return (
    <>
      <SEOHelmet title={t('business_report_title')} description={t('business_report_desc')} />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('business_report_title')}</h1>
            <p className="text-muted-foreground">
              {t('business_report_desc')}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t('export_report')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

        {/* Date Badge */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 bg-white/50 dark:bg-white/5 border-dashed border-gray-300 dark:border-gray-700 flex items-center gap-2">
            <CalendarIcon size={14} className="text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">{t('report_context')}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{format(selectedDate, 'MMMM do, yyyy')}</span>
          </Badge>
        </div>

        {/* Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100 uppercase tracking-wider">{t('weekly_activity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{activityStats.weekly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100 uppercase tracking-wider">{t('monthly_activity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{activityStats.monthly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
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
                {t('yearly_activity')}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase border-orange-500/50 text-orange-500 font-bold bg-orange-500/10">
                {format(selectedDate, 'yyyy')}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('total_value_processed')}</p>
                  <div className="text-3xl font-bold">{activityStats.yearly.toLocaleString()} <span className="text-lg font-normal opacity-80 ml-1">RWF</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Day Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {activityStats.timelineData.map((item, idx) => {
            const isSelected = isSameDay(item.date, selectedDate);
            const isToday = isSameDay(item.date, new Date());

            return (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedDate(item.date)}
                className={`
                  p-4 rounded-xl border cursor-pointer transition-all duration-300 relative
                  ${isSelected
                    ? "bg-amber-950/90 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-white ring-2 ring-amber-500/50"
                    : isToday
                      ? "bg-secondary/50 border-gray-300 dark:border-gray-700/60 dark:bg-accent/20 dark:border-gray-300 dark:border-gray-700/40 shadow-sm"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }
                `}
              >
                {isToday && !isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 bg-secondary0 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm uppercase">
                    {t('today')}
                  </div>
                )}
                <div className="flex flex-col items-center text-center gap-2">
                  <span className={`
                    text-[10px] font-bold tracking-tighter uppercase
                    ${isSelected ? "text-amber-500" : "text-gray-400 dark:text-gray-600"}
                  `}>
                    {item.dayName} {isSelected && "•"}
                  </span>
                  <div className="flex flex-col">
                    <span className={`
                      text-sm font-black
                      ${isSelected ? "text-white" : "text-gray-900 dark:text-gray-100 dark:text-blue-400"}
                    `}>
                      {item.value.toLocaleString()}
                    </span>
                    <span className={`
                      text-[9px] uppercase font-medium opacity-60
                      ${isSelected ? "text-amber-200" : "text-gray-500"}
                    `}>
                      {t('value')}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Existing summary cards */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('total_products')}</p>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('in_stock')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.storeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('sold')}</p>
            <p className="text-2xl font-bold text-green-600">{summary.soldCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('restored')}</p>
            <p className="text-2xl font-bold text-purple-600">{summary.restoredCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('deleted')}</p>
            <p className="text-2xl font-bold text-red-600">{summary.deletedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('expired_products')}</p>
            <p className="text-2xl font-bold text-red-500">{summary.expiredCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('total_store_value')}</p>
            <p className="text-2xl font-bold">{summary.totalStoreValue.toLocaleString()} RWF</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('gross_profit')}</p>
            <p className="text-2xl font-bold text-green-600">{summary.grossProfit.toLocaleString()} RWF</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-muted-foreground">{t('total_loss')}</p>
            <p className="text-2xl font-bold text-red-600">{summary.totalLoss.toLocaleString()} RWF</p>
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg">
            <p className="text-lg font-semibold">{t('net_profit')}</p>
            <p className="text-4xl font-black mt-2">
              {summary.netProfit.toLocaleString()} RWF
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder={t('search_products')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="store">{t('in_stock')}</SelectItem>
              <SelectItem value="sold">{t('sold')}</SelectItem>
              <SelectItem value="restored">{t('restored')}</SelectItem>
              <SelectItem value="deleted">{t('deleted')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{t('all')}</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">{t('all')}</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id!}>{b.branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1">{t('product_name')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">{t('category_label')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center gap-1 justify-center">{t('quantity_label')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => handleSort('branchName')}>
                  <div className="flex items-center gap-1 justify-center">{t('branch')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>{t('status_label')}</TableHead>
                <TableHead className="text-center">{t('confirmation')}</TableHead>
                <TableHead>{t('unit_cost_label')}</TableHead>
                <TableHead>{t('total_value')}</TableHead>
                <TableHead>{t('selling_price')}</TableHead>
                <TableHead>{t('profit_label')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('addedDate')}>
                  <div className="flex items-center gap-1">{t('added_date')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>{t('sold_deleted_date_label')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('expiryDate')}>
                  <div className="flex items-center gap-1">{t('expiry_date')} <ArrowUpDown className="h-4 w-4" /></div>
                </TableHead>
                <TableHead>{t('comment')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 13 : 12} className="h-64 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Package className="h-12 w-12 opacity-20" />
                      {!isAdmin && !userBranch ? (
                        <div>
                          <p className="font-semibold">{t('no_branch_assigned_msg')}</p>
                          <p className="text-sm mt-2">{t('contact_admin_access')}</p>
                        </div>
                      ) : (
                        <p className="text-lg font-medium">{t('no_products_found')} ({t('no_data_match')})</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{p.productName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{p.model || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="text-center font-bold">
                      {p.quantity.toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">{p.unit || 'pcs'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 text-[10px]">
                        {getBranchName(p.branch)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        p.status === 'store' ? 'default' :
                          p.status === 'sold' ? 'secondary' :
                            p.status === 'restored' ? 'outline' :
                              p.status === 'deleted' ? 'destructive' : 'secondary'
                      }>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.confirm ? 'default' : 'outline'} className={p.confirm ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}>
                        {p.confirm ? `✓ ${t('confirmed')}` : t('pending')}
                      </Badge>
                    </TableCell>
                    <TableCell className={getProfitColor(p.costPrice)}>
                      {(p.costPricePerUnit ?? p.costPrice).toLocaleString()} RWF
                    </TableCell>
                    <TableCell className="font-bold">
                      {((p.costPricePerUnit ?? p.costPrice) * p.quantity).toLocaleString()} RWF
                    </TableCell>
                    <TableCell>
                      {p.sellingPrice !== null
                        ? <span className={getProfitColor(p.sellingPrice)}>{p.sellingPrice.toLocaleString()} RWF</span>
                        : '-'}
                    </TableCell>
                    <TableCell className={getProfitColor(p.profitLoss)}>
                      {p.profitLoss !== null
                        ? `${p.profitLoss >= 0 ? '+' : ''}${p.profitLoss.toLocaleString()} RWF`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(p.addedDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">
                      {p.soldDate ? new Date(p.soldDate).toLocaleDateString() :
                        p.deletedDate ? new Date(p.deletedDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.expiryDate ? (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-medium",
                          new Date(p.expiryDate) < new Date() ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                        )}>
                          {new Date(p.expiryDate).toLocaleDateString()}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{p.restoreComment || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;