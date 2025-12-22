import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showMessage?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className, 
  showMessage = true, 
  message = "Please wait, loading may take a few seconds as the server is waking up." 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={cn(
        "animate-spin rounded-full border-indigo-600/20 border-t-indigo-600", 
        sizeClasses[size], 
        className
      )}>
      </div>
      {showMessage && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">
            Pixelmart Loading
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold text-center max-w-[240px] uppercase leading-relaxed">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;