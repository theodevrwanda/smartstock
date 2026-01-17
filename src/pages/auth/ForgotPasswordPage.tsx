import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

type ForgotPasswordData = {
  email: string;
};

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const forgotPasswordSchema = z.object({
    email: z.string().email(t('invalid_email')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsLoading(true);

    try {
      await resetPassword(data.email);
      setSentEmail(data.email);
      setIsEmailSent(true);
      toast.success(t('email_sent'));
    } catch (error: any) {
      const message = error.message || t('send_reset_failed');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <AuthLayout>
        <div className="space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {t('check_email_reset')}
            </h1>
            <p className="text-slate-600">
              {t('email_sent')}:
            </p>
            <p className="font-medium text-slate-900">{sentEmail}</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setIsEmailSent(false);
                  setSentEmail('');
                }}
                variant="outline"
                className="w-full h-11 border-slate-200 rounded-2xl hover:bg-slate-50"
              >
                {t('enter_email')}
              </Button>

              <Link to="/login">
                <Button
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('back_button')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {t('forgot_password')}
          </h1>
          <p className="text-slate-600 font-medium text-sm">
            {t('change_password_desc')}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-600 text-xs font-bold uppercase tracking-wider pl-1">
              {t('email_label')}
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder={t('email_placeholder')}
                className="pl-4 h-12 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-2xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 pl-1">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="text-primary-foreground" />
            ) : (
              t('continue_button')
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-bold text-slate-900 hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back_button')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
