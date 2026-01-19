import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ShieldCheck, Star } from 'lucide-react';
import PaymentDialog from '@/components/subscription/PaymentDialog';
import SEOHelmet from '@/components/SEOHelmet';

const UpgradePage = () => {
    const { user } = useAuth();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'free' | 'monthly' | 'annually' | 'forever'>('monthly');
    const [amount, setAmount] = useState(0);

    const handleSelectPlan = (plan: 'monthly' | 'annually' | 'forever', price: number) => {
        setSelectedPlan(plan);
        setAmount(price);
        setPaymentOpen(true);
    };

    return (
        <>
            <SEOHelmet title="Upgrade Plan" />
            <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Scale your business with the right SmartStock plan.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Monthly Plan */}
                        <Card className="border shadow-md">
                            <CardHeader>
                                <CardTitle className="text-2xl">Monthly Plan</CardTitle>
                                <CardDescription>Flexible month-to-month access</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">10,000</span>
                                    <span className="text-xl font-medium text-gray-500">RWF</span>
                                    <span className="text-gray-500">/month</span>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Full Access to Dashboard</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Unlimited Products</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Sales Reports</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> 24/7 Support</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full" size="lg" onClick={() => handleSelectPlan('monthly', 10000)}>
                                    Select Monthly
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Annually Plan */}
                        <Card className="border-2 border-primary shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
                            <CardHeader>
                                <CardTitle className="text-2xl">Annually Plan</CardTitle>
                                <CardDescription>Best for stable businesses</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">90,000</span>
                                    <span className="text-xl font-medium text-gray-500">RWF</span>
                                    <span className="text-gray-500">/year</span>
                                </div>
                                <p className="text-sm font-semibold text-primary">Save 25% (3 months free!)</p>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> All Monthly Features</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Priority Support</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Advanced Analytics</li>
                                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Advanced Monitoring</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" size="lg" onClick={() => handleSelectPlan('annually', 90000)}>
                                    Select Annually
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Forever Plan */}
                        <Card className="border shadow-md">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">Forever Plan <Star className="h-5 w-5 fill-amber-400 text-amber-400" /></CardTitle>
                                <CardDescription>Lifetime license</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">500,000</span>
                                    <span className="text-xl font-medium text-gray-500">RWF</span>
                                    <span className="text-gray-500">/Once</span>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /> Lifetime Access</li>
                                    <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /> Everything Unlocked</li>
                                    <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /> No Monthly Retainers</li>
                                    <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /> Premium VIP Support</li>
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full" size="lg" onClick={() => handleSelectPlan('forever', 500000)}>
                                    Select Forever
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>

            <PaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                plan={selectedPlan}
                amount={amount}
                onSuccess={() => {
                    // Can redirect or show success message
                }}
            />
        </>
    );
};

export default UpgradePage;
