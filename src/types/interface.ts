
export interface Product {
    id?: string;
    productName: string;
    category: string;
    model?: string;
    costPrice: number;
    sellingPrice?: number | null;
    status: 'store' | 'sold' | 'restored' | 'deleted';
    restoreComment?: string;
    addedDate: string;
    deletedDate?: string;
    soldDate?: string;
    quantity: number;
    branch: string;
    deadline?: string;
    confirm: boolean;
    businessId: string;
    updatedAt?: string;
    productNameLower?: string;
    categoryLower?: string;
    modelLower?: string;
}

export interface SoldProduct {
    id: string;
    productName: string;
    category: string;
    model?: string;
    quantity: number;
    branch: string;
    costPrice: number;
    sellingPrice: number;
    soldDate: string;
    deadline?: string;
    businessId: string;
}

export interface RestoredProduct {
    id: string;
    productName: string;
    category: string;
    model?: string;
    quantity: number;
    branch: string;
    costPrice: number;
    sellingPrice?: number | null;
    restoredDate: string;
    restoreComment?: string | null;
    businessId: string;
}

export interface Branch {
    id?: string;
    branchName: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    businessId: string;
    createdAt?: string;
}

export interface Employee {
    id?: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    phone: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    gender?: string;
    role: 'admin' | 'staff';
    branch: string | null;
    businessId: string;
    businessName?: string;
    isActive: boolean;
    profileImage?: string | null;
    imagephoto?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface DashboardStats {
    totalProducts: number;
    totalCategories: number;
    totalModels: number;
    productsAddedToday: number;
    productsAddedThisWeek: number;
    productsAddedThisMonth: number;
    productsUpdatedToday: number;
    productsUpdatedThisMonth: number;
    productsNeverUpdated: number;
    activeProducts: number;
    pendingConfirmationCount: number;
    soldProducts: number;
    restoredProducts: number;
    deletedProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    mostStockedProduct: { name: string; quantity: number };
    leastStockedProduct: { name: string; quantity: number };
    averageStockPerProduct: number;
    totalStockQuantity: number;
    totalNetProfit: number;
    totalStockValue: number;
    totalLoss: number;
}

export interface ProductReport {
  id: string;
  productName: string;
  category: string;
  model?: string;
  quantity: number;
  branch: string;
  costPrice: number;
  sellingPrice: number | null;
  profitLoss: number | null;
  status: 'store' | 'sold' | 'restored' | 'deleted';
  addedDate: string;
  soldDate?: string;
  deletedDate?: string;
  restoreComment?: string;
  businessId: string;
}

export interface ReportSummary {
  totalProducts: number;
  storeCount: number;
  soldCount: number;
  restoredCount: number;
  deletedCount: number;
  grossProfit: number;
  totalLoss: number;
  netProfit: number;
  totalStoreValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}
