import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Zap, Check } from 'lucide-react';
import loginImage from '@/assets/login-image.jpg';
import forgotPasswordImage from '@/assets/forgot-password-image.jpg';
import SEOHelmet from '@/components/SEOHelmet';

type AuthView = 'login' | 'forgot';

const LoginPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Wake up backend once on mount — async but doesn't block render
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/start-server`)
      .then(() => {
        console.log('✅ Backend wake-up ping successful');
      })
      .catch((err) => {
        console.error('❌ Backend wake-up ping failed:', err.message);
      });
  }, []);

  const handleResetSent = (email: string) => {
    setCurrentView('login');
  };

  return (
    <>
      <SEOHelmet 
        title={currentView === 'login' ? 'Login - EMS: Electronic Management System' : 'Reset Password - EMS'}
        description={currentView === 'login' ? 'Login to EMS, the comprehensive Electronic Management System for inventory, sales, and business operations management.' : 'Reset your EMS password to regain access to your account.'}
        canonical={`https://ems.pages.dev/login`}
      />
      <div className="min-h-screen flex">
        {/* Left Side - Form Section */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-accent rounded-full z-10"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </Button>

          {/* Logo */}
          <div className="absolute top-8 left-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">EMS</span>
            </div>
          </div>

          <div className="w-full max-w-md">
            {currentView === 'login' && (
              <LoginForm 
                onForgotPassword={() => setCurrentView('forgot')}
              />
            )}
            {currentView === 'forgot' && (
              <ForgotPasswordForm
                onBackToLogin={() => setCurrentView('login')}
                onResetSent={handleResetSent}
              />
            )}
          </div>
        </div>

        {/* Right Side - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="w-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex flex-col justify-center items-center p-12 text-primary-foreground">
            <div className="max-w-md text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">
                Effortlessly manage your team and operations.
              </h1>
              <p className="text-lg text-primary-foreground/90">
                Log in to access your EMS dashboard and manage your team.
              </p>
            </div>
            
            {/* Features Preview */}
            <div className="relative w-full max-w-lg">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold mb-4">EMS Features</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Secure System with Advanced Encryption</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Real-Time Product Tracking in Store</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Monitor Products Sold</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Restore Previously Archived Products</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Manage Product Deletion</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Comprehensive Inventory Management</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Team Collaboration Tools</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;