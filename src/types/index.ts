export interface Branch {
  id: string;
  branchName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  role: "admin" | "staff";
  branch?: string | Branch;
  imagephoto?: string | null;
  email: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  id: string;
  productName: string;
  category: string;
  model?: string;
  costPrice: number;
  sellingPrice: number;
  status: "store" | "sold" | "restored" | "deleted";
  restoreComment?: string;
  addedDate?: Date;
  deletedDate?: Date;
  soldDate?: Date;
  quantity: number;
  branch: string | Branch;
  supplier?: string;
  isDamaged?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalModels: number;
  productsAddedToday: number;
  productsAddedThisWeek: number;
  productsAddedThisMonth: number;
  productsAddedCustomRange: number;
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
  damagedProducts: number;
  productsWithSupplier: number;
  productsWithoutSupplier: number;
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