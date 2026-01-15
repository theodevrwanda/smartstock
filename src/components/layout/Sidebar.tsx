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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, className }) => {
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

  // Dynamic user data
  const businessName = user?.businessName || 'Smart Manager';
  const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || t('user');
  const initials = fullName ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  const profileImage = user?.profileImage || '';

  // WhatsApp link with pre-filled message
  const whatsappLink = `https://wa.me/250792734752?text=${encodeURIComponent(t('need_help_for'))}`;

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64",
      "h-screen sticky top-0 left-0 z-40",
      className
    )}>
      {/* --- HEADER: Business Name --- */}

      <div className="flex items-center justify-between p-4 border-b border-sidebar-border min-h-[60px] flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sidebar-foreground text-sm truncate uppercase tracking-tight">
                {businessName}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none font-medium mt-0.5">Smart Manager</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <span className="text-primary-foreground font-bold text-xs">
              {businessName.substring(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle} className="p-1.5 h-auto w-auto hover:bg-slate-100 rounded-lg">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-3">
        <nav className="space-y-1.5">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed ? "justify-center" : "space-x-3"
                )
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* --- Updated Support Card with User Profile & WhatsApp --- */}
      <div className="p-3 flex-shrink-0">
        <div className={cn(
          "bg-slate-900 rounded-2xl shadow-lg text-white overflow-hidden transition-all duration-300",
          collapsed ? "p-2 bg-transparent shadow-none" : "p-5"
        )}>
          {/* Show only icon when collapsed */}
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profileImage} />
                  <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">{initials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User Greeting & Avatar */}
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10 border-2 border-white/10">
                  <AvatarImage src={profileImage} className="object-cover" />
                  <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{t('welcome_back')}</p>
                  <p className="font-bold text-sm truncate text-white">{user?.firstName}</p>
                </div>
              </div>

              {/* Help Message */}
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('need_help')}
              </p>

              {/* WhatsApp Button */}
              <Button
                asChild
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-none shadow-none"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 5.644h-.004c-1.575-.001-3.022-.612-4.087-1.622l-.291-.183-3.025 1.007 1.024-2.985-.191-.424c-1.107-1.068-1.785-2.512-1.785-4.123 0-3.307 2.688-5.988 6-5.988 1.428 0 2.791.569 3.8 1.58l.273.247c1.007 1.088 1.579 2.525 1.579 4.005-.001 3.307-2.689 5.988-6 5.988M19.112 3.889C16.985 1.75 14.172.75 11.109.75c-4.613 0-8.361 3.748-8.361 8.361 0 1.475.383 2.918 1.112 4.191l-1.18 4.353 4.47-1.171c1.225.668 2.604 1.023 4.009 1.023 4.613 0 8.361-3.748 8.361-8.361 0-1.99-.7-3.826-1.908-5.257" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* User Footer & Logout */}
      <div className="p-3 border-t border-sidebar-border flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={cn(
            "w-full text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors",
            collapsed ? "justify-center h-10 w-10 p-0 mx-auto" : "justify-start space-x-3 px-3 py-2.5 h-auto"
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>{t('sign_out')}</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;