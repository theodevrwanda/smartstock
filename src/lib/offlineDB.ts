// src/lib/offlineDB.ts
// Complete offline-first database using IndexedDB

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { toast } from 'sonner';

// Types for our database
export interface OfflineProduct {
  id: string;
  productName: string;
  category: string;
  model?: string | null;
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
  deadline?: string | null;
  confirm: boolean;
  businessId: string;
  updatedAt?: string;
  productNameLower?: string;
  categoryLower?: string;
  modelLower?: string | null;
  // Sync tracking
  _localOnly?: boolean;
  _pendingSync?: boolean;
  _syncOperation?: 'add' | 'update' | 'delete' | 'sell' | 'restore';
}

export interface PendingOperation {
  id: string;
  type: 'addProduct' | 'updateProduct' | 'deleteProduct' | 'sellProduct' | 'restoreProduct' | 'sellRestoredProduct' | 'updateBusiness';
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

export interface OfflineUser {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'staff';
  branch?: string | null;
  businessId: string;
  profileImage?: string | null;
  imagephoto?: string | null;
  isActive: boolean;
  updatedAt?: string;
  _pendingSync?: boolean;
  _pendingImageUpload?: boolean;
  _localImageData?: string; // Base64 image for offline
}

export interface OfflineBranch {
  id: string;
  branchName: string;
  businessId: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Database schema
interface PixelMartDB extends DBSchema {
  products: {
    key: string;
    value: OfflineProduct;
    indexes: {
      'by-status': string;
      'by-branch': string;
      'by-businessId': string;
      'by-category': string;
    };
  };
  pendingOperations: {
    key: string;
    value: PendingOperation;
    indexes: {
      'by-status': string;
      'by-timestamp': number;
    };
  };
  users: {
    key: string;
    value: OfflineUser;
    indexes: {
      'by-businessId': string;
      'by-branch': string;
    };
  };
  branches: {
    key: string;
    value: OfflineBranch;
    indexes: {
      'by-businessId': string;
    };
  };
  meta: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'pixelmart-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PixelMartDB> | null = null;

// Initialize the database
export async function initOfflineDB(): Promise<IDBPDatabase<PixelMartDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PixelMartDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-status', 'status');
        productStore.createIndex('by-branch', 'branch');
        productStore.createIndex('by-businessId', 'businessId');
        productStore.createIndex('by-category', 'category');
      }

      // Pending operations store
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const opsStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
        opsStore.createIndex('by-status', 'status');
        opsStore.createIndex('by-timestamp', 'timestamp');
      }

      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-businessId', 'businessId');
        userStore.createIndex('by-branch', 'branch');
      }

      // Branches store
      if (!db.objectStoreNames.contains('branches')) {
        const branchStore = db.createObjectStore('branches', { keyPath: 'id' });
        branchStore.createIndex('by-businessId', 'businessId');
      }

      // Meta store for sync timestamps etc
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// Get database instance
export async function getDB(): Promise<IDBPDatabase<PixelMartDB>> {
  if (!dbInstance) {
    return initOfflineDB();
  }
  return dbInstance;
}

// ============ PRODUCTS ============

// Save products to local DB (for caching cloud data)
export async function cacheProducts(products: OfflineProduct[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');

  for (const product of products) {
    await tx.store.put({ ...product, _localOnly: false, _pendingSync: false });
  }

  await tx.done;
}

// Get products from local DB
export async function getLocalProducts(
  businessId: string,
  status: OfflineProduct['status'],
  branchId?: string | null
): Promise<OfflineProduct[]> {
  const db = await getDB();
  const allProducts = await db.getAllFromIndex('products', 'by-businessId', businessId);

  return allProducts.filter(p => {
    if (p.status !== status) return false;
    if (branchId && p.branch !== branchId) return false;
    return true;
  });
}

// Get all products by status
export async function getLocalProductsByStatus(
  businessId: string,
  statuses: OfflineProduct['status'][],
  branchId?: string | null
): Promise<OfflineProduct[]> {
  const db = await getDB();
  const allProducts = await db.getAllFromIndex('products', 'by-businessId', businessId);

  return allProducts.filter(p => {
    if (!statuses.includes(p.status)) return false;
    if (branchId && p.branch !== branchId) return false;
    return true;
  });
}

// Add/update product locally
export async function saveProductLocally(product: OfflineProduct, isPending = true): Promise<OfflineProduct> {
  const db = await getDB();

  const toSave = {
    ...product,
    _localOnly: !navigator.onLine,
    _pendingSync: isPending && !navigator.onLine,
    updatedAt: new Date().toISOString(),
  };

  await db.put('products', toSave);
  return toSave;
}

// Delete product from local DB
export async function deleteProductLocally(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('products', id);
}

// Get single product
export async function getLocalProduct(id: string): Promise<OfflineProduct | undefined> {
  const db = await getDB();
  return db.get('products', id);
}

// ============ PENDING OPERATIONS ============

// Add pending operation
export async function addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<string> {
  const db = await getDB();
  const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db.put('pendingOperations', {
    ...operation,
    id,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  });

  return id;
}

// Get all pending operations
export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingOperations', 'by-status', 'pending');
}

