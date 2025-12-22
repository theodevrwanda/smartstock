import React, { useState } from 'react';
import { Bell, User as UserIcon, Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import GlobalSearch from '@/components/GlobalSearch';
import MobileMenu from './MobileMenu';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive fullName from firstName and lastName if fullName is not directly available
  const fullName =
    user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  // Generate initials for AvatarFallback
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'OF';

  // Use profileImage from user object, which is mapped from profilePhoto in backend
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
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell size={20} />
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
    </>
  );
};

export default Header;