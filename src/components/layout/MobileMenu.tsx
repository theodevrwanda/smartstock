import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart2,
  Package,
  ShoppingCart,
  ArchiveRestore,
  User,
  FileText,
  Trash2,
  Store,
  Users,
  LogOut,
  Settings,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const { t } = useLanguage();

  const sidebarItems = [
    { icon: BarChart2, label: t('dashboard_label'), path: '/dashboard' },
    { icon: Package, label: t('store_label'), path: '/dashboard/products' },
    { icon: ShoppingCart, label: t('sold_label'), path: '/dashboard/products-sold' },
    { icon: ArchiveRestore, label: t('restored_label'), path: '/dashboard/products-restored' },
    { icon: User, label: t('profile_title'), path: '/dashboard/profile' },
    { icon: FileText, label: t('reports_label'), path: '/dashboard/reports' },
    { icon: Trash2, label: t('trash_label'), path: '/dashboard/trash' },
    { icon: Store, label: t('branches_label'), path: '/dashboard/manage-branch' },
    { icon: Users, label: t('employees_label'), path: '/dashboard/manage-employees' },
    { icon: Settings, label: t('settings_label'), path: '/dashboard/settings' },
  ];

  // Dynamic user and business data
  const businessName = user?.businessName || "Pixel";
  const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';
  const profileImage = user?.profileImage || '';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        onClick={onClose}
      />

      {/* Mobile Menu */}
      <div className="fixed inset-y-0 left-0 w-72 bg-sidebar border-r border-sidebar-border z-50 lg:hidden shadow-2xl transform transition-transform duration-300 ease-in-out">

        {/* Header - Updated to display Business Name */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border min-h-[70px]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-sm uppercase">
                {businessName.substring(0, 3).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sidebar-foreground text-sm truncate uppercase tracking-tight">
                {businessName}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none font-medium">Smart Manager</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-8 w-8 text-gray-500"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Scrollable Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2.5 rounded-lg transition-all text-sm font-medium space-x-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )
                }
              >
                <item.icon size={18} className={cn("flex-shrink-0")} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
          {user && (
            <div className="flex items-center space-x-3 mb-4 p-2 rounded-lg bg-sidebar-accent/30">
              <Avatar className="w-9 h-9 border-2 border-primary/20">
                <AvatarImage src={profileImage} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-sidebar-foreground truncate">
                  {fullName}
                </p>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">
                  {user?.role === 'admin' ? t('admin_account') : t('staff_account')}
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
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold justify-start space-x-3 px-3 h-11 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>{t('sign_out')}</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;