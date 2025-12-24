import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PendingChange } from '@/types';

interface OfflineContextType {
  isOnline: boolean;
  pendingChanges: PendingChange[];
  pendingCount: number;
  addPendingChange: (change: Omit<PendingChange, 'id' | 'timestamp'>) => void;
  clearPendingChanges: () => void;
  syncPendingChanges: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const PENDING_CHANGES_KEY = 'pixelmart_pending_changes';

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  // Load pending changes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PENDING_CHANGES_KEY);
    if (stored) {
      try {
        setPendingChanges(JSON.parse(stored));
      } catch {
        localStorage.removeItem(PENDING_CHANGES_KEY);
      }
    }
  }, []);

  // Save pending changes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingChange = (change: Omit<PendingChange, 'id' | 'timestamp'>) => {
    const newChange: PendingChange = {
      ...change,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setPendingChanges(prev => [...prev, newChange]);
  };

  const clearPendingChanges = () => {
    setPendingChanges([]);
    localStorage.removeItem(PENDING_CHANGES_KEY);
  };

  const syncPendingChanges = async () => {
    if (!isOnline || pendingChanges.length === 0) return;

    // TODO: Implement actual sync logic with Firestore
    // For now, just clear the pending changes
    clearPendingChanges();
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingChanges.length > 0) {
      // Could auto-sync here, but let user trigger it for now
    }
  }, [isOnline, pendingChanges.length]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingChanges,
        pendingCount: pendingChanges.length,
        addPendingChange,
        clearPendingChanges,
        syncPendingChanges,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
