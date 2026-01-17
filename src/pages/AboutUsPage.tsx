import React from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2, Award, Users, Globe, Zap, Shield, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutUsPage: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-background">
            <SEOHelmet
                title="About Us - SmartStock"
                description="Learn more about SmartStock, the leading inventory management solution for Rwandan businesses, created by Theodev Rwanda."
            />

            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                            <img src="/smartstock.png" alt="SmartStock" className="w-6 h-6 invert brightness-0" />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase hidden md:block">SmartStock</span>
                    </Link>
                    <Link to="/" className="text-sm font-bold flex items-center gap-1 hover:text-primary transition-colors hidden md:flex">
                        <ChevronLeft size={16} /> Back to Home
                    </Link>
                </div>
            </nav>

            <div className="container mx-auto px-6 py-20 mt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-4xl mx-auto text-center mb-16"
                >
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">Empowering Rwandan Businesses with <span className="text-primary">SmartStock</span></h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        SmartStock is a modern, intuitive, and powerful inventory management solution meticulously crafted to meet the unique needs of businesses in Rwanda and across Africa.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                    {[
                        { icon: Globe, title: "Local Focus", desc: "Designed specifically for the Rwandan market with language support for Kinyarwanda and English." },
                        { icon: Zap, title: "Efficiency", desc: "Streamline your operations with real-time tracking, automated reports, and multi-branch management." },
                        { icon: Shield, title: "Reliability", desc: "Secure data storage and offline capabilities ensure your business never stops running." },
                        { icon: Users, title: "Community Driven", desc: "Built based on feedback from local shop owners and large enterprises alike." },
                        { icon: Award, title: "Professional Support", desc: "Backed by dedicated technical support and continuous system improvements." },
                        { icon: Building2, title: "Scalable Solution", desc: "From small retail shops to large multi-branch corporations, SmartStock grows with you." }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="p-8 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                                <feature.icon className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="bg-secondary/30 rounded-3xl p-10 md:p-16 text-center border border-border"
                >
                    <h2 className="text-3xl font-bold mb-6">The Story Behind SmartStock</h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
                        Created by <strong>Theodev Rwanda</strong>, SmartStock was born out of a passion to bridge the digital gap in inventory management. We noticed many businesses still relied on manual records, leading to errors and losses. Our mission is to provide every business owner with the tools they need to thrive in a digital economy.
                    </p>
                    <div className="flex justify-center gap-4">
                        <div className="bg-background px-6 py-3 rounded-full border border-border font-medium shadow-sm">
                            Created with ❤️ in Rwanda 🇷🇼
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AboutUsPage;
