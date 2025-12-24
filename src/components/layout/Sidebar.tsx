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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { icon: BarChart2, label: 'Dashboard', path: '/dashboard' },
  { icon: Package, label: 'Products Store', path: '/products' },
  { icon: ShoppingCart, label: 'Products Sold', path: '/products-sold' },
  { icon: ArchiveRestore, label: 'Products Restored', path: '/products-restored' },
  { icon: User, label: 'My Profile', path: '/profile' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Trash2, label: 'Trash', path: '/trash' },
  { icon: Store, label: 'Manage Branch', path: '/manage-branch' },
  { icon: Users, label: 'Manage Employees', path: '/manage-employees' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, className }) => {
  const { logout, user } = useAuth();

  // Dynamic user data
  const businessName = user?.businessName || 'Smart Manager';
  const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const initials = fullName ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  const profileImage = user?.profileImage || '';

  // WhatsApp link with pre-filled message
  const whatsappLink = `https://wa.me/250792734752?text=${encodeURIComponent('I need help for ')}`;

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64",
      "h-screen sticky top-0 left-0 z-40",
      className
    )}>
      {/* --- HEADER: Business Name --- */}
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border min-h-[60px] flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sidebar-foreground text-sm truncate uppercase tracking-tight">
                {businessName}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none font-medium">Smart Manager</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-xs">
              {businessName.substring(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle} className="p-1.5 h-auto w-auto">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2">
        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-2 py-2 rounded-md transition-colors text-sm",
                  isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  collapsed ? "justify-center" : "space-x-2"
                )
              }
            >
              <item.icon size={16} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* --- Updated Support Card with User Profile & WhatsApp --- */}
      <div className="p-3 flex-shrink-0">
        <div className={cn(
          "bg-gradient-to-br from-blue-600 to-green-600 rounded-xl shadow-lg text-white overflow-hidden",
          collapsed ? "p-3" : "p-5"
        )}>
          {/* Show only icon when collapsed */}
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profileImage} />
                  <AvatarFallback className="bg-white/30 text-white text-xs">{initials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User Greeting & Avatar */}
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12 border-2 border-white/30">
                  <AvatarImage src={profileImage} className="object-cover" />
                  <AvatarFallback className="bg-white/20 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">Hello</p>
                  <p className="font-bold text-xl truncate">{user.firstName}</p>
                </div>
              </div>

              {/* Help Message */}
              <p className="text-sm opacity-95 leading-relaxed">
                For further assistance or to report any technical issues, please contact our Support Team.
              </p>

              {/* WhatsApp Button */}
              <Button
                asChild
                size="lg"
                className="w-full bg-white text-green-600 hover:bg-gray-100 font-bold shadow-md flex items-center justify-center space-x-2"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 5.644h-.004c-1.575-.001-3.022-.612-4.087-1.622l-.291-.183-3.025 1.007 1.024-2.985-.191-.424c-1.107-1.068-1.785-2.512-1.785-4.123 0-3.307 2.688-5.988 6-5.988 1.428 0 2.791.569 3.8 1.58l.273.247c1.007 1.088 1.579 2.525 1.579 4.005-.001 3.307-2.689 5.988-6 5.988M19.112 3.889C16.985 1.75 14.172.75 11.109.75c-4.613 0-8.361 3.748-8.361 8.361 0 1.475.383 2.918 1.112 4.191l-1.18 4.353 4.47-1.171c1.225.668 2.604 1.023 4.009 1.023 4.613 0 8.361-3.748 8.361-8.361 0-1.99-.7-3.826-1.908-5.257"/>
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* User Footer & Logout */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        {!collapsed && user && (
          <div className="flex items-center space-x-2 mb-2 p-2">
            <Avatar className="w-8 h-8 border">
              <AvatarImage src={profileImage} className="object-cover" />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{fullName}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase">{user?.role || 'Staff'}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={cn(
            "w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-sm",
            collapsed ? "justify-center" : "justify-start space-x-2 px-2"
          )}
        >
          <LogOut size={14} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;