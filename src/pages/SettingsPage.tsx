import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Package, Settings, Save, AlertTriangle, XCircle, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOffline } from '@/contexts/OfflineContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';
import SEOHelmet from '@/components/SEOHelmet';

interface BusinessSettings {
    businessName: string;
    lowStockThreshold: number;
    outOfStockThreshold: number;
}

const SettingsPage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { t } = useLanguage();
    const { isOnline, addPendingOperation } = useOffline();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<BusinessSettings>({
        businessName: '',
        lowStockThreshold: 10,
        outOfStockThreshold: 0,
    });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (user?.businessId) {
            const fetchBusiness = async () => {
                setLoading(true);
                try {
                    const bizRef = doc(db, 'businesses', user.businessId!);
                    const bizSnap = await getDoc(bizRef);
                    if (bizSnap.exists()) {
                        const data = bizSnap.data();
                        setFormData({
                            businessName: data.businessName || user.businessName || '',
                            lowStockThreshold: data.lowStockThreshold ?? 10,
                            outOfStockThreshold: data.outOfStockThreshold ?? 0,
                        });
                    }
                } catch (error) {
                    console.error("Error fetching business settings:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchBusiness();
        }
    }, [user?.businessId, user?.businessName]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('Threshold') ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        if (!user?.businessId || !isAdmin) return;

        setSaving(true);
        try {
            const bizRef = doc(db, 'businesses', user.businessId);
            const updates = {
                businessName: formData.businessName,
                lowStockThreshold: formData.lowStockThreshold,
                outOfStockThreshold: formData.outOfStockThreshold,
                updatedAt: new Date().toISOString(),
            };

            if (isOnline) {
                await updateDoc(bizRef, updates);
                toast.success(t('settings_updated_success') || 'Settings updated successfully');
            } else {
                await addPendingOperation({
                    type: 'updateBusiness',
                    data: {
                        id: user.businessId,
                        updates: updates
                    }
                });
                toast.info(t('saved_locally_offline') || 'Saved locally (offline)');
            }

            // Update local auth context
            updateUser({
                businessName: formData.businessName,
                stockSettings: {
                    lowStock: formData.lowStockThreshold,
                    outOfStock: formData.outOfStockThreshold
                }
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error(t('error_saving_settings') || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <h1 className="text-2xl font-bold">{t('access_denied')}</h1>
                <p className="text-muted-foreground">{t('admin_only_settings') || 'Only administrators can access business settings.'}</p>
            </div>
        );
    }

    return (
        <>
            <SEOHelmet title={t('settings_label') || 'Settings'} description="Manage your business and stock levels" />
            <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                            <Settings className="h-8 w-8 text-indigo-600" />
                            {t('settings_label') || 'Settings'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Configure your business preferences and stock management rules.
                        </p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02]"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('saving')}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                {t('save_changes')}
                            </span>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Business Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white/70 dark:bg-[#242526] backdrop-blur-sm">
                            <CardHeader className="border-b dark:border-gray-800 pb-4">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-indigo-500" />
                                    {t('business_info')}
                                </CardTitle>
                                <CardDescription>Basic information about your business.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="businessName" className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            {t('business_name')}
                                        </Label>
                                        <Input
                                            id="businessName"
                                            name="businessName"
                                            value={formData.businessName}
                                            onChange={handleInputChange}
                                            placeholder="Your Business Name"
                                            className="h-12 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-lg font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stock Levels Configuration */}
                        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white/70 dark:bg-[#242526] backdrop-blur-sm border-l-4 border-l-indigo-500">
                            <CardHeader className="border-b dark:border-gray-800 pb-4">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <Package className="h-5 w-5 text-indigo-500" />
                                    {t('stock_management')}
                                </CardTitle>
                                <CardDescription>Set the thresholds for stock status alerts.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Low Stock */}
                                    <div className="space-y-4 p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">
                                                {t('low_stock_threshold')}
                                            </Label>
                                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <Input
                                                type="number"
                                                name="lowStockThreshold"
                                                value={formData.lowStockThreshold}
                                                onChange={handleInputChange}
                                                className="h-14 text-2xl font-bold bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-500 focus:ring-amber-500 text-center"
                                                min="0"
                                            />
                                            <span className="text-sm font-bold text-amber-600 dark:text-amber-500 mb-4">{t('units')}</span>
                                        </div>
                                        <p className="text-[11px] text-amber-800/60 dark:text-amber-400/60 italic leading-relaxed">
                                            {t('low_stock_desc') || 'Products with quantities equal to or below this value will trigger a "Low Stock" warning.'}
                                        </p>
                                    </div>

                                    {/* Out of Stock */}
                                    <div className="space-y-4 p-5 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-black uppercase tracking-widest text-rose-700 dark:text-rose-500">
                                                {t('out_of_stock_threshold')}
                                            </Label>
                                            <XCircle className="h-5 w-5 text-rose-500" />
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <Input
                                                type="number"
                                                name="outOfStockThreshold"
                                                value={formData.outOfStockThreshold}
                                                onChange={handleInputChange}
                                                className="h-14 text-2xl font-bold bg-white dark:bg-gray-900 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-500 focus:ring-rose-500 text-center"
                                                min="0"
                                            />
                                            <span className="text-sm font-bold text-rose-600 dark:text-rose-500 mb-4">{t('units')}</span>
                                        </div>
                                        <p className="text-[11px] text-rose-800/60 dark:text-rose-400/60 italic leading-relaxed">
                                            {t('out_of_stock_desc') || 'Products with quantities equal to or below this value will be marked as "Out of Stock".'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tips Sidebar */}
                    <div className="space-y-6">
                        <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200 dark:shadow-none overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Smart Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-indigo-50/90 leading-relaxed">
                                <p>
                                    Your stock levels apply business-wide and help you monitor inventory health across all branches.
                                </p>
                                <div className="pt-2">
                                    <div className="flex gap-2 items-start mb-3">
                                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">✓</div>
                                        <p>Low stock items pulse in orange on your dashboard.</p>
                                    </div>
                                    <div className="flex gap-2 items-start">
                                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">✓</div>
                                        <p>Out of stock items turn red and require immediate replenishment.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                <Save size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold dark:text-white">Auto-Sync Enabled</p>
                                <p className="text-[11px] text-muted-foreground">Changes applied here are instantly distributed to all branch staff.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;
