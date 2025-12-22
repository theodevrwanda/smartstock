import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, Layers, Box, Clock, PlusCircle, RefreshCw, 
  Archive, AlertTriangle, XCircle, TrendingUp, TrendingDown, 
  CheckCircle, Zap, ShieldCheck 
} from 'lucide-react';
import SEOHelmet from '@/components/SEOHelmet';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalModels: number;
  productsAddedToday: number;
  productsAddedThisWeek: number;
  productsAddedThisMonth: number;
  productsAddedCustomRange: number;
  productsUpdatedToday: number;
  productsUpdatedThisMonth: number;
  productsNeverUpdated: number;
  activeProducts: number;
  soldProducts: number;
  restoredProducts: number;
  deletedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  mostStockedProduct: { name: string; quantity: number };
  leastStockedProduct: { name: string; quantity: number };
  averageStockPerProduct: number;
  totalStockQuantity: number;
  damagedProducts: number;
  productsWithSupplier: number;
  productsWithoutSupplier: number;
}

const MOCK_DATA: DashboardStats = {
  totalProducts: 1,
  totalCategories: 1,
  totalModels: 1,
  productsAddedToday: 1,
  productsAddedThisWeek: 1,
  productsAddedThisMonth: 1,
  productsAddedCustomRange: 0,
  productsUpdatedToday: 0,
  productsUpdatedThisMonth: 0,
  productsNeverUpdated: 1,
  activeProducts: 1,
  soldProducts: 0,
  restoredProducts: 0,
  deletedProducts: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  mostStockedProduct: { name: "macbook", quantity: 100 },
  leastStockedProduct: { name: "macbook", quantity: 100 },
  averageStockPerProduct: 100,
  totalStockQuantity: 100,
  damagedProducts: 0,
  productsWithSupplier: 1,
  productsWithoutSupplier: 0,
};

