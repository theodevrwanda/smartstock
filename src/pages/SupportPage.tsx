import React from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Coffee, CreditCard, Landmark, Smartphone, Heart, ExternalLink, MessageCircle, Globe } from 'lucide-react';
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
                {/* Hero Section with Image */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative group w-full mb-20"
                >
                    <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-blue-500/10 blur-3xl opacity-50" />
                    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-border bg-card aspect-[16/8] md:aspect-[21/7]">
                        <img
                            src="/letbusinessgodigital.png"
                            alt="Let Business Go Digital"
                            className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-16">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                            >
                                <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-1.5 rounded-full mb-6 font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">
                                    <Heart className="h-3.5 w-3.5 fill-current" />
                                    Support the Vision
                                </div>
                                <h1 className="text-white text-4xl md:text-6xl font-black mb-6 tracking-tight uppercase">Let Business Go Digital</h1>
                                <p className="text-white/80 text-lg md:text-xl max-w-3xl font-medium leading-relaxed">
                                    SmartStock is built with passion to empower Rwandan SMBs. Your contribution helps us keep the platform free, fast, and feature-rich for everyone.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
                    {/* Support Cards Side */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Buy Me A Coffee Card */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                            >
                                <Card className="h-full border-none shadow-xl bg-amber-50 dark:bg-amber-950/20 overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                        <Coffee size={120} className="text-amber-600" />
                                    </div>
                                    <CardHeader className="pb-4">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4 text-amber-600">
                                            <Coffee className="h-8 w-8" />
                                        </div>
                                        <CardTitle className="text-2xl font-black">Buy Me a Coffee</CardTitle>
                                        <CardDescription className="text-amber-800/70 dark:text-amber-200/50">Global support for the developer.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <p className="text-sm font-medium leading-relaxed">
                                            A quick way to show your appreciation from anywhere in the world. Every coffee fuels more features.
                                        </p>
                                        <Button
                                            onClick={handleBuyCoffee}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-14 rounded-xl text-lg gap-2"
                                        >
                                            Donate Now <ExternalLink size={20} />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Local Banking Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                            >
                                <Card className="h-full border-none shadow-xl bg-blue-50 dark:bg-blue-950/20 overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                        <Landmark size={120} className="text-blue-600" />
                                    </div>
                                    <CardHeader className="pb-4">
                                        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 text-blue-600">
                                            <Landmark className="h-8 w-8" />
                                        </div>
                                        <CardTitle className="text-2xl font-black">Bank & MoMo</CardTitle>
                                        <CardDescription className="text-blue-800/70 dark:text-blue-200/50">For supporters within Rwanda.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-blue-100 dark:border-blue-900">
                                                <p className="text-[10px] uppercase font-bold text-blue-500 opacity-70 tracking-widest">Bank of Kigali</p>
                                                <div className="flex justify-between items-center text-lg font-black">
                                                    100246486087
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard.writeText('100246486087')}>
                                                        <CreditCard size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-blue-100 dark:border-blue-900">
                                                <p className="text-[10px] uppercase font-bold text-blue-500 opacity-70 tracking-widest">MTN Mobile Money</p>
                                                <p className="font-black text-lg">0792734752</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] uppercase font-bold text-center opacity-60">
                                            Recipient: Theogene iradukunda
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="p-8 rounded-[2rem] bg-secondary/30 border border-border"
                        >
                            <h2 className="text-2xl font-bold mb-4">Why Support SmartStock?</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Maintaining an enterprise-grade system requires significant resources for hosting, security, and continuous updates. Your contributions directly support the infrastructure that keeps businesses running smoothly. As a small team, we appreciate every act of support that helps us build a more digital future for Rwanda.
                            </p>
                        </motion.div>
                    </div>

                    {/* Creator Side */}
                    <div className="lg:col-span-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                            className="sticky top-24"
                        >
                            <Card className="border-none shadow-2xl bg-gradient-to-b from-primary/5 to-transparent overflow-hidden rounded-[2.5rem]">
                                <CardContent className="p-8 text-center">
                                    <div className="relative w-32 h-32 mx-auto mb-6">
                                        <img
                                            src="/partners/theodev.png"
                                            alt="Theogene Iradukunda"
                                            className="w-full h-full rounded-full border-4 border-background shadow-md relative z-10"
                                        />
                                    </div>
                                    <h3 className="text-2xl font-black mb-1">Theogene iradukunda</h3>
                                    <p className="text-primary font-bold text-sm mb-6 tracking-widest uppercase">Lead Developer</p>
                                    <div className="space-y-4 text-left p-4 bg-background/50 rounded-2xl border border-border">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="h-4 w-4 text-primary" />
                                            <p className="text-xs font-medium">+250 792 734 752</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Globe className="h-4 w-4 text-primary" />
                                            <p className="text-xs font-medium">Kigali, Rwanda</p>
                                        </div>
                                    </div>
                                    <div className="mt-8">
                                        <Button
                                            onClick={() => window.open('https://wa.me/250792734752', '_blank')}
                                            className="w-full py-6 rounded-2xl font-bold gap-2 text-md"
                                        >
                                            <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportPage;
