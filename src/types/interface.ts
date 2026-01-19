
export interface Product {
    id?: string;
    productName: string;
    category: string;
    model: string;
    costPrice: number;
    sellingPrice?: number | null;
    status: 'store' | 'sold' | 'restored' | 'deleted';
    restoreComment?: string;
    addedDate: string;
    deletedDate?: string;
    soldDate?: string;
    restoredDate?: string;
    quantity: number;
    branch: string;
    deadline?: string;
    confirm: boolean;
    businessId: string;
    unit: string;
    costType?: 'costPerUnit' | 'bulkCost';
    costPricePerUnit?: number; // Added to store unit cost specifically
    updatedAt?: string;
    productNameLower?: string;
    categoryLower?: string;
    modelLower?: string;
    oldStatus?: 'store' | 'sold' | 'restored';
    expiryDate?: string;
}

export interface SoldProduct {
    id: string;
    productName: string;
    category: string;
    model: string;
    quantity: number;
    branch: string;
    costPrice: number;
    sellingPrice: number;
    soldDate: string;
    deadline?: string;
    businessId: string;
    buyerName?: string;
    buyerPhone?: string;
    paymentMethod?: string;
    unit: string;
    costType?: 'costPerUnit' | 'bulkCost';
    costPricePerUnit?: number; // Added for consistency
    unitCost?: number; // Kept for backward compatibility/clarity
    oldStatus?: 'store' | 'sold' | 'restored';
}

export interface RestoredProduct {
    id: string;
    productName: string;
    category: string;
    model: string;
    quantity: number;
    branch: string;
    costPrice: number;
    sellingPrice?: number | null;
    restoredDate: string;
    restoreComment?: string | null;
    businessId: string;
    unit: string;
    costType?: 'costPerUnit' | 'bulkCost';
    costPricePerUnit?: number;
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
    updatedAt?: string;
}

export interface User {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    phone: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    role: "admin" | "staff";
    branch?: string | null;
    imagephoto?: string | null;
    profileImage?: string | null;
    email: string;
    isActive: boolean;
    businessId?: string;
    gender?: string;
    createdAt?: string;
    updatedAt?: string;
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

export interface Business {
    id: string;
    businessName: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    ownerId: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    subscription?: Subscription;
}

export interface Subscription {
    plan: 'free' | 'monthly' | 'annually' | 'forever';
    status: 'active' | 'expired';
    startDate: string;
    endDate: string;
}

export interface Transaction {
    id?: string;
    businessId: string;
    businessName: string;
    amount: number;
    currency: string;
    paymentMethod: 'momo' | 'airtel' | 'bank';
    senderName: string;
    senderNumber: string;
    receiverName: string;
    plan: string;
    status: 'pending' | 'confirmed' | 'failed';
    confirm: boolean;
    createdAt: string;
    email?: string;
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
    mostStockedProduct: { name: string; quantity: number; value: number };
    leastStockedProduct: { name: string; quantity: number; value: number };
    averageStockPerProduct: number;
    totalStockQuantity: number;
    totalNetProfit: number;
    totalLoss: number;
    totalStockValue: number;
    expiredProductsCount: number;
}

export interface ProductReport {
    restoredDate: string;
    id: string;
    productName: string;
    category: string;
    model: string;
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
    unit: string;
    costPricePerUnit?: number;
    confirm?: boolean;
    expiryDate?: string;
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
    expiredCount: number;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    token?: string;
}

export interface ThemeContextType {
    theme: "light" | "dark";
    toggleTheme: () => void;
    setTheme: (theme: "light" | "dark") => void;
}

export interface Report {
    id: string;
    title: string;
    type: "sales" | "inventory" | "financial" | "employee" | "branch";
    dateRange: {
        start: string;
        end: string;
    };
    data: any;
    generatedBy: string;
    generatedAt: string;
    format: "pdf" | "excel" | "csv";
    status: "generating" | "ready" | "failed";
}

export interface Notification {
    id: string;
    type: "info" | "warning" | "error" | "success";
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    userId: string;
}

// Offline sync types
export interface PendingChange {
    id: string;
    collection: string;
    docId: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: string;
}

export interface OfflineState {
    isOnline: boolean;
    pendingChanges: number;
}
