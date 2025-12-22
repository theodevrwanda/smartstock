import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  User,
  Calendar,
  FileText,
  LogOut,
  Users,
  X,
  Folder,
  Handshake,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: Bell, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Products Store', path: '/products' },
  { icon: Calendar, label: 'Products Sold', path: '/products-sold' },
  { icon: FileText, label: 'Products Restored', path: '/products-restored' },
  { icon: User, label: 'My Profile', path: '/profile' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Folder, label: 'Trash', path: '/trash' },
  { icon: Handshake, label: 'Manage branch', path: '/manage-branch' },
  { icon: Home, label: 'Manage Employees', path: '/manage-employees' },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();

  const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'OF';
  const profileImage = user?.profileImage || '';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Mobile Menu */}
      <div className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-sidebar-border min-h-[60px]">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">EMS</span>
            </div>
            <span className="font-semibold text-sidebar-foreground text-sm">Electronics Pro</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1.5 h-auto w-auto"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-2 py-2 rounded-md transition-colors text-sm space-x-2",
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )
                }
              >
                <item.icon size={16} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          {user && (
            <div className="flex items-center space-x-2 mb-2 p-2">
              <Avatar className="w-6 h-6 overflow-hidden">
                <AvatarImage src={profileImage} className="object-cover w-full h-full" />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {fullName || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role || 'Role'}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm justify-start space-x-2 px-2"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
