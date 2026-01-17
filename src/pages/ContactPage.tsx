import React from 'react';
import SEOHelmet from '@/components/SEOHelmet';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageCircle, Phone, Mail, MapPin, Send, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

                    {/* Quick Support Message (Visual Only for now) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="relative"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-blue-500/20 blur-2xl opacity-50" />
                        <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl relative z-10">
                            <h3 className="text-2xl font-bold mb-6">Need a callback?</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Business Name</label>
                                    <input className="w-full p-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50" placeholder="Your Business" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone Number</label>
                                    <input className="w-full p-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50" placeholder="07XX XXX XXX" />
                                </div>
                                <Button className="w-full py-6 rounded-xl text-lg font-bold" disabled>
                                    Request Callback (In Development)
                                </Button>
                                <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">Available 8AM - 8PM (CAT)</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
