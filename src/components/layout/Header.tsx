import React, { useState } from 'react';
import { Bell, Moon, Sun, Menu, CloudOff, Wifi, Link2, Languages, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from 'react-router-dom';
import GlobalSearch from '@/components/GlobalSearch';
import MobileMenu from './MobileMenu';
import BlockchainLedger from '@/components/BlockchainLedger';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [blockchainOpen, setBlockchainOpen] = useState(false);

  // Derive fullName from firstName and lastName if fullName is not directly available
  const fullName =
    user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  // Generate initials for AvatarFallback
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'OF';

  // Use profileImage from user object
  const profileImage = user?.profileImage || '';

  return (
    <>
      <header
        className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sticky top-0 z-50 shadow-sm"
      >
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2"
          >
            <Menu size={20} />
          </Button>

          {/* Global Search */}
          <GlobalSearch />

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Online/Offline Status */}
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-red-500" />
              )}
            </div>

            {/* Blockchain Ledger Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlockchainOpen(true)}
              className="hidden sm:flex items-center gap-2 text-xs"
            >
              <Link2 className="h-4 w-4" />
              <span className="hidden md:inline">{t('blockchain')}</span>
            </Button>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Languages size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('switch_language')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('rw')} className={language === 'rw' ? 'bg-accent' : ''}>
                  Kinyarwanda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </Button>

            {/* Notifications / Pending Changes */}
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell size={20} />
              {pendingCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                >
                  {pendingCount > 99 ? '99+' : pendingCount}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none">
                  <Avatar className="w-8 h-8 overflow-hidden">
                    <AvatarImage src={profileImage} className="object-cover w-full h-full" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  {user && (
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                        {fullName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user.role || 'Role'}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('account')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>{t('profile_title')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('personal_details')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Blockchain Ledger */}
      <BlockchainLedger
        isOpen={blockchainOpen}
        onClose={() => setBlockchainOpen(false)}
      />
    </>
  );
};

export default Header;
