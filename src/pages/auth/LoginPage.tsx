import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PWAInstallButton from '@/components/PWAInstallButton';
import SEOHelmet from '@/components/SEOHelmet';

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    login,
    loginWithGoogle,
    user,
    isAuthenticated,
    logout,
    errorMessage,
    clearError,
    loading: authLoading,
  } = useAuth();

  const { t } = useLanguage();
  const navigate = useNavigate();

  const loginSchema = z.object({
    email: z
      .string()
      .min(1, t('invalid_email') || 'Email is required')
      .email(t('invalid_email') || 'Please enter a valid email address'),
    password: z
      .string()
      .min(6, t('password_min_length') || 'Password must be at least 6 characters'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated and active
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.businessActive === false) {
        logout();
        return;
      }
      if (user.isActive === false) {
        logout();
        return;
      }
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, authLoading, navigate, logout]);

  // Determine which message to show and its type
  const getCurrentErrorMessage = () => {
    if (!errorMessage) return null;

    const translated = t(errorMessage);

    // Special case: user not found → informative suggestion to register
    if (errorMessage === 'user_not_found_create') {
      return {
        message: translated,
        variant: 'default' as const,
        icon: Info,
        title: t('dont_have_account') || "Don't have an account?",
      };
    }

    // Critical errors (inactive account/business, wrong password, etc.)
    return {
      message: translated,
      variant: 'destructive' as const,
      icon: AlertTriangle,
      title: t('error') || 'Error',
    };
  };

  const currentError = getCurrentErrorMessage();

  const handleEmailLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    clearError(); // Clear any previous error
    toast.dismiss();

    const success = await login(data.email.trim().toLowerCase(), data.password);

    if (!success) {
      const errorInfo = getCurrentErrorMessage();
      if (errorInfo) {
        // Show toast for feedback
        if (errorInfo.variant === 'destructive') {
          toast.error(errorInfo.message);
        } else {
          toast.info(errorInfo.message);
        }
      }
    } else {
      toast.success(t('success') || 'Welcome back!');
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    clearError();
    toast.dismiss();

    const success = await loginWithGoogle();

    if (!success) {
      const errorInfo = getCurrentErrorMessage();
      if (errorInfo) {
        toast.error(errorInfo.message);
      }
    } else {
      toast.success(t('success') || 'Signed in with Google!');
    }

    setIsGoogleLoading(false);
  };

  return (
    <AuthLayout>
      <SEOHelmet title="Login" />
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">
            {t('welcome_back_login')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            {t('enter_details_login')}
          </p>
        </div>

        {/* Prominent Alert for important messages */}
        {currentError && (
          <Alert
            variant={currentError.variant}
            className={`
              rounded-2xl border-2
              ${currentError.variant === 'default'
                ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/50 dark:border-blue-800'
                : 'bg-red-50/80 border-red-300 dark:bg-red-950/50 dark:border-red-800'
              }
            `}
          >
            <currentError.icon className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              {currentError.title}
            </AlertTitle>
            <AlertDescription className="text-base mt-1">
              {currentError.message}
              {currentError.variant === 'default' && (
                <Link
                  to="/register"
                  className="ml-2 font-bold underline hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {t('sign_up_link')}
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleEmailLogin)} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider pl-1"
              >
                {t('email_label')}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder={t('email_placeholder')}
                  autoComplete="email"
                  className="pl-4 h-12 bg-slate-50 dark:bg-slate-900 border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-2xl text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-950 focus:border-[#FCD34D] focus:ring-[#FCD34D]"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 pl-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider pl-1"
              >
                {t('password_label')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('password_placeholder')}
                  autoComplete="current-password"
                  className="pl-4 pr-10 h-12 bg-slate-50 dark:bg-slate-900 border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-2xl text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-950 focus:border-[#FCD34D] focus:ring-[#FCD34D]"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 pl-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t('forgot_password')}
            </Link>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#FCD34D] hover:bg-[#fbbf24] text-slate-900 font-bold rounded-2xl transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t('sign_in_button')
              )}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#F8F7F2] dark:bg-slate-950 px-2 text-slate-400 font-medium">
                  {t('or_divider')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              variant="outline"
              className="w-full h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-2xl"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('google_login')}
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-slate-500 text-sm">
            {t('dont_have_account')}{' '}
            <Link
              to="/register"
              className="font-bold text-slate-900 dark:text-white hover:underline"
            >
              {t('sign_up_link')}
            </Link>
          </p>
        </div>

        <PWAInstallButton
          variant="secondary"
          className="bg-transparent hover:bg-slate-200 text-slate-500 w-full rounded-xl"
        />
      </div>
    </AuthLayout>
  );
}