// src/components/PWAInstallButton.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, ExternalLink, Check } from 'lucide-react';
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
  const { isInstallable, isInstalled, isIOS, install, openInApp } = usePWAInstall();

  const handleInstall = async () => {
    if (isIOS) {
      toast.info(
        'To install: Tap Share button, then "Add to Home Screen"',
        { duration: 5000 }
      );
      return;
    }

    const success = await install();
    if (success) {
      toast.success('App installed successfully! You can now use PixelMart as a native app.');
    }
  };

  const handleOpenInApp = () => {
    toast.success('Redirecting to installed app...');
    openInApp();
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

  // Can install (Android/Desktop Chrome)
  if (isInstallable) {
    return (
      <Button
        variant={variant}
        onClick={handleInstall}
        className={`w-full gap-2 ${className}`}
      >
        <Download className="h-4 w-4" />
        Install App
        <Smartphone className="h-4 w-4" />
      </Button>
    );
  }

  // iOS - show instructions
  if (isIOS) {
    return (
      <Button
        variant={variant}
        onClick={handleInstall}
        className={`w-full gap-2 ${className}`}
      >
        <Smartphone className="h-4 w-4" />
        Add to Home Screen
      </Button>
    );
  }

  // Not installable (already installed via different method or not supported)
  return null;
};

export default PWAInstallButton;
