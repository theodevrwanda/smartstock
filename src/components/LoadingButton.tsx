import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
    loading?: boolean;
    loadingText?: string;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
    ({ children, loading = false, loadingText, disabled, className, ...props }, ref) => {
        return (
            <Button
                ref={ref}
                disabled={disabled || loading}
                className={cn('smooth-button', className)}
                {...props}
            >
                {loading && (
                    <LoadingSpinner size="sm" className="mr-2" />
                )}
                {loading && loadingText ? loadingText : children}
            </Button>
        );
    }
);

LoadingButton.displayName = 'LoadingButton';

export default LoadingButton;
