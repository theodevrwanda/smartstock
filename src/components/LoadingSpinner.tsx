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
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-[5px]'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className={cn(
          "animate-spin rounded-full border-slate-200 border-t-[#FCD34D]",
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
};

export default LoadingSpinner;