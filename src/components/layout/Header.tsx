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
import LanguageSelector from '@/components/LanguageSelector';
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
          <div className="flex items-center">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2"
            >
              <Menu size={20} />
            </Button>
          </div>

          {/* Global Search */}
          <div className="hidden md:block">
            <GlobalSearch />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-4">
            {/* Plan Status */}
            {user?.subscription && (
              <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                <span className="capitalize mr-1">{t(`plan_${user.subscription.plan}`)}:</span>
                <span>
                  {Math.max(0, Math.ceil((new Date(user.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} {t('days_left')}
                </span>
              </div>
            )}

            {/* Tech Group: Status, Language, Theme */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-full border border-gray-100 dark:border-gray-700">
              {/* Online/Offline Status Dot */}
              <div className="flex items-center px-1.5">
                {isOnline ? (
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>

              <LanguageSelector />

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 p-0 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </Button>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Bell size={20} />
                  {(pendingCount > 0 || (user?.subscription && Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 2)) && (
                    <Badge
                      variant="destructive"
                      className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] border-2 border-white dark:border-gray-900"
                    >
                      {pendingCount + (user?.subscription && Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 2 ? 1 : 0) > 9 ? '9+' : pendingCount + (user?.subscription && Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 2 ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Subscription Expiry Warning */}
                {user?.subscription && (() => {
                  const daysLeft = Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (daysLeft <= 0) return (
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 bg-red-50 dark:bg-red-900/20 focus:bg-red-100 dark:focus:bg-red-900/40">
                      <div className="flex items-center gap-2 font-semibold text-red-600 dark:text-red-400">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        Plan Expired
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your subscription has expired. Access is restricted. Please renew immediately.
                      </p>
                    </DropdownMenuItem>
                  );
                  if (daysLeft <= 2) return (
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 focus:bg-yellow-100 dark:focus:bg-yellow-900/40">
                      <div className="flex items-center gap-2 font-semibold text-yellow-600 dark:text-yellow-400">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Renewal Alert
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your plan expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}. Renew now to avoid interruption.
                      </p>
                    </DropdownMenuItem>
                  );
                  return null;
                })()}

                {/* System Active Status */}
                {(!user?.isActive || !user?.businessActive) && (
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-2 font-semibold text-red-600 dark:text-red-400">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Account Inactive
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your account or business is currently marked as inactive.
                    </p>
                  </DropdownMenuItem>
                )}

                {/* Offline Pending Changes */}
                {pendingCount > 0 && (
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Pending Syncs
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pendingCount} changes waiting to sync when online.
                    </p>
                  </DropdownMenuItem>
                )}

                {/* Empty State */}
                {pendingCount === 0 && (!user?.subscription || Math.ceil((new Date(user.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) > 2) && (user?.isActive && user?.businessActive) && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
                        {fullName || t('user')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user.role || t('role')}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('account')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>{t('profile_title')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
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
