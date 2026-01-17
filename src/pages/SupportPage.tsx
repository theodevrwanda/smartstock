import React from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Coffee, CreditCard, Landmark, Smartphone, Heart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SupportPage: React.FC = () => {
    const { t } = useLanguage();

    const handleBuyCoffee = () => {
        window.open('https://buymeacoffee.com/theodevrwanda', '_blank');
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <SEOHelmet
                title="Support Us - SmartStock"
                description="Support the development of SmartStock. Buy us a coffee or use local Rwandan payment methods to contribute."
            />

            <div className="container mx-auto px-6 py-20 mt-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="flex justify-center mb-8"
                >
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-500 rounded-full blur opacity-40 animate-pulse" />
                        <img
                            src="/partners/theodev.png"
                            alt="Theogene Iradukunda"
                            className="w-32 h-32 rounded-full border-4 border-background shadow-2xl relative z-10"
                        />
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-4xl mx-auto text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-full mb-6 font-bold text-sm">
                        <Heart className="h-4 w-4 fill-current" />
                        Support the Creator
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">Keep <span className="text-primary">SmartStock</span> Growing</h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        SmartStock is built with passion and dedication. Your support helps us maintain the servers, add new features, and keep the system free for small businesses.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Buy Me A Coffee Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="h-full border-none shadow-xl bg-amber-50 dark:bg-amber-950/20 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Coffee size={120} className="text-amber-600" />
                            </div>
                            <CardHeader className="pb-4">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4">
                                    <Coffee className="h-8 w-8 text-amber-600" />
                                </div>
                                <CardTitle className="text-2xl font-black">Buy Me a Coffee</CardTitle>
                                <CardDescription className="text-amber-800/70 dark:text-amber-200/50">A quick and easy way to show your appreciation.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="text-sm font-medium leading-relaxed">
                                    Support the developer globally. Every coffee helps in fuels the late-night coding sessions that make SmartStock great.
                                </p>
                                <Button
                                    onClick={handleBuyCoffee}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-14 rounded-xl text-lg gap-2"
                                >
                                    Proceed to Buy Me a Coffee <ExternalLink size={20} />
                                </Button>
                                <div className="pt-4 flex justify-center">
                                    <img
                                        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                                        alt="Buy Me A Coffee"
                                        className="h-10 cursor-pointer"
                                        onClick={handleBuyCoffee}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Local Banking Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="h-full border-none shadow-xl bg-blue-50 dark:bg-blue-950/20 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Landmark size={120} className="text-blue-600" />
                            </div>
                            <CardHeader className="pb-4">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
                                    <Landmark className="h-8 w-8 text-blue-600" />
                                </div>
                                <CardTitle className="text-2xl font-black">Bank Transfer (BK)</CardTitle>
                                <CardDescription className="text-blue-800/70 dark:text-blue-200/50">For supporters within Rwanda.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-blue-100 dark:border-blue-900">
                                        <p className="text-xs uppercase font-bold text-blue-500 mb-1 tracking-widest">Bank Name</p>
                                        <p className="font-black text-lg">Bank of Kigali (BK)</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-blue-100 dark:border-blue-900">
                                        <p className="text-xs uppercase font-bold text-blue-500 mb-1 tracking-widest">Account Number</p>
                                        <div className="flex justify-between items-center text-xl font-black">
                                            100246486087
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigator.clipboard.writeText('100246486087')}>
                                                <CreditCard size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-blue-100 dark:border-blue-900">
                                        <p className="text-xs uppercase font-bold text-blue-500 mb-1 tracking-widest">MoMo Support</p>
                                        <p className="font-black text-lg">0792734752</p>
                                    </div>
                                </div>
                                <p className="text-[10px] uppercase font-bold text-center opacity-60">
                                    Recipient Name: Theogene iradukunda
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-20 max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-2xl font-bold mb-4">Why Support Us?</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Every contribution goes directly into improving the SmartStock core. We are a small team dedicated to building high-quality software for everyone. Your support validates our hard work and allows us to spend more time building features you love.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default SupportPage;
