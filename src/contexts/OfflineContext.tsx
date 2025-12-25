import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  initOfflineDB,
  getPendingOperations,
  getPendingCount,
  addPendingOperation,
  removeOperation,
  clearPendingOperations,
  notifyOfflineAction,
  notifyOnlineSync,
  notifySyncComplete,
  notifyOfflineMode,
  PendingOperation,
} from '@/lib/offlineDB';
import { syncAllPendingOperations } from '@/lib/syncService';
import { toast } from 'sonner';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  addPendingChange: (type: PendingOperation['type'], data: any) => Promise<string>;
  syncPendingChanges: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize IndexedDB on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initOfflineDB();
        const count = await getPendingCount();
        setPendingCount(count);
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline DB:', error);
      }
    };
    init();
  }, []);

  // Refresh pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      notifyOnlineSync();
      
      // Auto-sync when coming back online
      const count = await getPendingCount();
      if (count > 0) {
        await syncPendingChanges();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      notifyOfflineMode();
    };

    // Initial check
    if (!navigator.onLine) {
      notifyOfflineMode();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add a pending change
  const addPendingChange = useCallback(async (type: PendingOperation['type'], data: any): Promise<string> => {
    const id = await addPendingOperation({ type, data });
    await refreshPendingCount();
    
    if (!navigator.onLine) {
      notifyOfflineAction(type.replace(/([A-Z])/g, ' $1').trim());
    }
    
    return id;
  }, [refreshPendingCount]);

  // Sync all pending changes
  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const operations = await getPendingOperations();
      if (operations.length === 0) {
        setIsSyncing(false);
        return;
      }

      const syncedCount = await syncAllPendingOperations(operations);
      
      if (syncedCount > 0) {
        notifySyncComplete(syncedCount);
      }
      
      await refreshPendingCount();
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed. Will retry when possible.');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  // Periodic sync attempt when online
  useEffect(() => {
    if (!isOnline || !initialized) return;

    const interval = setInterval(async () => {
      const count = await getPendingCount();
      if (count > 0 && !isSyncing) {
        await syncPendingChanges();
      }
    }, 30000); // Try every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, initialized, isSyncing, syncPendingChanges]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        addPendingChange,
        syncPendingChanges,
        refreshPendingCount,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
