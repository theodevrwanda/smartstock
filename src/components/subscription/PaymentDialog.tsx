import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Smartphone, Building2, Copy, CheckCircle2, ChevronRight, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: 'standard' | 'enterprise';
    amount: number;
    onSuccess: () => void;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({ open, onOpenChange, plan, amount, onSuccess }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState<'momo' | 'airtel' | 'bank'>('momo');
    const [businessData, setBusinessData] = useState<any>(null);

    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });

    const [formData, setFormData] = useState({
        senderNumber: '',
        senderName: '',
    });

    const PAYMENT_DETAILS = {
        momo: {
            provider: 'MTN Mobile Money',
            number: '0792734752',
            name: 'Theogene Iradukunda'
        },
        airtel: {
            provider: 'Airtel Money',
            number: '0792734752',
            name: 'Theogene Iradukunda'
        },
        bank: {
            provider: 'Bank of Kigali (BK)',
            number: '100246486087',
            name: 'Theogene Iradukunda'
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('copied_to_clipboard'));
    };

    const fetchBusinessInfo = async (userId: string, email: string) => {
        setLoading(true);
        try {
            const { db } = await import('@/firebase/firebase');
            const { doc, getDoc } = await import('firebase/firestore');

            const userDoc = await getDoc(doc(db, 'users', userId));
            if (!userDoc.exists()) {
                toast.error(t('user_record_not_found'));
                return false;
            }

            const businessId = userDoc.data().businessId;
            if (!businessId) {
                toast.error(t('no_business_linked'));
                return false;
            }

            const businessDoc = await getDoc(doc(db, 'businesses', businessId));
            if (!businessDoc.exists()) {
                toast.error(t('business_details_not_found'));
                return false;
            }

            const business = businessDoc.data();
            setBusinessData({
                id: businessId,
                name: business.businessName,
                email: email,
                subscription: business.subscription
            });
            return true;
        } catch (error: any) {
            console.error('Error fetching business info:', error);
            toast.error(t('failed_fetch_business'));
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && user?.id && !businessData) {
            fetchBusinessInfo(user.id, user.email || '');
        }
        if (!open) {
            setStep(1);
            setBusinessData(user?.businessId ? businessData : null);
        }
    }, [open, user]);

    // State to hold verified user info when main auth is restricted (expired)
    const [verifiedUser, setVerifiedUser] = useState<{ uid: string; email: string; businessId?: string } | null>(null);

    const handleLogin = async () => {
        if (!loginData.email || !loginData.password) {
            toast.error(t('enter_email_password'));
            return;
        }

        setLoading(true);
        try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const { auth } = await import('@/firebase/firebase');

            // Sign in - this might trigger AuthContext logout if expired, but we get the creds first
            const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.password);

            // Store credentials locally for this dialog session
            const uid = userCredential.user.uid;
            const email = loginData.email;

            // Fetch business info manually to verify relationship
            // We pass the UID explicitly because 'user' from context might be null soon
            const success = await fetchBusinessInfo(uid, email);

            if (success) {
                // If fetchBusinessInfo sets businessData, we assume success
                // We also need to keep the UID for the payment step
                setVerifiedUser({ uid, email });
                toast.success(t('account_verified'));
                setStep(3);
            }
        } catch (error: any) {
            console.error('Verification error:', error);
            const message = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
                ? t('invalid_email_password')
                : error.message || t('verification_failed');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
            const { auth } = await import('@/firebase/firebase');

            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);

            const uid = userCredential.user.uid;
            const email = userCredential.user.email || '';

            const success = await fetchBusinessInfo(uid, email);

            if (success) {
                setVerifiedUser({ uid, email });
                toast.success(t('account_verified'));
                setStep(3);
            }
        } catch (error: any) {
            console.error('Google verification error:', error);
            toast.error(error.message || t('google_verification_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        setLoading(true);
        try {
            // Use verifiedUser if available (for expired/logged out users), otherwise fallback to context user
            const userId = verifiedUser?.uid || user?.id;
            const userEmail = verifiedUser?.email || user?.email;

            if (!userId || !businessData) {
                toast.error(t('session_expired_verify'));
                setStep(2); // Go back to verification
                return;
            }

            // Find selected method name - using 'method' state
            const selectedMethodName = method;

            const paymentData = {
                amount: amount,
                businessId: businessData.id,
                businessName: businessData.name,
                createdAt: new Date().toISOString(),
                currency: 'RWF',
                email: userEmail,
                method: selectedMethodName,
                phoneNumber: formData.senderNumber,
                plan: plan,
                status: 'pending',
                type: 'subscription',
                userId: userId,
                // Add explicit flag for manual verification
                isManualVerification: !!verifiedUser
            };

            await addDoc(collection(db, 'payments'), paymentData);

            if (onSuccess) {
                onSuccess();
            }

            // Move to a 'Waiting for Approval' step
            setStep(4);

        } catch (error: any) {
            console.error('Payment error:', error);
            toast.error(t('payment_failed_try_again'));
        } finally {
            setLoading(false);
        }
    };

    const getPaymentDueDate = () => {
        if (!businessData?.subscription?.endDate) return 'N/A';
        const endDate = new Date(businessData.subscription.endDate);
        return endDate.toLocaleDateString(t('locale') === 'rw' ? 'rw-RW' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const isSubscriptionActive = () => {
        if (!businessData?.subscription) return false;
        return new Date(businessData.subscription.endDate) > new Date();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
                {step === 1 ? (
                    <>
                        <DialogHeader className="px-6 pt-6 pb-4">
                            <DialogTitle className="text-2xl font-bold">{t('select_payment_method')}</DialogTitle>
                            <DialogDescription className="text-base">
                                {t('pay_amount_for')} <span className="font-bold text-primary">{amount.toLocaleString()} RWF</span> {t('for_plan')} {t(`plan_${plan}`)}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="px-6 pb-6">
                            <RadioGroup value={method} onValueChange={(v: any) => setMethod(v)} className="grid grid-cols-1 gap-3">
                                <Label
                                    htmlFor="momo"
                                    className="flex items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:border-primary cursor-pointer transition-all [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                                >
                                    <RadioGroupItem value="momo" id="momo" className="sr-only" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                            <Smartphone className="h-5 w-5 text-yellow-600" />
                                        </div>
                                        <span className="font-semibold text-base">{t('mtn_momo')}</span>
                                    </div>
                                </Label>
                                <Label
                                    htmlFor="airtel"
                                    className="flex items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:border-primary cursor-pointer transition-all [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                                >
                                    <RadioGroupItem value="airtel" id="airtel" className="sr-only" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                            <Smartphone className="h-5 w-5 text-red-600" />
                                        </div>
                                        <span className="font-semibold text-base">{t('airtel_money')}</span>
                                    </div>
                                </Label>
                                <Label
                                    htmlFor="bank"
                                    className="flex items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:border-primary cursor-pointer transition-all [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                                >
                                    <RadioGroupItem value="bank" id="bank" className="sr-only" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <span className="font-semibold text-base">{t('bank_transfer_bk')}</span>
                                    </div>
                                </Label>
                            </RadioGroup>
                        </div>
                        <DialogFooter className="px-6 pb-6 pt-2">
                            <Button
                                onClick={() => businessData ? setStep(3) : setStep(2)}
                                className="w-full h-11 text-base font-semibold"
                                disabled={loading && !businessData}
                            >
                                {loading && !businessData ? t('finding_account') : t('continue')} <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        </DialogFooter>
                    </>
                ) : step === 2 ? (
                    <>
                        <DialogHeader className="px-6 pt-6 pb-4">
                            <DialogTitle className="text-2xl font-bold">{t('verify_account_details')}</DialogTitle>
                            <DialogDescription className="text-base">
                                {t('verify_account_desc')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-6 pb-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">{t('email_address')} *</Label>
                                <Input
                                    type="email"
                                    placeholder={t('email_placeholder')}
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">{t('password')} *</Label>
                                <Input
                                    type="password"
                                    placeholder={t('password_placeholder')}
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    className="h-11"
                                />
                            </div>
                        </div>

                        <div className="px-6 pb-6 space-y-3">
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="flex-1 h-11 text-base font-semibold"
                                >
                                    {t('back')}
                                </Button>
                                <Button
                                    onClick={handleLogin}
                                    disabled={loading}
                                    className="flex-1 h-11 text-base font-semibold"
                                >
                                    {loading ? t('verifying') : t('verify_next')}
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full h-11 text-base font-semibold"
                            >
                                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {t('continue_with_google')}
                            </Button>
                        </div>
                    </>
                ) : step === 3 ? (
                    <>
                        <DialogHeader className="px-6 pt-6 pb-4">
                            <DialogTitle className="text-2xl font-bold">
                                {isSubscriptionActive() ? t('account_status') : t('complete_payment')}
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                {isSubscriptionActive()
                                    ? t('account_active_msg')
                                    : t('send_money_desc')}
                            </DialogDescription>
                        </DialogHeader>

                        {businessData?.subscription && (
                            <div className="px-6 pb-4">
                                <div className={`border p-4 rounded-xl ${isSubscriptionActive()
                                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                    : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                                    }`}>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm border-b pb-2 border-primary/10">
                                            <span className="text-muted-foreground">{t('plan')}:</span>
                                            <span className="font-bold capitalize">{t(`plan_${businessData.subscription.plan}`)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-b pb-2 border-primary/10">
                                            <span className="text-muted-foreground">{t('subscription_ends_on')}:</span>
                                            <span className="font-medium">{new Date(businessData.subscription.endDate).toLocaleDateString(t('locale'))}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">{t('days_remaining')}:</span>
                                            <span className="font-bold text-primary">
                                                {Math.ceil((new Date(businessData.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isSubscriptionActive() ? (
                            <div className="px-6 pb-6">
                                <Button
                                    className="w-full h-12 text-lg font-bold"
                                    onClick={() => window.location.href = '/dashboard'}
                                >
                                    {t('continue_to_dashboard')}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 pb-4">
                                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 p-4 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-muted-foreground">{method === 'bank' ? t('account_number') : t('phone_number')}:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-lg">{PAYMENT_DETAILS[method].number}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-primary/10"
                                                    onClick={() => handleCopy(PAYMENT_DETAILS[method].number)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-muted-foreground">{t('recipient')}:</span>
                                            <span className="font-bold text-base">{PAYMENT_DETAILS[method].name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 pb-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">
                                            {method === 'bank' ? t('your_account_placeholder') : t('your_phone_placeholder')}
                                        </Label>
                                        <Input
                                            placeholder={method === 'bank' ? t('your_account_placeholder') : t('your_phone_placeholder')}
                                            value={formData.senderNumber}
                                            onChange={(e) => setFormData({ ...formData, senderNumber: e.target.value })}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t('your_name_label')} *</Label>
                                        <Input
                                            placeholder={t('your_name_placeholder')}
                                            value={formData.senderName}
                                            onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="px-6 pb-6 space-y-3">
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setStep(2)}
                                            className="flex-1 h-11 text-base font-semibold"
                                        >
                                            {t('back')}
                                        </Button>
                                        <Button
                                            onClick={handlePayment}
                                            disabled={loading}
                                            className="flex-1 h-11 text-base font-semibold"
                                        >
                                            {loading ? t('processing') : t('confirm_payment')}
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="w-full h-11 text-primary hover:text-primary hover:bg-primary/10"
                                        asChild
                                    >
                                        <a
                                            href="https://wa.me/250792734752?text=I%20need%20help%20making%20a%20payment"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2"
                                        >
                                            <MessageCircle className="w-5 h-5" /> {t('need_help_whatsapp')}
                                        </a>
                                    </Button>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    // STEP 4: SUCCESS / WAITING APPROVAL
                    <>
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>

                            <div className="space-y-2">
                                <DialogTitle className="text-2xl font-bold text-green-700 dark:text-green-500">
                                    {t('payment_submitted')}
                                </DialogTitle>
                                <DialogDescription className="text-lg max-w-sm mx-auto">
                                    {t('payment_received_msg')}
                                </DialogDescription>
                            </div>

                            <div className="bg-secondary/50 p-6 rounded-xl w-full max-w-sm border-l-4 border-yellow-500 text-left space-y-2">
                                <p className="font-semibold text-foreground flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                    {t('waiting_for_approval')}
                                </p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {t('admin_verification_msg')}
                                </p>
                            </div>

                            <div className="pt-2 w-full max-w-sm">
                                <Button
                                    onClick={() => onOpenChange(false)}
                                    className="w-full h-12 text-lg font-bold"
                                >
                                    {t('close_wait')}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDialog;
