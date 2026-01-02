import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
        setIsStandalone(isInStandaloneMode);

        // Check if iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        // Check if user has dismissed the prompt before
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

        // Show prompt if not installed, not dismissed recently (7 days), and not on first visit
        const shouldShow = !isInStandaloneMode && (!dismissed || daysSinceDismissed > 7);

        if (shouldShow) {
            // Delay showing prompt by 3 seconds to not interrupt user
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        setShowPrompt(false);
    };

    // Don't show if already installed or user is on iOS without prompt support
    if (isStandalone || (!deferredPrompt && !isIOS) || !showPrompt) {
        return null;
    }

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
                >
                    <Card className="bg-white dark:bg-gray-900 border-2 border-primary shadow-2xl p-6">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-start gap-4 mb-4">
                            <div className="bg-primary/10 p-3 rounded-xl">
                                <Download className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg mb-1">Install SmartStock</h3>
                                <p className="text-sm text-muted-foreground">
                                    Get the app experience! Install SmartStock for faster access and offline support.
                                </p>
                            </div>
                        </div>

                        {isIOS ? (
                            <div className="bg-secondary p-4 rounded-lg mb-4">
                                <p className="text-sm font-medium mb-2">To install on iOS:</p>
                                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                    <li>Tap the Share button <span className="inline-block">⎋</span></li>
                                    <li>Scroll down and tap "Add to Home Screen"</li>
                                    <li>Tap "Add" to confirm</li>
                                </ol>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Smartphone className="h-4 w-4" />
                                    <span>Mobile</span>
                                </div>
                                <div className="h-4 w-px bg-border" />
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Monitor className="h-4 w-4" />
                                    <span>Desktop</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {!isIOS && (
                                <Button
                                    onClick={handleInstall}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Install Now
                                </Button>
                            )}
                            <Button
                                onClick={handleDismiss}
                                variant="outline"
                                className={isIOS ? 'flex-1' : ''}
                            >
                                {isIOS ? 'Got it' : 'Maybe Later'}
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PWAInstallPrompt;
