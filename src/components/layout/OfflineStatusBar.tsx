import React from 'react';
import { WifiOff, CloudOff, Upload, Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOffline } from '@/contexts/OfflineContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const OfflineStatusBar: React.FC = () => {
  const { isOnline, pendingCount, syncPendingChanges, isSyncing } = useOffline();
  const { language, setLanguage, t } = useLanguage();

  // Only show when online and there are pending changes.
  // We do not show the "You are offline" banner anymore, as pages handle this via header icons.
  if (!isOnline || pendingCount === 0) return null;

  const pendingMsg = t('pending_changes_msg')
    .replace('{count}', pendingCount.toString())
    .replace('{s}', pendingCount !== 1 ? 's' : '');

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
            <span>{pendingMsg}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 mt-0.5" />
            <span>{t('offline_status')}</span>
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
            {isSyncing ? t('syncing') : t('sync_now')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OfflineStatusBar;
