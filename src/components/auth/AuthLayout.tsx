import React from 'react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
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
          className="absolute top-12 left-12 bg-[#FCD34D] p-4 rounded-xl shadow-lg max-w-[240px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-black rounded-full" />
            <p className="text-xs font-bold text-black uppercase">Low Stock Alert</p>
          </div>
          <p className="text-[10px] font-medium text-black/80">
            Wireless Headphones (WH-1000XM5) are running low. Only 3 units remaining.
          </p>
        </motion.div>

        {/* Floating UI Card 2 - Bottom Center/Right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-12 right-12 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl max-w-[280px]"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/100?img=1" className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
              <img src="https://i.pravatar.cc/100?img=5" className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
              <img src="https://i.pravatar.cc/100?img=8" className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
            </div>
            <p className="text-xs text-slate-500 font-medium">+12 Sales</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900">Weekly Meeting</p>
            <p className="text-xs text-slate-500">10:00 AM - 11:30 AM</p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form Area */}
      <div className="w-full lg:w-[45%] h-full flex flex-col relative overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-12 min-h-0">
          {/* Logo Badge */}
          <div className="absolute top-8 right-8 lg:top-12 lg:right-12">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="px-4 py-1.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-800 bg-slate-50/50 backdrop-blur-sm group-hover:bg-slate-100 transition-colors">
                SmartStock
              </div>
            </div>
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
