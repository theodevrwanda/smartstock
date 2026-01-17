import React from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageCircle, Phone, Mail, MapPin, Send, Globe, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ContactPage: React.FC = () => {
    const { t } = useLanguage();

    const handleWhatsAppChat = () => {
        window.open('https://wa.me/250792734752', '_blank');
    };

    const handleWhatsAppChannel = () => {
        window.open('https://whatsapp.com/channel/0029Vb79i5j8KMqkov7ng61H', '_blank');
    };

    return (
        <div className="min-h-screen bg-background">
            <SEOHelmet
                title="Contact Us - SmartStock"
                description="Get in touch with SmartStock support. Join our WhatsApp channel or chat with theodevrwanda for any inquiries."
            />

            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                            <img src="/smartstock.png" alt="SmartStock" className="w-6 h-6 invert brightness-0" />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase">SmartStock</span>
                    </Link>
                    <Link to="/" className="text-sm font-bold flex items-center gap-1 hover:text-primary transition-colors">
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
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">We're Here to <span className="text-primary">Help</span></h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        Have questions about SmartStock? Need technical support? Reach out to us through any of the channels below.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-5 hover:border-primary/50 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                                <MessageCircle className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 font-bold tracking-tight">WhatsApp Channel</h3>
                                <p className="text-muted-foreground mb-4 font-medium text-sm">Join our official channel for the latest updates and announcements.</p>
                                <Button onClick={handleWhatsAppChannel} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                                    Join Channel
                                </Button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-5 hover:border-primary/50 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Phone className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 font-bold tracking-tight">Direct Support</h3>
                                <p className="text-muted-foreground mb-4 font-medium text-sm">Chat directly with the developer for urgent technical assistance.</p>
                                <Button onClick={handleWhatsAppChat} className="bg-primary hover:bg-primary/90">
                                    Chat on WhatsApp
                                </Button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start gap-5"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Globe className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 font-bold tracking-tight">Location</h3>
                                <p className="text-muted-foreground font-medium text-sm">Kigali, Rwanda</p>
                                <p className="text-muted-foreground font-medium text-sm">Theodev Rwanda HQ</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Promotional Image */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-blue-500/20 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border bg-card">
                            <img
                                src="/letbusinessgodigital.png"
                                alt="Let Business Go Digital"
                                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
                                <p className="text-white text-lg font-bold tracking-tight">Helping Rwandan SMBs Scale with Technology</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
