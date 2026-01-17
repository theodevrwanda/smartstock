import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, CheckCircle, AlertTriangle, LogOut, RefreshCcw } from 'lucide-react';
import PaymentDialog from '@/components/subscription/PaymentDialog';
import SEOHelmet from '@/components/SEOHelmet';
import { formatDate } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const BusinessStatusPage = () => {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Default to Standard plan pricing for renewal if not specified
    // In a real app, this might come from the user's current plan or a selection
    const planToPay = user?.subscription?.plan === 'enterprise' ? 'enterprise' : 'standard';
    const amountToPay = planToPay === 'enterprise' ? 500000 : 10000;

    const isExpired = user?.subscription ? new Date(user.subscription.endDate) < new Date() : false;
    const daysRemaining = user?.subscription
        ? Math.ceil((new Date(user.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const handleContinueToDashboard = () => {
        navigate('/dashboard');
    };

    const handlePaymentSuccess = () => {
        setShowSuccess(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
            <SEOHelmet title="Business Status" />

            <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{user?.businessName || 'Business Name'}</CardTitle>
                    <CardDescription className="text-lg">Business & Subscription Details</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Business Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-secondary/50 rounded-xl space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Owner</p>
                            <p className="font-semibold text-foreground">{user?.fullName}</p>
                        </div>
                        <div className="p-4 bg-secondary/50 rounded-xl space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="font-semibold text-foreground">{user?.email}</p>
                        </div>
                        <div className="p-4 bg-secondary/50 rounded-xl space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold capitalize">{user?.subscription?.plan || 'Free'}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/50 rounded-xl space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <div>
                                {isExpired ? (
                                    <Badge variant="destructive" className="font-bold">Expired</Badge>
                                ) : (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 font-bold">Active</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expiry Warning / Info */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">Subscription Period</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                {user?.subscription?.startDate && user?.subscription?.endDate ? (
                                    <>
                                        {formatDate(new Date(user.subscription.startDate))} - {formatDate(new Date(user.subscription.endDate))}
                                    </>
                                ) : 'N/A'}
                            </p>
                            {!isExpired && (
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                    {daysRemaining} days remaining
                                </p>
                            )}
                        </div>
                    </div>

                    {showSuccess && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-800 dark:text-green-300 font-bold">Payment Submitted Successfully</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-400">
                                Your payment has been recorded. Please wait for the admin to verify your payment.
                                You will be notified once your subscription is active.
                            </AlertDescription>
                        </Alert>
                    )}

                    {isExpired && !showSuccess && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Subscription Expired</AlertTitle>
                            <AlertDescription>
                                Your subscription has expired. You cannot access the dashboard until you renew your plan.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-2">
                    <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>

                    <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row">
                        {showSuccess ? (
                            <Button onClick={refreshUser} className="w-full sm:w-auto gap-2">
                                <RefreshCcw className="h-4 w-4" /> Refresh Status
                            </Button>
                        ) : isExpired ? (
                            <Button
                                onClick={() => setPaymentOpen(true)}
                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 font-bold"
                            >
                                Continue for Payment
                            </Button>
                        ) : (
                            <Button
                                onClick={handleContinueToDashboard}
                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 font-bold"
                            >
                                Continue to Dashboard
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>

            <PaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                plan={planToPay}
                amount={amountToPay}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
};

export default BusinessStatusPage;
