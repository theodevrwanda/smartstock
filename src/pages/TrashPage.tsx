import React, { useState, useEffect } from 'react';
import axios, { AxiosError, AxiosInstance } from 'axios';
import SEOHelmet from '@/components/SEOHelmet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, CheckCircle, Trash2, Eye } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Define interfaces based on backend schema
interface Branch {
  id: string;
  branchName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

interface Product {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
  branch: Branch;
  addedDate?: string;
  updatedAt?: string;
  status: 'store' | 'sold' | 'restored' | 'deleted';
  deletedDate?: string;
  soldDate?: string;
  deadline?: string;
  restoreComment?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const TrashPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  // Axios interceptors for token and error handling
  useEffect(() => {
    const requestInterceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await auth.currentUser?.getIdToken(true);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const message = (error.response?.data as any)?.message || error.message || 'An unexpected error occurred';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
      axiosInstance.interceptors.response.eject(responseInterceptor);
    };
  }, [toast]);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        toast({
          title: 'Error',
          description: 'You are not logged in. Please log in again.',
          variant: 'destructive',
        });
      }
    });
    return () => unsubscribe();
  }, [toast]);

  // Fetch deleted products
  useEffect(() => {
    const fetchDeletedProducts = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get<ApiResponse<{ products: any[] }>>('/trash');
        const productsData = response.data.data.products.map((product: any) => ({
          id: product._id,
          productName: product.productName,
          category: product.category,
          model: product.model,
          quantity: Number(product.quantity),
          costPrice: Number(product.costPrice),
          sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : undefined,
          branch: {
            id: product.branch._id || product.branch,
            branchName: product.branch.branchName || product.branch,
            district: product.branch.district || '',
            sector: product.branch.sector || '',
            cell: product.branch.cell || '',
            village: product.branch.village || '',
          },
          addedDate: product.addedDate,
          updatedAt: product.updatedAt,
          status: product.status,
          deletedDate: product.deletedDate,
          soldDate: product.soldDate,
          deadline: product.deadline,
          restoreComment: product.restoreComment,
        }));
        setProducts(productsData);
      } catch (error: any) {
        console.error('Error fetching deleted products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeletedProducts();
  }, [toast]);

  // Format currency for display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null || isNaN(amount)) return 'RWF 0';
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '–';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Get branch name for display
  const getBranchName = (branch: Branch): string => {
    return branch ? `${branch.branchName}, ${branch.district}` : 'Unknown';
  };

  // Filter products based on search term
  const filteredProducts = products.filter(
    p =>
      p.status === 'deleted' &&
      (p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        getBranchName(p.branch).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.restoreComment || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle product selection
  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Restore a single product
  const handleRestoreProduct = async (productId: string) => {
    try {
      setActionLoading(true);
      const response = await axiosInstance.put<ApiResponse<Product>>(`/trash/${productId}/restore`);
      setProducts(prev => prev.filter(p => p.id !== productId));
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      toast({
        title: 'Success',
        description: response.data.message || 'Product restored successfully',
      });
    } catch (error: any) {
      console.error('Error restoring product:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Restore selected products
  const handleRestoreSelected = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: 'No Products Selected',
        description: 'Please select at least one product to restore.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActionLoading(true);
      const response = await axiosInstance.put<ApiResponse<{ modifiedCount: number }>>(
        '/trash/restore-selected',
        { productIds: selectedProducts }
      );
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      toast({
        title: 'Success',
        description: response.data.message || `${response.data.data.modifiedCount} product(s) restored successfully`,
      });
    } catch (error: any) {
      console.error('Error restoring selected products:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Restore all products
  const handleRestoreAll = async () => {
    if (filteredProducts.length === 0) {
      toast({
        title: 'No Products to Restore',
        description: 'There are no deleted products to restore.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setActionLoading(true);
      const productIds = filteredProducts.map(p => p.id);
      const response = await axiosInstance.put<ApiResponse<{ modifiedCount: number }>>(
        '/trash/restore-selected',
        { productIds }
      );
      setProducts([]);
      setSelectedProducts([]);
      toast({
        title: 'Success',
        description: response.data.message || `${response.data.data.modifiedCount} product(s) restored successfully`,
      });
    } catch (error: any) {
      console.error('Error restoring all products:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Open confirmation dialog for single product deletion
  const openDeleteConfirmDialog = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteConfirmOpen(true);
  };

  // Permanently delete a single product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setActionLoading(true);
      const response = await axiosInstance.delete<ApiResponse<null>>(`/trash/${productToDelete}`);
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      setSelectedProducts(prev => prev.filter(id => id !== productToDelete));
      setProductToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast({
        title: 'Success',
        description: response.data.message || 'Product permanently deleted',
      });
    } catch (error: any) {
      console.error('Error permanently deleting product:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Permanently delete selected products
  const handleDeleteSelected = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: 'No Products Selected',
        description: 'Please select at least one product to delete.',
        variant: 'destructive',
      });
      return;
    }
    setIsDeleteSelectedConfirmOpen(true);
  };

  // Confirm permanent deletion of selected products
  const handleConfirmDeleteSelected = async () => {
    try {
      setActionLoading(true);
      const response = await axiosInstance.delete<ApiResponse<{ deletedCount: number }>>('/trash/delete-selected', {
        data: { productIds: selectedProducts },
      });
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      setIsDeleteSelectedConfirmOpen(false);
      toast({
        title: 'Success',
        description: response.data.message || `${response.data.data.deletedCount} product(s) permanently deleted`,
      });
    } catch (error: any) {
      console.error('Error permanently deleting selected products:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Open details dialog
  const openDetailsDialog = (product: Product) => {
    setCurrentProduct(product);
    setIsDetailsDialogOpen(true);
  };

  // Unified loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <SEOHelmet
        title="Trash - Deleted Products - EMS"
        description="View, restore, or permanently delete archived products in the Electronic Management System."
        canonical="/products/trash"
      />
      <div className="space-y-6 p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Trash - Deleted Products</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View, restore, or permanently delete archived products</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRestoreAll}
              className="bg-green-600 text-white hover:bg-green-700 hidden sm:flex"
              title="Restore All"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" className="text-white mr-2" />
              ) : (
                <CheckCircle size={18} className="mr-2" />
              )}
              All
            </Button>
            <Button
              onClick={handleRestoreSelected}
              className="bg-blue-600 text-white hover:bg-blue-700 hidden sm:flex"
              disabled={selectedProducts.length === 0 || actionLoading}
              title="Restore Selected"
            >
              {actionLoading ? (
                <LoadingSpinner size="sm" className="text-white mr-2" />
              ) : (
                <CheckCircle size={18} className="mr-2" />
              )}
              Selected
            </Button>
            {isAdmin && (
              <Button
                onClick={handleDeleteSelected}
                className="bg-red-600 text-white hover:bg-red-700 hidden sm:flex"
                disabled={selectedProducts.length === 0 || actionLoading}
                title="Delete Selected"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" className="text-white mr-2" />
                ) : (
                  <Trash2 size={18} className="mr-2" />
                )}
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search by name, category, model, branch, or comment..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
            disabled={actionLoading}
          />
        </div>
        <hr className="my-6 border-gray-200 dark:border-gray-700" />
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>No deleted products found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={() => {
                        if (selectedProducts.length === filteredProducts.length) {
                          setSelectedProducts([]);
                        } else {
                          setSelectedProducts(filteredProducts.map(p => p.id));
                        }
                      }}
                      disabled={actionLoading}
                    />
                  </TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="sm:hidden w-[50px]">View</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="hidden sm:table-cell">Model</TableHead>
                  <TableHead className="hidden sm:table-cell">Quantity</TableHead>
                  <TableHead className="hidden sm:table-cell">Branch</TableHead>
                  <TableHead className="hidden sm:table-cell">Cost Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Restore Comment</TableHead>
                  <TableHead className="hidden sm:table-cell">Deleted Date</TableHead>
                  <TableHead className="hidden sm:table-cell w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                        disabled={actionLoading}
                      />
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[150px] sm:max-w-none">{product.productName}</TableCell>
                    <TableCell className="sm:hidden" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetailsDialog(product)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
                        title="View Details"
                        disabled={actionLoading}
                      >
                        <Eye size={14} />
                      </Button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{product.category}</TableCell>
                    <TableCell className="hidden sm:table-cell">{product.model || '–'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{product.quantity} units</TableCell>
                    <TableCell className="hidden sm:table-cell">{getBranchName(product.branch)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatCurrency(product.costPrice)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{product.restoreComment || '–'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(product.deletedDate)}</TableCell>
                    <TableCell className="hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestoreProduct(product.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900"
                          title="Restore"
                          disabled={actionLoading}
                        >
                          <CheckCircle size={14} />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteConfirmDialog(product.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
                            title="Delete Permanently"
                            disabled={actionLoading}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Product Details: {currentProduct?.productName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {currentProduct && (
                <>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Category:</span> {currentProduct.category}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Model:</span> {currentProduct.model || '–'}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Quantity:</span> {currentProduct.quantity} units
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Branch:</span> {getBranchName(currentProduct.branch)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Cost Price:</span> {formatCurrency(currentProduct.costPrice)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Selling Price:</span> {formatCurrency(currentProduct.sellingPrice)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Restore Comment:</span> {currentProduct.restoreComment || '–'}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Deleted Date:</span> {formatDate(currentProduct.deletedDate)}
                  </p>
                </>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDetailsDialogOpen(false)}
                disabled={actionLoading}
              >
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    if (currentProduct) handleRestoreProduct(currentProduct.id);
                  }}
                  className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900"
                  title="Restore"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <LoadingSpinner size="sm" className="text-green-600 mr-2" />
                  ) : (
                    <CheckCircle size={14} className="mr-1" />
                  )}
                  Restore
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      if (currentProduct) openDeleteConfirmDialog(currentProduct.id);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
                    title="Delete Permanently"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <LoadingSpinner size="sm" className="text-red-600 mr-2" />
                    ) : (
                      <Trash2 size={14} className="mr-1" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Permanent Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this product? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteProduct}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDeleteSelectedConfirmOpen} onOpenChange={setIsDeleteSelectedConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Permanent Deletion of Selected Products</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete {selectedProducts.length} selected product(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteSelectedConfirmOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleConfirmDeleteSelected}
                disabled={actionLoading}
              >
                {actionLoading && <LoadingSpinner size="sm" className="text-white mr-2" />}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TrashPage;