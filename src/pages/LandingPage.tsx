import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Users, BarChart3, Shield, Zap, Globe, Check, ArrowRight, Sun, Moon, MessageCircle, Menu, X, TrendingUp, Building2, Award, Languages } from 'lucide-react';
import SEOHelmet from '@/components/SEOHelmet';
import { motion, useMotionValue, useTransform, animate, useScroll, useSpring } from 'framer-motion';
import { mockPlans } from '@/data/mockPlans';
import { useTheme } from '@/contexts/ThemeContext';
import ChatWidget from '@/components/ChatWidget';
import SupportedBy from '@/components/SupportedBy';
import PaymentDialog from '@/components/subscription/PaymentDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const testimonialImages = [
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop', // Extra one for safety or just keep 
];

// Animated Counter Component
const AnimatedCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const [displayValue, setDisplayValue] = useState('0');

    useEffect(() => {
        const controls = animate(count, target, { duration: 2.5, ease: "easeOut" });
        const unsubscribe = rounded.on('change', (latest) => {
            setDisplayValue(latest.toLocaleString() + suffix);
        });
        return () => {
            controls.stop();
            unsubscribe();
        };
    }, [target, suffix, count, rounded]);

    return <span>{displayValue}</span>;
};

const LandingPage = () => {
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { language, setLanguage, t } = useLanguage();

    const stats = [
        { icon: Users, label: t('stat_happy_clients'), value: 2500, suffix: '+' },
        { icon: Building2, label: t('stat_business_accounts'), value: 500, suffix: '+' },
        { icon: Award, label: t('stat_trusted_customers'), value: 1200, suffix: '+' },
        { icon: TrendingUp, label: t('stat_success_rate'), value: 98, suffix: '%' },
    ];

    const features = [
        {
            icon: Package,
            title: t('feature_inventory_title'),
            description: t('feature_inventory_desc')
        },
        {
            icon: Users,
            title: t('feature_branch_title'),
            description: t('feature_branch_desc')
        },
        {
            icon: BarChart3,
            title: t('feature_reports_title'),
            description: t('feature_reports_desc')
        },
        {
            icon: Zap,
            title: t('feature_alerts_title'),
            description: t('feature_alerts_desc')
        },
        {
            icon: Shield,
            title: t('feature_security_title'),
            description: t('feature_security_desc')
        },
        {
            icon: Globe,
            title: t('feature_backup_title'),
            description: t('feature_backup_desc')
        },
    ];

    const services = [
        {
            title: t('service_tracking_title'),
            description: t('service_tracking_desc'),
            icon: Package,
        },
        {
            title: t('service_multi_branch_title'),
            description: t('service_multi_branch_desc'),
            icon: Globe,
        },
        {
            title: t('service_analytics_title'),
            description: t('service_analytics_desc'),
            icon: BarChart3,
        },
        {
            title: t('service_collaboration_title'),
            description: t('service_collaboration_desc'),
            icon: Users,
        },
    ];
    // removed duplicate useAuth
    const navigate = useNavigate();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Payment Dialog State
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'standard' | 'enterprise'>('standard');
    const [planAmount, setPlanAmount] = useState(0);

    const handlePlanSelect = (planName: string, amount: number) => {
        const type = planName.toLowerCase().includes('enterprise') ? 'enterprise' : 'standard';
        setSelectedPlan(type);
        setPlanAmount(amount);
        setPaymentOpen(true);
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated && !paymentOpen) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, paymentOpen]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
    };

    const translatedPlans = mockPlans.map(plan => {
        let name = plan.name;
        let description = plan.description;

        if (plan._id === '1') { name = t('plan_free_name'); description = t('plan_free_desc'); }
        else if (plan._id === '2') { name = t('plan_standard_monthly_name'); description = t('plan_standard_monthly_desc'); }
        else if (plan._id === '3') { name = t('plan_standard_yearly_name'); description = t('plan_standard_yearly_desc'); }
        else if (plan._id === '4') { name = t('plan_enterprise_name'); description = t('plan_enterprise_desc'); }

        const features = [
            t('feature_all_unlocked'),
            t('feature_unlimited_products'),
            t('feature_unlimited_employees'),
            t('feature_multi_branch'),
            t('feature_advanced_reports'),
            t('feature_returns'),
            t('feature_monitoring'),
            t('feature_support')
        ];

        return { ...plan, name, description, features };
    });

    return (
        <>
            <SEOHelmet
                title="SmartStock - Modern Inventory Management for Rwanda"
                description="Streamline your inventory with SmartStock, the leading management solution for Rwandan businesses."
            />

            <div className="min-h-screen bg-background">
                {/* Navigation */}
                <motion.nav
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50"
                >
                    {/* Scroll Progress Bar */}
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 h-1 bg-primary origin-left z-50"
                        style={{ scaleX }}
                    />
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img src="/smartstock.png" alt="SmartStock" className="h-10 w-auto object-contain" />
                                <span className="text-2xl font-bold text-foreground">SmartStock</span>
                            </div>

                            {/* Desktop Navigation */}
                            <div className="hidden md:flex items-center gap-8">
                                <button onClick={() => scrollToSection('features')} className="text-foreground hover:text-primary transition-colors">
                                    {t('nav_features')}
                                </button>
                                <button onClick={() => scrollToSection('services')} className="text-foreground hover:text-primary transition-colors">
                                    {t('nav_services')}
                                </button>
                                <button onClick={() => scrollToSection('pricing')} className="text-foreground hover:text-primary transition-colors">
                                    {t('nav_pricing')}
                                </button>
                                <button onClick={() => scrollToSection('testimonials')} className="text-foreground hover:text-primary transition-colors">
                                    {t('nav_testimonials')}
                                </button>
                                <button onClick={() => scrollToSection('partners')} className="text-foreground hover:text-primary transition-colors">
                                    {t('nav_partners')}
                                </button>

                                <div className="h-6 w-px bg-border mx-2" />

                                <button
                                    onClick={toggleTheme}
                                    className="p-2 text-foreground hover:text-primary transition-colors"
                                    aria-label="Toggle theme"
                                >
                                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </button>

                                <Link to="/login">
                                    <Button variant="ghost">{t('nav_login')}</Button>
                                </Link>
                                <Link to="/register">
                                    <Button className="gradient-primary">{t('nav_get_started')}</Button>
                                </Link>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <Languages size={20} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>{t('switch_language')}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
                                            English
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setLanguage('rw')} className={language === 'rw' ? 'bg-accent' : ''}>
                                            Kinyarwanda
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
                                aria-label="Toggle menu"
                            >
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                            height: isMobileMenuOpen ? 'auto' : 0,
                            opacity: isMobileMenuOpen ? 1 : 0
                        }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden overflow-hidden bg-background/95 backdrop-blur-lg border-t border-border"
                    >
                        <div className="container mx-auto px-6 py-4 space-y-4">
                            <button
                                onClick={() => scrollToSection('features')}
                                className="block w-full text-left py-2 text-foreground hover:text-primary transition-colors"
                            >
                                {t('nav_features')}
                            </button>
                            <button
                                onClick={() => scrollToSection('services')}
                                className="block w-full text-left py-2 text-foreground hover:text-primary transition-colors"
                            >
                                {t('nav_services')}
                            </button>
                            <button
                                onClick={() => scrollToSection('pricing')}
                                className="block w-full text-left py-2 text-foreground hover:text-primary transition-colors"
                            >
                                {t('nav_pricing')}
                            </button>
                            <Link to="/login" className="block">
                                <Button variant="ghost" className="w-full justify-start">{t('nav_login')}</Button>
                            </Link>
                            <Link to="/register" className="block">
                                <Button className="gradient-primary w-full">{t('nav_get_started')}</Button>
                            </Link>

                            <div className="pt-4 border-t border-border flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">{t('switch_language')}</span>
                                <div className="flex gap-2">
                                    <Button
                                        variant={language === 'en' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setLanguage('en')}
                                    >
                                        EN
                                    </Button>
                                    <Button
                                        variant={language === 'rw' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setLanguage('rw')}
                                    >
                                        RW
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.nav>

                {/* Hero Section */}
                <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background z-0" />

                    <div className="container mx-auto px-6 relative z-20">
                        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
                            {/* Left Content */}
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                className="text-left"
                            >
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-foreground">
                                    {t('hero_title_1')}{' '}
                                    <span className="text-primary">{t('hero_title_highlight')}</span>
                                </h1>
                                <p className="text-lg md:text-xl mb-8 text-muted-foreground max-w-2xl">
                                    {t('hero_subtitle')}
                                </p>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="flex flex-wrap gap-4 mb-8"
                                >
                                    <Link to="/register">
                                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-full">
                                            {t('hero_cta_primary')}
                                        </Button>
                                    </Link>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="text-lg px-8 py-6 rounded-full"
                                        onClick={() => scrollToSection('features')}
                                    >
                                        {t('hero_cta_secondary')}
                                    </Button>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1, delay: 0.4 }}
                                    className="flex flex-wrap gap-6 text-sm text-muted-foreground"
                                >
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary" />
                                        <span>{t('hero_feature_1')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary" />
                                        <span>{t('hero_feature_2')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        <span>{t('hero_feature_3')}</span>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                    className="mt-8 flex items-center gap-4"
                                >
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span key={star} className="text-blue-500 text-xl">★</span>
                                        ))}
                                    </div>
                                    <span className="text-sm font-medium">{t('hero_rating')}</span>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, rotate: -5 }}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    transition={{ duration: 0.8, delay: 0.8 }}
                                    className="mt-4 inline-block"
                                >
                                    <div className="relative">
                                        <span className="text-sm font-handwriting italic">{t('hero_no_card')}</span>
                                        <svg className="absolute -right-12 -top-2 w-16 h-16" viewBox="0 0 100 100">
                                            <path d="M 20 50 Q 40 20, 80 50" stroke="currentColor" fill="none" strokeWidth="2" />
                                        </svg>
                                    </div>
                                </motion.div>
                            </motion.div>

                            {/* Right Content - Dashboard Preview */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: 50 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                transition={{ duration: 1, delay: 0.3 }}
                                className="relative hidden lg:block"
                            >
                                <div className="relative group">
                                    {/* Glassmorphism Background Glow */}
                                    <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 to-purple-500/30 blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />

                                    {/* Main Image Container */}
                                    <motion.div
                                        whileHover={{ rotateY: -10, rotateX: 5, scale: 1.02 }}
                                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                        className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl backdrop-blur-sm bg-white/5"
                                        style={{ perspective: '1000px' }}
                                    >
                                        <img
                                            src="/dashboard-preview.png"
                                            alt="SmartStock Dashboard Preview"
                                            className="w-full h-auto object-cover transform transition-transform"
                                        />

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                                    </motion.div>

                                    {/* Floating Badge */}
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute -bottom-6 -left-6 bg-background/80 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl z-20"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                                <TrendingUp className="h-5 w-5 text-green-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium">{t('hero_daily_sales')}</p>
                                                <p className="text-lg font-bold text-foreground">+24.5%</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-20 bg-background border-y border-border">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="text-center group"
                                >
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <stat.icon className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                                        <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                    </div>
                                    <p className="text-muted-foreground font-medium">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20 bg-secondary/30">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                                {t('features_title')}
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('features_subtitle')}
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    whileHover={{ y: -10, transition: { duration: 0.2 } }}
                                    className="group p-8 bg-card rounded-2xl shadow-card hover:shadow-hover transition-all duration-300"
                                >
                                    <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <feature.icon className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services" className="py-20 bg-background">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                                {t('services_title')}
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('services_subtitle')}
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {services.map((service, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                                    className="relative p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 overflow-hidden group"
                                >
                                    <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10">
                                        <service.icon className="h-10 w-10 text-primary group-hover:text-white mb-4 transition-colors duration-300" />
                                        <h3 className="text-lg font-semibold text-foreground group-hover:text-white mb-2 transition-colors duration-300">
                                            {service.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground group-hover:text-white/90 transition-colors duration-300">
                                            {service.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials Section */}
                <section id="testimonials" className="py-20 bg-secondary/10 relative overflow-hidden">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-16 relative z-10"
                        >
                            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">{t('testimonials_label')}</p>
                            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
                                {t('testimonials_title')}
                            </h2>
                            <h3 className="text-3xl md:text-5xl font-bold text-muted-foreground mb-6">
                                {t('testimonials_subtitle')}
                            </h3>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                {t('testimonials_desc')}
                            </p>
                        </motion.div>

                        {/* Scattered Grid Layout */}
                        <div className="relative h-[600px] max-w-6xl mx-auto">
                            {/* Left Column */}
                            <div className="absolute left-0 top-0 space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                    className="w-40 h-56 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[0]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="w-40 h-56 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[1]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                            </div>

                            {/* Left-Center Column */}
                            <div className="absolute left-48 top-12 space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.15 }}
                                    className="w-40 h-48 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[2]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.25 }}
                                    className="w-40 h-56 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[3]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                            </div>

                            {/* Center Column */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-24 space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="w-40 h-52 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[4]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="w-40 h-48 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[5]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                            </div>

                            {/* Right-Center Column */}
                            <div className="absolute right-48 top-0 space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.25 }}
                                    className="w-40 h-56 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[6]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.35 }}
                                    className="w-40 h-48 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[7]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                            </div>

                            {/* Right Column */}
                            <div className="absolute right-0 top-16 space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="w-40 h-52 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[8]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                    className="w-40 h-56 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[9]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                            </div>

                            {/* Additional scattered images for tablet/mobile */}
                            <div className="hidden md:block absolute left-96 top-64">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.35 }}
                                    className="w-32 h-44 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[10]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                            </div>

                            <div className="hidden md:block absolute right-96 top-72">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                    className="w-32 h-40 rounded-3xl overflow-hidden shadow-xl"
                                >
                                    <img src={testimonialImages[11]} alt="Professional" className="w-full h-full object-cover" />
                                </motion.div>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="text-center mt-16"
                        >
                            <Button
                                size="lg"
                                className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                            >
                                {t('testimonials_cta')} <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </motion.div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-20 bg-background">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                                {t('pricing_title')}
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('pricing_subtitle')}
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                            {translatedPlans.map((plan, index) => (
                                <motion.div
                                    key={plan._id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    whileHover={{ y: -10, transition: { duration: 0.2 } }}
                                    className={`relative p-8 rounded-2xl border-2 bg-card transition-all duration-300 ${plan._id === '3'
                                        ? 'border-primary shadow-hover scale-105'
                                        : 'border-border shadow-card hover:shadow-hover'
                                        }`}
                                >
                                    {plan._id === '3' && (
                                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                            <span className="gradient-primary text-white text-sm font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                                                {t('pricing_best_value')}
                                            </span>
                                        </div>
                                    )}

                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-foreground mb-2">
                                            {plan.name}
                                        </h3>
                                        <p className="text-sm text-primary font-medium mb-4">
                                            {plan.description}
                                        </p>
                                        <div className="mt-4">
                                            <span className="text-4xl font-bold text-foreground">
                                                {plan.price === 0 ? 'FREE' : `${plan.price.toLocaleString()} RWF`}
                                            </span>
                                            <span className="text-muted-foreground ml-2">
                                                {plan.duration === 'month' && t('pricing_duration_month')}
                                                {plan.duration === 'year' && t('pricing_duration_year')}
                                                {plan.duration === 'forever' && t('pricing_duration_forever')}
                                            </span>
                                        </div>
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                                <span className="text-muted-foreground text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {plan.price === 0 ? (
                                        <Link to="/register" className="block">
                                            <Button
                                                className={`w-full ${plan._id === '3'
                                                    ? 'gradient-primary'
                                                    : ''
                                                    }`}
                                                variant={plan._id === '3' ? 'default' : 'outline'}
                                            >
                                                {t('nav_get_started')}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            onClick={() => handlePlanSelect(plan.name, plan.price)}
                                            className={`w-full ${plan._id === '3'
                                                ? 'gradient-primary'
                                                : ''
                                                }`}
                                            variant={plan._id === '3' ? 'default' : 'outline'}
                                        >
                                            {t('pricing_pay_now')}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <PaymentDialog
                    open={paymentOpen}
                    onOpenChange={setPaymentOpen}
                    plan={selectedPlan}
                    amount={planAmount}
                    onSuccess={() => {
                        // Payment submitted, dialog will close automatically
                    }}
                />

                {/* CTA Section */}
                <section className="py-20 bg-background">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="bg-primary rounded-3xl p-12 md:p-16 text-center shadow-hover"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary-foreground">
                                {t('cta_title')}
                            </h2>
                            <p className="text-xl mb-10 text-primary-foreground/90 max-w-2xl mx-auto">
                                {t('cta_subtitle')}
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center">
                                <Link to="/register">
                                    <Button size="lg" className="bg-background text-foreground hover:bg-background/90 text-lg px-8 py-6 font-semibold">
                                        {t('cta_start_free')}
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                                <a href="https://wa.me/250792734752?text=Hello%2C%20I%27d%20like%20to%20learn%20more%20about%20SmartStock" target="_blank" rel="noopener noreferrer">
                                    <Button
                                        size="lg"
                                        className="bg-background text-foreground border-2 border-background hover:bg-background/80 text-lg px-8 py-6 font-semibold transition-all"
                                    >
                                        {t('cta_learn_more')}
                                    </Button>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </section >

                {/* Partnership Section */}
                < section id="partners" className="py-24 bg-background relative overflow-hidden" >
                    <div className="container mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left Content */}
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="relative z-10"
                            >
                                <h2 className="text-5xl md:text-7xl font-bold text-foreground mb-8 leading-tight tracking-tight">
                                    {t('partners_title_1')} <span className="text-primary tracking-tighter">{t('partners_title_highlight')}</span> {t('partners_title_2')}
                                </h2>
                                <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
                                    {t('partners_desc')}
                                </p>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        onClick={() => setIsChatOpen(true)}
                                        className="px-10 py-7 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-xl shadow-xl transition-all"
                                    >
                                        {t('partners_apply')}
                                    </Button>
                                </motion.div>
                            </motion.div>

                            {/* Right - Partner Avatars with Diagonal Stripe */}
                            <div className="relative h-[600px] hidden lg:block overflow-visible mt-20 lg:mt-0">
                                {/* Diagonal Stripe */}
                                <motion.div
                                    initial={{ x: 100, opacity: 0, rotate: -35 }}
                                    whileInView={{ x: 0, opacity: 1, rotate: -35 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="absolute -top-40 -right-80 w-[300%] h-[150px] bg-primary transform origin-top-right z-0"
                                />

                                {/* Scattered Avatars */}
                                <div className="relative z-10 w-full h-full">
                                    {/* Top Left - Solange */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, y: 20 }}
                                        whileInView={{ scale: 1, opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
                                        className="absolute top-0 left-20 w-32 h-32 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/solange.png" alt="Solange" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                Solange
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Top Right - Theodev */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, y: 20 }}
                                        whileInView={{ scale: 1, opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 100 }}
                                        className="absolute -top-10 right-40 w-28 h-28 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/theodev.png" alt="Theodev" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                Theodev
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Center Left - PixelMart */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, x: -20 }}
                                        whileInView={{ scale: 1, opacity: 1, x: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 100 }}
                                        className="absolute top-1/2 -translate-y-1/2 left-32 w-24 h-24 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/pixelmart.png" alt="PixelMart" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                PixelMart
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Center Right (Large) - Rwanda Scratch */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, x: 20 }}
                                        whileInView={{ scale: 1, opacity: 1, x: 0 }}
                                        whileHover={{ scale: 1.05 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.5, type: "spring", stiffness: 100 }}
                                        className="absolute top-1/2 -translate-y-1/2 right-10 w-48 h-48 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/rwandascratch.png" alt="Rwanda Scratch" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                Rwanda Scratch
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Mid-Center Right - Open Future */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, y: -20 }}
                                        whileInView={{ scale: 1, opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.6, type: "spring", stiffness: 100 }}
                                        className="absolute top-[40%] right-56 w-36 h-36 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/openlogo.png" alt="Open Future" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                Open Future
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Bottom Center - Faustin */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, y: 20 }}
                                        whileInView={{ scale: 1, opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.7, type: "spring", stiffness: 100 }}
                                        className="absolute bottom-10 left-1/2 w-40 h-40 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/faustin.jpg" alt="Faustin" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                Faustin
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* NEW - Top Center - Hanga Pitchfest */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, y: -20 }}
                                        whileInView={{ scale: 1, opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.8, type: "spring", stiffness: 100 }}
                                        className="absolute top-16 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/hangapitchfest.jpg" alt="Hanga Pitchfest" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                Hanga Pitchfest
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* NEW - Bottom Left - Ukuri */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0, x: -20 }}
                                        whileInView={{ scale: 1, opacity: 1, x: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        viewport={{ once: false, amount: 0.5 }}
                                        transition={{ duration: 0.6, delay: 0.9, type: "spring", stiffness: 100 }}
                                        className="absolute bottom-20 left-10 w-28 h-28 rounded-full border-4 border-background overflow-hidden shadow-2xl group cursor-pointer"
                                    >
                                        <img src="/partners/ukuri.png" alt="Ukuri" className="w-full h-full object-cover" />
                                        {/* WhatsApp-style tooltip */}
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                                Ukuri
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section >

                {/* Supported By Section */}
                < SupportedBy />

                {/* Footer */}
                < footer className="bg-card border-t border-border py-12" >
                    <div className="container mx-auto px-6">
                        <div className="grid md:grid-cols-4 gap-8 mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <img src="/smartstock.png" alt="SmartStock" className="h-10 w-auto object-contain" />
                                    <span className="text-2xl font-bold text-foreground">SmartStock</span>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    {t('footer_desc')}
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground mb-4">{t('footer_product')}</h4>
                                <div className="space-y-2">
                                    <button onClick={() => scrollToSection('features')} className="block text-muted-foreground hover:text-primary transition-colors text-sm">
                                        {t('nav_features')}
                                    </button>
                                    <button onClick={() => scrollToSection('services')} className="block text-muted-foreground hover:text-primary transition-colors text-sm">
                                        {t('nav_services')}
                                    </button>
                                    <button onClick={() => scrollToSection('pricing')} className="block text-muted-foreground hover:text-primary transition-colors text-sm">
                                        {t('nav_pricing')}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground mb-4">{t('footer_company')}</h4>
                                <div className="space-y-2">
                                    <Link to="/about" className="block text-muted-foreground hover:text-primary transition-colors text-sm">
                                        {t('footer_about')}
                                    </Link>
                                    <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors text-sm">
                                        {t('footer_contact')}
                                    </Link>
                                    <Link to="/support" className="block text-muted-foreground hover:text-primary transition-colors text-sm">
                                        {t('footer_support')}
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground mb-4">{t('footer_stay_updated')}</h4>
                                <p className="text-muted-foreground text-sm mb-4">
                                    {t('footer_whatsapp_desc')}
                                </p>
                                <a
                                    href="https://whatsapp.com/channel/0029Vb79i5j8KMqkov7ng61H"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-md transition-all shadow-md hover:shadow-lg text-sm font-medium"
                                >
                                    <MessageCircle className="h-4 w-4 fill-current" />
                                    <span>{t('footer_join_whatsapp')}</span>
                                </a>
                            </div>
                        </div>

                        <div className="border-t border-border pt-8 text-center">
                            <p className="text-muted-foreground text-sm">
                                {t('footer_rights')}
                            </p>
                            <p className="text-muted-foreground text-sm mt-2">
                                {t('footer_dev_team')} <a href="/ourdevelopers" className="text-primary hover:underline">{t('footer_dev_link')}</a>
                            </p>
                        </div>
                    </div>
                </footer >
            </div >

            {/* Floating WhatsApp Action Button */}
            < div className="fixed bottom-6 right-6 z-40 flex items-center gap-4 group" >
                {/* Tooltip */}
                < div
                    className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 pointer-events-none"
                >
                    <div className="bg-[#0B141B] text-white px-6 py-3 rounded-xl relative whitespace-nowrap shadow-2xl">
                        <p className="text-sm font-medium">{t('fab_help')}</p>
                        {/* Triangle Arrow */}
                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-[#0B141B] border-b-[8px] border-b-transparent" />
                    </div>
                </div >

                {/* WhatsApp Button */}
                < motion.a
                    href="https://wa.me/250792734752"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center shadow-xl hover:shadow-[#25D366]/40 transition-all relative overflow-hidden"
                    aria-label="Chat on WhatsApp"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                    <svg
                        viewBox="0 0 24 24"
                        className="w-9 h-9 text-white fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.865L0 24l6.305-1.654a11.83 11.83 0 005.736 1.482h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.528-8.411" />
                    </svg>
                </motion.a>
            </div>

            {/* Chat Widget */}
            <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </>
    );
};

export default LandingPage;