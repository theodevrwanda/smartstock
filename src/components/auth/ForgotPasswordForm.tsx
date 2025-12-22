import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Define the schema for the form data
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Infer the type from the schema
type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

// Define props interface for the component
interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onResetSent: (email: string) => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ 
  onBackToLogin, 
  onResetSent 
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { resetPassword } = useAuth();

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema), // Integrate Zod for validation
  });

  // Handle form submission
  const onSubmit = async (data: ForgotPasswordData) => {
    setLoading(true); // Set loading state to true

    try {
      await resetPassword(data.email);

      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions.",
      });
      
      // Call parent callback to switch view, passing the email
      onResetSent(data.email);

    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.message || "Failed to send reset email. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
        <p className="text-center text-muted-foreground">
          Enter your email to receive reset instructions
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@opendash.com"
              {...register('email')} // Register input with react-hook-form
              className={errors.email ? 'border-red-500' : ''} // Add error styling
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading} // Disable button when loading
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onBackToLogin} // Go back to login form
            className="w-full"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordForm;
