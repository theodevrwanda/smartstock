import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthSettings } from './AuthSettings';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-slate-950">
      {/* Left Side - Image/Feature Area */}
      <div className="hidden lg:block lg:w-[55%] h-full relative overflow-hidden bg-slate-900">
        <img
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop"
          alt="Office"
          className="w-full h-full object-cover opacity-80"
        />
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Floating UI Card 1 - Top Left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute top-12 left-12 bg-primary p-4 rounded-xl shadow-lg max-w-[240px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-primary-foreground rounded-full" />
            <p className="text-xs font-bold text-primary-foreground uppercase">Low Stock Alert</p>
          </div>
          <p className="text-[10px] font-medium text-primary-foreground/80">
            Wireless Headphones (WH-1000XM5) are running low. Only 3 units remaining.
          </p>
        </motion.div>

        {/* Floating UI Card 2 - Bottom Center/Right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-12 right-12 bg-background/90 backdrop-blur-md p-5 rounded-2xl shadow-xl max-w-[280px] border border-border"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/100?img=1" className="w-8 h-8 rounded-full border-2 border-background" alt="User" />
              <img src="https://i.pravatar.cc/100?img=5" className="w-8 h-8 rounded-full border-2 border-background" alt="User" />
              <img src="https://i.pravatar.cc/100?img=8" className="w-8 h-8 rounded-full border-2 border-background" alt="User" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">+12 Sales</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">Weekly Meeting</p>
            <p className="text-xs text-muted-foreground">10:00 AM - 11:30 AM</p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form Area */}
      <div className="w-full lg:w-[45%] h-full flex flex-col relative overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-12 min-h-0">
          {/* Logo Badge */}
          {/* Logo Badge & Settings */}
          <Link
            to="/"
            className="absolute top-8 left-8 lg:top-12 lg:left-12 z-50 hover:opacity-80 transition-opacity"
          >
            <img
              src="/smartstock.png"
              alt="Smartstock"
              className="h-8 w-auto"
            />
          </Link>

          <div className="absolute top-8 right-8 lg:top-12 lg:right-12 flex items-center gap-2 z-50">
            <AuthSettings />
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md mx-auto my-auto pt-20 pb-16"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