// Get pending operation count
export async function getPendingCount(): Promise<number> {
  const ops = await getPendingOperations();
  return ops.length;
}

// Update operation status
export async function updateOperationStatus(id: string, status: PendingOperation['status']): Promise<void> {
  const db = await getDB();
  const op = await db.get('pendingOperations', id);
  if (op) {
    op.status = status;
    if (status === 'failed') {
      op.retryCount++;
    }
    await db.put('pendingOperations', op);
  }
}

// Remove completed operation
export async function removeOperation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingOperations', id);
}

// Clear all pending operations
export async function clearPendingOperations(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pendingOperations', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// ============ USERS ============

// Cache users locally
export async function cacheUsers(users: OfflineUser[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('users', 'readwrite');

  for (const user of users) {
    await tx.store.put(user);
  }

  await tx.done;
}

// Get local users
export async function getLocalUsers(businessId: string): Promise<OfflineUser[]> {
  const db = await getDB();
  return db.getAllFromIndex('users', 'by-businessId', businessId);
}

// Save user locally
export async function saveUserLocally(user: OfflineUser): Promise<void> {
  const db = await getDB();
  await db.put('users', user);
}

// Get single user
export async function getLocalUser(id: string): Promise<OfflineUser | undefined> {
  const db = await getDB();
  return db.get('users', id);
}

// ============ BRANCHES ============

// Cache branches locally
export async function cacheBranches(branches: OfflineBranch[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('branches', 'readwrite');

  for (const branch of branches) {
    await tx.store.put(branch);
  }

  await tx.done;
}

// Get local branches
export async function getLocalBranches(businessId: string): Promise<OfflineBranch[]> {
  const db = await getDB();
  return db.getAllFromIndex('branches', 'by-businessId', businessId);
}

// ============ META ============

// Save meta value
export async function saveMeta(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value, updatedAt: new Date().toISOString() });
}

// Get meta value
export async function getMeta(key: string): Promise<any> {
  const db = await getDB();
  const meta = await db.get('meta', key);
  return meta?.value;
}

// ============ SYNC HELPERS ============

// Mark all local-only products as synced
export async function markProductsSynced(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  const products = await tx.store.getAll();

  for (const product of products) {
    if (product._pendingSync) {
      product._pendingSync = false;
      product._localOnly = false;
      await tx.store.put(product);
    }
  }

  await tx.done;
}

// Get products that need syncing
export async function getProductsNeedingSync(): Promise<OfflineProduct[]> {
  const db = await getDB();
  const products = await db.getAll('products');
  return products.filter(p => p._pendingSync);
}

// Notification helper
export function notifyOfflineAction(action: string) {
  if (!navigator.onLine) {
    toast.info(`📴 ${action} saved locally. Will sync when online.`);
  }
}

export function notifyOnlineSync() {
  toast.success('📶 Back online! Syncing all changes to cloud...');
}

export function notifySyncComplete(count: number) {
  toast.success(`✅ Synced ${count} pending change${count !== 1 ? 's' : ''} to cloud`);
}

export function notifyOfflineMode() {
  toast.warning('⚠️ You are offline. All changes will be saved locally and synced when online.');
}