const DashboardPage: React.FC = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
      navigate('/login');
    }
  }, [authLoading, user, toast, navigate]);

  useEffect(() => {
    const load = async () => {
      await new Promise(r => setTimeout(r, 600));
      setStats(MOCK_DATA);
      setLoading(false);
    };
    if (user) load();
  }, [user]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-600 border-t-indigo-600"></div>
          <p className="text-indigo-600 font-bold animate-pulse text-sm uppercase tracking-widest">Pixelmart Loading...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <>
      <SEOHelmet title="Dashboard - Pixelmart EMS" description="Inventory Management" canonical="https://pixelmartrw.pages.dev/dashboard" />

      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0f172a] p-4 md:p-8 space-y-8 transition-colors duration-300">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Inventory Console <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold text-xs uppercase tracking-wider">Stock Performance Analytics</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-[#1e293b] p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
             <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
             </div>
             <div className="pr-4">
                <p className="text-[10px] text-slate-400 font-black uppercase">Data Engine</p>
                <p className="text-xs font-bold text-emerald-500">Live Connection</p>
             </div>
          </div>
        </div>

        {/* Primary Row: Essential Growth Stats - Big Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BigProCard 
            title="Total Products" 
            value={stats.totalProducts} 
            subtitle="Products in branch" 
            icon={<Package />} 
            color="indigo" 
          />
          <BigProCard 
            title="Total Categories" 
            value={stats.totalCategories} 
            subtitle="Product categories" 
            icon={<Layers />} 
            color="blue" 
          />
          <BigProCard 
            title="Total Models" 
            value={stats.totalModels} 
            subtitle="Product variants" 
            icon={<Box />} 
            color="violet" 
          />
        </div>

        {/* Secondary Grid: Detailed Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SmallProCard title="Added Today" value={stats.productsAddedToday} subtitle="Added today" icon={<PlusCircle className="text-emerald-500" />} highlight />
          <SmallProCard title="Added This Week" value={stats.productsAddedThisWeek} subtitle="Added this week" icon={<TrendingUp className="text-blue-500" />} />
          <SmallProCard title="Added This Month" value={stats.productsAddedThisMonth} subtitle="Added this month" icon={<TrendingUp className="text-violet-500" />} />
          <SmallProCard title="Updated Today" value={stats.productsUpdatedToday} subtitle="Updated today" icon={<RefreshCw className="text-orange-500" />} />
          
          <SmallProCard title="Never Updated" value={stats.productsNeverUpdated} subtitle="Never updated" icon={<Clock className="text-slate-400" />} />
          <SmallProCard title="Active Products" value={stats.activeProducts} subtitle="In stock" icon={<CheckCircle className="text-emerald-500" />} />
          <SmallProCard title="Sold Products" value={stats.soldProducts} subtitle="Total sold" icon={<TrendingUp className="text-emerald-500" />} />
          <SmallProCard title="Restored Products" value={stats.restoredProducts} subtitle="Restored" icon={<Archive className="text-indigo-500" />} />
          
          <SmallProCard title="Deleted Products" value={stats.deletedProducts} subtitle="Archived" icon={<XCircle className="text-rose-500" />} />
          <SmallProCard title="Low Stock" value={stats.lowStockProducts} subtitle="Below threshold" icon={<AlertTriangle className="text-amber-500" />} danger={stats.lowStockProducts > 0} />
          <SmallProCard title="Out of Stock" value={stats.outOfStockProducts} subtitle="No stock" icon={<XCircle className="text-rose-600" />} danger={stats.outOfStockProducts > 0} />
          <SmallProCard title="System Health" value="100%" subtitle="Optimized" icon={<ShieldCheck className="text-emerald-500" />} />
        </div>

        {/* Bottom Section: Most/Least Stocked Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HighlightCard 
            type="MOST STOCKED PRODUCT" 
            name={stats.mostStockedProduct.name} 
            quantity={stats.mostStockedProduct.quantity} 
            icon={<TrendingUp />} 
            color="emerald"
          />
          <HighlightCard 
            type="LEAST STOCKED PRODUCT" 
            name={stats.leastStockedProduct.name} 
            quantity={stats.leastStockedProduct.quantity} 
            icon={<TrendingDown />} 
            color="amber"
          />
        </div>
      </div>
    </>
  );
};

/* --- Sub-Components with Solid Colors & Smooth Pro Look --- */

const BigProCard = ({ title, value, subtitle, icon, color }: any) => {
  const colors: any = {
    indigo: "bg-indigo-600 dark:bg-indigo-700",
    blue: "bg-blue-600 dark:bg-blue-700",
    violet: "bg-violet-600 dark:bg-violet-700",
  };
  return (
    <Card className={`border-none shadow-lg ${colors[color]} text-white transition-transform hover:scale-[1.02]`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-white rounded-lg">
            {React.cloneElement(icon, { className: `h-5 w-5 ${color === 'indigo' ? 'text-indigo-600' : color === 'blue' ? 'text-blue-600' : 'text-violet-600'}` })}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
            <h3 className="text-4xl font-black mt-1">{value}</h3>
          </div>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-tight opacity-90">{subtitle}</p>
      </CardContent>
    </Card>
  );
};

const SmallProCard = ({ title, value, subtitle, icon, highlight, danger }: any) => (
  <Card className={`border-none shadow-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-[#1e293b]`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-1.5 rounded-md ${highlight ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
          {React.cloneElement(icon, { className: highlight ? "h-3.5 w-3.5 text-white" : "h-3.5 w-3.5" })}
        </div>
        {highlight && <span className="text-[8px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">NEW</span>}
      </div>
      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">{title}</p>
      <p className={`text-xl font-black mt-0.5 ${danger ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase">{subtitle}</p>
    </CardContent>
  </Card>
);

const HighlightCard = ({ type, name, quantity, icon, color }: any) => {
  const accent: any = color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
  const text: any = color === 'emerald' ? 'text-emerald-500' : 'text-amber-500';
  
  return (
    <Card className="overflow-hidden border-none shadow-xl bg-white dark:bg-[#1e293b] flex flex-col">
       <div className={`h-1.5 ${accent} w-full`} />
       <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
             <div className={`${text} p-1`}>{React.cloneElement(icon, { className: "h-5 w-5" })}</div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{type}</p>
          </div>
          <div className="flex justify-between items-end mt-auto">
            <div>
              <p className="text-2xl font-black uppercase text-slate-900 dark:text-white leading-tight">{name}</p>
              <p className={`${text} text-[10px] font-black uppercase tracking-tighter mt-1`}>In-System Inventory</p>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-black ${text}`}>{quantity}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Total Units</p>
            </div>
          </div>
       </CardContent>
    </Card>
  );
};

export default DashboardPage;