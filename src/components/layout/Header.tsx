import React, { useState } from 'react';
import { Bell, Moon, Sun, Menu, CloudOff, Wifi, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import GlobalSearch from '@/components/GlobalSearch';
import MobileMenu from './MobileMenu';
import BlockchainLedger from '@/components/BlockchainLedger';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOffline();
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
              <span className="hidden md:inline">Blockchain</span>
            </Button>

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
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8 overflow-hidden">
                <AvatarImage src={profileImage} className="object-cover w-full h-full" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {user && (
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {fullName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role || 'Role'}
                  </p>
                </div>
              )}
            </div>
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
