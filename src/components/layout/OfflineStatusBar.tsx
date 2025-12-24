import React from 'react';
import { Wifi, WifiOff, CloudOff, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOffline } from '@/contexts/OfflineContext';
import { cn } from '@/lib/utils';

const OfflineStatusBar: React.FC = () => {
  const { isOnline, pendingCount, syncPendingChanges } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] px-4 py-2 flex items-center justify-between text-sm font-medium transition-all duration-300',
        isOnline
          ? 'bg-amber-500 text-amber-950'
          : 'bg-red-500 text-white'
      )}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <CloudOff className="h-4 w-4" />
            <span>
              {pendingCount} pending change{pendingCount !== 1 ? 's' : ''} waiting to sync
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You are offline. Changes will be saved locally.</span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <Button
          size="sm"
          variant="secondary"
          onClick={syncPendingChanges}
          className="h-7 px-3 text-xs bg-white/20 hover:bg-white/30 text-inherit"
        >
          <Upload className="h-3 w-3 mr-1" />
          Sync Now
        </Button>
      )}
    </div>
  );
};

export default OfflineStatusBar;
