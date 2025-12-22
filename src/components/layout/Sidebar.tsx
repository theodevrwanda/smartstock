import React, { useState } from 'react';
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
  X,
  LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// --- Placeholder UI Components ---
const Input = ({ placeholder, type = "text", ...props }: any) => (
  <input 
    type={type} 
    placeholder={placeholder} 
    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
    {...props} 
  />
);
const Textarea = ({ placeholder, ...props }: any) => (
  <textarea 
    placeholder={placeholder} 
    rows={4} 
    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" 
    {...props} 
  />
);
const Select = ({ children, ...props }: any) => (
  <select 
    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
    {...props}
  >
    {children}
  </select>
);

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

const ProblemReportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [form, setForm] = useState({
        email: '',
        issueType: 'Problem',
        message: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Form Submitted! Type: ${form.issueType}, Email: ${form.email}, Message: ${form.message}.`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md m-4 relative">
                <div className="flex justify-between items-start mb-4 border-b pb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Support & Upgrades</h3>
                    <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-auto w-auto">
                        <X size={18} />
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <Input type="email" name="email" value={form.email} onChange={handleChange} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                        <Select name="issueType" value={form.issueType} onChange={handleChange}>
                            <option value="Problem">Technical Problem</option>
                            <option value="Upgrade">Feature Request</option>
                            <option value="Other">General Inquiry</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                        <Textarea name="message" value={form.message} onChange={handleChange} required />
                    </div>
                    <Button type="submit" className="w-full bg-primary text-white font-semibold">Submit</Button>
                </form>
            </div>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, className }) => {
  const { logout, user } = useAuth();
  const [isReportFormOpen, setIsReportFormOpen] = useState(false); 

  // Dynamic user data
  const businessName = user?.businessName;
  const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const initials = fullName ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  const profileImage = user?.profileImage || '';

  return (
    <>
      <div className={cn(
        "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64",
        "h-screen sticky top-0 left-0 z-40",
        className
      )}>
        {/* --- HEADER: Displays Business Name --- */}
        <div className="flex items-center justify-between p-3 border-b border-sidebar-border min-h-[60px] flex-shrink-0">
          {!collapsed ? (
            <div className="flex items-center space-x-2 overflow-hidden">
              {/* <div className="flex-shrink-0 w-10 h-6 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-[10px] uppercase">
                  {businessName.substring(1,3)}
                </span>
              </div> */}
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sidebar-foreground text-sm truncate uppercase tracking-tight">
                  {businessName}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none font-medium">Smart Manager</span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center mx-auto">
                <span className="text-primary-foreground font-bold text-xs">{businessName.substring(0,3)}</span>
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
        
        {/* Support Card */}
        <div className="p-2 flex-shrink-0">
          <div className={cn(
              "flex flex-col items-center p-3 rounded-xl text-sm text-white transition-all duration-200", 
              "bg-gradient-to-br from-blue-700 to-primary shadow-lg", 
              collapsed ? "p-2 h-12 justify-center" : "" 
            )}>
            {!collapsed && (
              <div className="flex flex-col items-center space-y-2 w-full">
                  <p className="font-bold text-center leading-tight">Support & Upgrade</p>
                  <Button
                    size="sm"
                    onClick={() => setIsReportFormOpen(true)}
                    className="w-full bg-white text-primary hover:bg-gray-100 font-bold shadow-md flex items-center justify-center space-x-2" 
                  >
                    <LifeBuoy size={14} />
                    <span>Get Help</span>
                  </Button>
              </div>
            )}
            {collapsed && <LifeBuoy size={20} className="cursor-pointer" onClick={() => setIsReportFormOpen(true)} />}
          </div>
        </div>
        
        {/* User Footer */}
        <div className="p-2 border-t border-sidebar-border flex-shrink-0">
          {!collapsed && user && (
            <div className="flex items-center space-x-2 mb-2 p-2">
              <Avatar className="w-8 h-8 border">
                <AvatarImage src={profileImage} className="object-cover" />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{fullName}</p>
                <p className="text-[10px] text-muted-foreground truncate uppercase">{user?.role}</p>
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

      {isReportFormOpen && <ProblemReportModal onClose={() => setIsReportFormOpen(false)} />}
    </>
  );
};

export default Sidebar;