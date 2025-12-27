// src/components/PWAInstallButton.tsx
// This component now only shows when app is installed - uses browser's native install popup
import React from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, ExternalLink, Check } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'outline'
}) => {
  const { isInstalled, isIOS, openInApp } = usePWAInstall();

  const handleOpenInApp = () => {
    toast.success('Opening app...');
    openInApp();
  };

  const handleIOSInstall = () => {
    toast.info(
      'To install: Tap the Share button at the bottom of Safari, then tap "Add to Home Screen"',
      { duration: 6000 }
    );
  };

  // Already installed - show "Open in App" button
  if (isInstalled) {
    return (
      <Button
        variant={variant}
        onClick={handleOpenInApp}
        className={`w-full gap-2 ${className}`}
      >
        <Check className="h-4 w-4" />
        Open in App
        <ExternalLink className="h-4 w-4" />
      </Button>
    );
  }

  // iOS - show instructions only (no download button)
  if (isIOS) {
    return (
      <Button
        variant={variant}
        onClick={handleIOSInstall}
        className={`w-full gap-2 ${className}`}
      >
        <Smartphone className="h-4 w-4" />
        Add to Home Screen
      </Button>
    );
  }

  // For other browsers, the native install popup handles it - no button needed
  // Browser will show its own install prompt when criteria are met
  return null;
};

export default PWAInstallButton;
