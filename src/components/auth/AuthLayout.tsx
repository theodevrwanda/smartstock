import React from 'react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const imageUrls = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=250&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=200&h=280&fit=crop',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=260&fit=crop',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=240&fit=crop',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=200&h=290&fit=crop',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=270&fit=crop',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=200&h=250&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=280&fit=crop',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&h=260&fit=crop',
  'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=200&h=300&fit=crop',
  'https://images.unsplash.com/photo-1524749292158-7540c2494485?w=200&h=240&fit=crop',
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-sky-100 via-blue-50 to-white">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto w-full"
        >
          {children}
        </motion.div>
      </div>

      {/* Right side - Image Collage */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-100 to-sky-200">
        <div className="absolute inset-0 p-8">
          <div className="grid grid-cols-4 gap-4 h-full auto-rows-max">
            {imageUrls.map((url, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                style={{
                  height: `${180 + (index % 3) * 40}px`,
                  marginTop: index % 2 === 0 ? '0' : '20px',
                }}
              >
                <img
                  src={url}
                  alt={`Business ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-200/50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
