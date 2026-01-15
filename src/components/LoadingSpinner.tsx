import React from 'react';
import { cn } from '@/lib/utils';

// Removed unnecessary props like 'message' and 'showMessage'
// to enforce the requested clean, text-free design.
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}


const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <div className="absolute inset-0 animate-spin-slow">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-[46%] top-0 h-[28%] w-[8%] rounded-full bg-current"
              style={{
                transform: `rotate(${i * 30}deg)`,
                transformOrigin: '50% 175%',
                opacity: 1 - (i * 0.07),
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;