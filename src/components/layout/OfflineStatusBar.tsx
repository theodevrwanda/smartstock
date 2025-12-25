import React, { useState } from 'react';
import { WifiOff, CloudOff, Upload, Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOffline } from '@/contexts/OfflineContext';
import { cn } from '@/lib/utils';

type Language = 'en' | 'rw';

const messages = {
  en: {
    offline: 'You are offline. All changes are saved locally and will sync when online.',
    pending: (count: number) => `${count} pending change${count !== 1 ? 's' : ''} waiting to sync`,
    sync: 'Sync Now',
    syncing: 'Syncing...',
  },
  rw: {
    offline: 'Uri gukora utari kuri interineti. Impinduka zose zibitswe kuri telefoni.',
    pending: (count: number) => `Hari impinduka ${count} zitegereje kubikwa`,
    sync: 'Ohereza',
    syncing: 'Kohereza...',
  },
};

const OfflineStatusBar: React.FC = () => {
  const { isOnline, pendingCount, syncPendingChanges, isSyncing } = useOffline();
  const [language, setLanguage] = useState<Language>('en');

  if (isOnline && pendingCount === 0) return null;

  const t = messages[language];

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium transition-all duration-300',
        isOnline ? 'bg-amber-500 text-amber-950' : 'bg-red-500 text-white'
      )}
    >
      <div className="flex items-start gap-2">
        {isOnline ? (
          <>
            <CloudOff className="h-4 w-4 mt-0.5" />
            <span>{t.pending(pendingCount)}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 mt-0.5" />
            <span>{t.offline}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLanguage(language === 'en' ? 'rw' : 'en')}
          className="h-7 px-2 text-xs text-inherit hover:bg-white/20"
        >
          <Languages className="h-3 w-3 mr-1" />
          {language === 'en' ? 'RW' : 'EN'}
        </Button>

        {isOnline && pendingCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={syncPendingChanges}
            disabled={isSyncing}
            className="h-7 px-3 text-xs bg-white/20 hover:bg-white/30 text-inherit"
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {isSyncing ? t.syncing : t.sync}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OfflineStatusBar;
