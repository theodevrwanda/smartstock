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
}

export interface Product {
  id?: string;
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  sellingPrice?: number | null;
  status: "store" | "sold" | "restored" | "deleted";
  restoreComment?: string;
  addedDate?: string;
  deletedDate?: string;
  soldDate?: string;
  restoredDate?: string;
  quantity: number;
  branch: string;
  businessId: string;
  deadline?: string;
  confirm?: boolean;
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
  soldProducts: number;
  restoredProducts: number;
  deletedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  mostStockedProduct: { name: string; quantity: number };
  leastStockedProduct: { name: string; quantity: number };
  averageStockPerProduct: number;
  totalStockQuantity: number;
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
