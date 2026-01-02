import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {loading && loadingText ? loadingText : children}
            </Button>
        );
    }
);

LoadingButton.displayName = 'LoadingButton';

export default LoadingButton;
