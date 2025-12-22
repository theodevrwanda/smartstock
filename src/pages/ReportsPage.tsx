import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Download,
  Package,
  AlertCircle,
  ShoppingCart,
  Warehouse,
  Box,
  DollarSign,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { auth } from '@/firebase/firebase';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Product {
  _id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: {
    _id: string;
    branchName: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  status: 'store' | 'sold' | 'restored' | 'deleted';
  costPrice: number;
  sellingPrice: number | null;
  productProfitLoss: number | null;
  addedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  restoreComment?: string;
  soldDate?: string;
  deletedDate?: string;
  deadline?: string;
  confirm: boolean;
}

interface ReportData {
  totalProducts: number;
  storeCount: number;
  soldCount: number;
  restoredCount: number;
  deletedCount: number;
  totalProfit: number;
  totalLoss: number;
  profitableSales: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  totalCostPrice: number;
  totalSellingPrice: number;
  totalStoreCostPrice: number;
}

interface Branch {
  _id: string;
  branchName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

type SortableProductKeys = 'addedDate' | 'soldDate' | 'updatedAt' | 'deletedDate';
type SortDirection = 'asc' | 'desc';

const ReportsPage: React.FC = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const assignedBranch = user?.branch || '';
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportFilter, setReportFilter] = useState<
    'all' | 'store' | 'sold' | 'restored' | 'deleted'
  >('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortableProductKeys>('addedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access reports.',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [authLoading, user, toast, navigate]);

  // Axios interceptors for token and error handling
  useEffect(() => {
    const requestInterceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        const firebaseUser = auth.currentUser;
        console.log('Axios request:', config.url, 'User:', firebaseUser ? firebaseUser.uid : 'None');
        if (!firebaseUser) {
          console.warn('No Firebase user available for request');
          return config;
        }
        const token = await firebaseUser.getIdToken(true);
        console.log('Firebase ID Token:', token ? 'Present' : 'None');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('Response error:', error.response?.data, error.message);
        const message = (error.response?.data as any)?.message || error.message || 'An unexpected error occurred';
        if (error.response?.status === 401) {
          toast({
            title: 'Authentication Error',
            description: message,
            variant: 'destructive',
          });
          navigate('/login');
        } else {
          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
      axiosInstance.interceptors.response.eject(responseInterceptor);
    };
  }, [toast, navigate]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (authLoading || !user) return;
    try {
      const response = await axiosInstance.get<ApiResponse<{ branches: Branch[] }>>('/profile/branches');
      console.log('Branches response:', response.data);
      let branchesData: Branch[] = [];
      if (response.data.success && response.data.data?.branches) {
        branchesData = response.data.data.branches;
      } else if (response.data.success && response.data.branches) {
        branchesData = response.data.branches;
      } else if (Array.isArray(response.data)) {
        branchesData = response.data;
      } else {
        throw new Error('Unexpected branches response format');
      }
      setBranches(branchesData.map((branch: any) => ({
        _id: branch._id,
        branchName: branch.branchName,
        district: branch.district,
        sector: branch.sector,
        cell: branch.cell,
        village: branch.village,
      })));
      if (!branchesData.length) {
        toast({
          title: 'No Branches',
          description: 'No branches found in the database.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch branches. Using branch data from products.',
        variant: 'destructive',
      });
    }
  }, [toast, authLoading, user]);

  // Fetch report data
  const fetchData = useCallback(async () => {
    if (authLoading || !user) return;
    setLoading(true);
    try {
      console.log('Fetching reports for user:', user ? user.id : 'No user');
      const response = await axiosInstance.get<ApiResponse<{
        reportData: ReportData;
        products: Product[];
        branches: Branch[];
      }>>('/reports');
      console.log('Reports response:', response.data);
      if (response.data.success) {
        setReportData(response.data.data.reportData);
        setProducts(response.data.data.products);
        const uniqueBranches = Array.from(
          new Map(
            response.data.data.products.map(p => [p.branch._id, p.branch])
          ).values()
        );
        setBranches(prev => [
          ...prev,
          ...uniqueBranches.filter(b => !prev.some(pb => pb._id === b._id)),
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to fetch report data');
      }
    } catch (error: any) {
      console.error('Fetch reports error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to fetch reports. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, authLoading, user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
      fetchBranches();
    }
  }, [fetchData, fetchBranches, authLoading, user]);

  const handleExportReport = (reportType: string) => {
    let csvContent = '';
    let filename = '';

    const getBranchName = (branch: Product['branch']): string => {
      return branch ? `${branch.branchName}, ${branch.district}` : 'Unknown';
    };

    // Use filteredProducts for consistency with UI, except for 'all' where we explicitly exclude restored
    let exportProducts = filteredProducts;
    if (reportType === 'all') {
      exportProducts = products.filter(p => p.status !== 'restored');
    }

    switch (reportType) {
      case 'all':
        csvContent = [
          [
            'ID',
            'Name',
            'Category',
            'Model',
            'Quantity',
            'Status',
            'Cost Price',
            'Selling Price',
            'Profit/Loss',
            'Branch',
            'Date Added',
            'Last Updated',
            'Sold Date',
            'Deleted Date',
          ],
          ...exportProducts.map(p => [
            p._id,
            p.productName,
            p.category,
            p.model || '–',
            p.quantity.toString(),
            p.status,
            formatAmount(p.costPrice),
            formatAmount(p.sellingPrice),
            formatAmount(p.productProfitLoss),
            getBranchName(p.branch),
            formatDate(p.addedDate),
            formatDate(p.updatedAt),
            formatDate(p.soldDate),
            formatDate(p.deletedDate),
          ]),
        ]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        filename = 'all-products-report.csv';
        break;
      case 'sold':
        csvContent = [
          ['ID', 'Name', 'Category', 'Model', 'Quantity', 'Selling Price', 'Profit/Loss', 'Branch', 'Sold Date'],
          ...exportProducts
            .filter(p => p.status === 'sold')
            .map(p => [
              p._id,
              p.productName,
              p.category,
              p.model || '–',
              p.quantity.toString(),
              formatAmount(p.sellingPrice),
              formatAmount(p.productProfitLoss),
              getBranchName(p.branch),
              formatDate(p.soldDate),
            ]),
        ]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        filename = 'sold-products-report.csv';
        break;
      case 'restored':
        csvContent = [
          ['ID', 'Name', 'Category', 'Model', 'Quantity', 'Branch', 'Restore Comment'],
          ...exportProducts
            .filter(p => p.status === 'restored')
            .map(p => [
              p._id,
              p.productName,
              p.category,
              p.model || '–',
              p.quantity.toString(),
              getBranchName(p.branch),
              p.restoreComment || '–',
            ]),
        ]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        filename = 'restored-products-report.csv';
        break;
      case 'deleted':
        csvContent = [
          ['ID', 'Name', 'Category', 'Model', 'Quantity', 'Loss', 'Branch', 'Deleted Date'],
          ...exportProducts
            .filter(p => p.status === 'deleted')
            .map(p => [
              p._id,
              p.productName,
              p.category,
              p.model || '–',
              p.quantity.toString(),
              formatAmount(p.costPrice * p.quantity),
              getBranchName(p.branch),
              formatDate(p.deletedDate),
            ]),
        ]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        filename = 'deleted-products-report.csv';
        break;
      case 'lowStock':
        csvContent = [
          ['ID', 'Name', 'Category', 'Model', 'Quantity', 'Branch'],
          ...exportProducts
            .filter(p => p.status === 'store' && p.quantity > 0 && p.quantity <= 5)
            .map(p => [
              p._id,
              p.productName,
              p.category,
              p.model || '–',
              p.quantity.toString(),
              getBranchName(p.branch),
            ]),
        ]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        filename = 'low-stock-products-report.csv';
        break;
      case 'outOfStock':
        csvContent = [
          ['ID', 'Name', 'Category', 'Model', 'Quantity', 'Branch'],
          ...exportProducts
            .filter(p => p.quantity === 0)
            .map(p => [
              p._id,
              p.productName,
              p.category,
              p.model || '–',
              p.quantity.toString(),
              getBranchName(p.branch),
            ]),
        ]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        filename = 'out-of-stock-products-report.csv';
        break;
      default:
        toast({
          title: 'Export Error',
          description: 'Selected report type is not available for export.',
          variant: 'destructive',
        });
        return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report exported to CSV file`,
    });
  };

  const formatAmount = (amount: number | null) => {
    if (!amount && amount !== 0) return '–';
    const formatted = Math.abs(amount) < 1_000_000 ? `${amount.toLocaleString('en-US')} RWF` : `${(amount / 1_000_000).toFixed(1)}M RWF`;
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '–';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getBranchName = (branch: Product['branch']): string => {
    return branch ? `${branch.branchName}, ${branch.district}` : 'Unknown';
  };

  const handleSort = (field: SortableProductKeys) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const matchesDate = (product: Product, selectedDate: Date | null): boolean => {
    if (!selectedDate) return true;
    const dateFields: (keyof Product)[] = ['addedDate', 'soldDate', 'updatedAt', 'deletedDate'];
    const selectedDateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    return dateFields.some(field => {
      const productDate = product[field];
      if (!productDate) return false;
      const productDateStr = new Date(productDate).toISOString().split('T')[0];
      return productDateStr === selectedDateStr;
    });
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch =
        p._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        getBranchName(p.branch).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesReportFilter =
        reportFilter === 'all' ? p.status !== 'restored' :
        reportFilter === 'store' ? p.status === 'store' :
        reportFilter === 'sold' ? p.status === 'sold' :
        reportFilter === 'restored' ? p.status === 'restored' :
        reportFilter === 'deleted' ? p.status === 'deleted' : false;
      const matchesBranch = branchFilter === 'All' || getBranchName(p.branch) === branchFilter;
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesSelectedDate = matchesDate(p, selectedDate);
      return matchesSearch && matchesReportFilter && matchesBranch && matchesCategory && matchesSelectedDate;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const aTime = aValue ? new Date(aValue).getTime() : 0;
      const bTime = bValue ? new Date(bValue).getTime() : 0;
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    });

  const branchesList = ['All', ...new Set(branches.map(b => getBranchName(b)))];
  const categories = ['All', ...new Set(products.map(p => p.category))];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-gray-600 dark:text-gray-400">
        <Card className="max-w-md w-full p-6 bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Error Loading Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to load reports. Please try again.
            </p>
            <Button
              onClick={fetchData}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Inventory Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">Insights into electronic store inventory</p>
        </div>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search by name, category, model, or branch..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                disabled={loading}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-gray-700 dark:text-gray-200">Report Type:</Label>
              <Select value={reportFilter} onValueChange={value => setReportFilter(value as any)} disabled={loading}>
                <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select Report" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="store">Stored Products</SelectItem>
                  <SelectItem value="sold">Sold Products</SelectItem>
                  <SelectItem value="restored">Restored Products</SelectItem>
                  <SelectItem value="deleted">Deleted Products</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-gray-700 dark:text-gray-200">Branch:</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter} disabled={!isAdmin || loading}>
                <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Filter by Branch" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {branchesList.map(branch => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-gray-700 dark:text-gray-200">Category:</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
                <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-gray-700 dark:text-gray-200">Date:</Label>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                  onChange={handleDateChange}
                  className="w-[180px] bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                  disabled={loading}
                />
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={clearDateFilter}
                    disabled={loading}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
              {isAdmin ? 'Total Products' : 'Products in Stock'}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {isAdmin ? reportData.totalProducts : reportData.storeCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Across all branches' : 'Products in stock'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Stored Products</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{reportData.storeCount}</div>
            <p className="text-xs text-muted-foreground">In stock</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Sold Products</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{reportData.soldCount}</div>
            <p className="text-xs text-muted-foreground">Total units sold</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Restored Products</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{reportData.restoredCount}</div>
            <p className="text-xs text-muted-foreground">Restored units</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Deleted Products</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{reportData.deletedCount}</div>
            <p className="text-xs text-muted-foreground">Deleted units</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Cost (Stored)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(reportData.totalStoreCostPrice)}</div>
            <p className="text-xs text-muted-foreground">Cost of products in stock</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Total Cost (Sold)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(reportData.totalCostPrice)}</div>
            <p className="text-xs text-muted-foreground">Cost of products sold</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl md:text-2xl font-bold ${reportData.totalProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatAmount(reportData.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">From all sold products</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Loss from Products Sold Below Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{formatAmount(reportData.totalLoss)}</div>
            <p className="text-xs text-muted-foreground">From sold products where selling price </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Low/Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{reportData.lowStockCount + reportData.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">{reportData.lowStockCount} low, {reportData.outOfStockCount} out</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-gray-900 dark:text-white">Product Report</CardTitle>
            <div className="flex items-center gap-4">
              <Button onClick={() => handleExportReport(reportFilter)} variant="outline" size="sm" disabled={loading}>
                <Download size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredProducts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center">No products found for the selected filters.</p>
              ) : (
                filteredProducts.map((product, index) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-900"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5] }}
                      ></div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">{product.productName}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.category} - {product.model || '–'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Added: {formatDate(product.addedDate)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Updated: {formatDate(product.updatedAt)}</p>
                        {product.status === 'sold' && product.soldDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Sold: {formatDate(product.soldDate)}</p>
                        )}
                        {product.status === 'deleted' && product.deletedDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Deleted: {formatDate(product.deletedDate)}</p>
                        )}
                        {product.status === 'sold' && product.productProfitLoss !== null && (
                          <p className={`text-xs ${product.productProfitLoss < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            Profit/Loss: {formatAmount(product.productProfitLoss)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{product.quantity} units</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getBranchName(product.branch)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-gray-900 dark:text-white">Restored Products</CardTitle>
            <div className="flex items-center gap-4">
              <Button onClick={() => handleExportReport('restored')} variant="outline" size="sm" disabled={loading}>
                <Download size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {products.filter(p => p.status === 'restored' && matchesDate(p, selectedDate)).length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center">No restored products found for the selected filters.</p>
              ) : (
                products
                  .filter(p => p.status === 'restored' && matchesDate(p, selectedDate))
                  .sort((a, b) => {
                    const aValue = a[sortField];
                    const bValue = b[sortField];
                    const aTime = aValue ? new Date(aValue).getTime() : 0;
                    const bTime = bValue ? new Date(bValue).getTime() : 0;
                    return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
                  })
                  .map((product, index) => (
                    <div
                      key={product._id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5] }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white">{product.productName}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{product.category} - {product.model || '–'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Added: {formatDate(product.addedDate)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Updated: {formatDate(product.updatedAt)}</p>
                          {product.restoreComment && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Comment: {product.restoreComment}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{product.quantity} units</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{getBranchName(product.branch)}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Generate Custom Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleExportReport('all')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center text-gray-900 dark:text-white"
              disabled={loading}
            >
              <Package size={20} className="mb-1" />
              <span className="text-sm">All Products</span>
            </Button>
            <Button
              onClick={() => handleExportReport('sold')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center text-gray-900 dark:text-white"
              disabled={loading}
            >
              <ShoppingCart size={20} className="mb-1" />
              <span className="text-sm">Sold Products</span>
            </Button>
            <Button
              onClick={() => handleExportReport('restored')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center text-gray-900 dark:text-white"
              disabled={loading}
            >
              <Warehouse size={20} className="mb-1" />
              <span className="text-sm">Restored Products</span>
            </Button>
            <Button
              onClick={() => handleExportReport('deleted')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center text-gray-900 dark:text-white"
              disabled={loading}
            >
              <Box size={20} className="mb-1" />
              <span className="text-sm">Deleted Products</span>
            </Button>
            <Button
              onClick={() => handleExportReport('lowStock')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center text-gray-900 dark:text-white"
              disabled={loading}
            >
              <AlertCircle size={20} className="mb-1" />
              <span className="text-sm">Low Stock</span>
            </Button>
            <Button
              onClick={() => handleExportReport('outOfStock')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center text-gray-900 dark:text-white"
              disabled={loading}
            >
              <Box size={20} className="mb-1" />
              <span className="text-sm">Out of Stock</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;