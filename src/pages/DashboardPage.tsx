import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Package, Layers, Box, Clock, PlusCircle, RefreshCw,
  Archive, AlertTriangle, XCircle, TrendingUp, TrendingDown,
  CheckCircle, Zap, ShieldCheck, Hourglass, DollarSign
} from 'lucide-react';
import SEOHelmet from '@/components/SEOHelmet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '@/functions/dashboard';
import { DashboardStats } from '@/types/interface';

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
    const loadStats = async () => {
      if (!user?.businessId) return;
      setLoading(true);
      try {
        const branchId = typeof user.branch === 'string' ? user.branch : user.branch || null;
        const data = await getDashboardStats(user.businessId, user.role, branchId);
        setStats(data);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (user) loadStats();
  }, [user]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <>
      <SEOHelmet title="Dashboard - SmartStock" description="Inventory Management" />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8 space-y-8 transition-colors duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Inventory Console <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">Stock Performance Analytics</p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-[#1e293b] p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div className="pr-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Status</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500">Live Connection</p>
            </div>
          </div>
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BigProCard title="Total Products" value={stats.totalProducts} subtitle="All products" icon={<Package />} color="indigo" />
          <BigProCard title="Categories" value={stats.totalCategories} subtitle="Unique categories" icon={<Layers />} color="blue" />
          <BigProCard title="Models" value={stats.totalModels} subtitle="Unique models" icon={<Box />} color="violet" />
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BigProCard
            title="Net Profit"
            value={stats.totalNetProfit.toLocaleString()}
            subtitle="Total RWF"
            icon={<DollarSign />}
            color={stats.totalNetProfit >= 0 ? "green" : "red"}
          />
          <BigProCard
            title="Stock Value"
            value={stats.totalStockValue.toLocaleString()}
            subtitle="Confirmed RWF"
            icon={<Package />}
            color="blue"
          />
          <BigProCard
            title="Total Loss"
            value={stats.totalLoss.toLocaleString()}
            subtitle="From Sales RWF"
            icon={<DollarSign />}
            color="red"
          />
        </div>

        {/* Secondary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <SmallProCard title="Added Today" value={stats.productsAddedToday} subtitle="New today" icon={<PlusCircle className="text-emerald-600" />} highlight />
          <SmallProCard title="Added This Week" value={stats.productsAddedThisWeek} subtitle="This week" icon={<TrendingUp className="text-blue-600" />} />
          <SmallProCard title="Added This Month" value={stats.productsAddedThisMonth} subtitle="This month" icon={<TrendingUp className="text-violet-600" />} />
          <SmallProCard title="Updated Today" value={stats.productsUpdatedToday} subtitle="Updated today" icon={<RefreshCw className="text-orange-600" />} />

          <SmallProCard title="Never Updated" value={stats.productsNeverUpdated} subtitle="No updates" icon={<Clock className="text-slate-400" />} />
          <SmallProCard title="In Stock" value={stats.activeProducts} subtitle="Confirmed stock" icon={<CheckCircle className="text-emerald-600" />} />
          <SmallProCard
            title="Pending Actions"
            value={stats.pendingConfirmationCount}
            subtitle="Awaiting approval"
            icon={<Hourglass className="text-amber-600" />}
            danger={stats.pendingConfirmationCount > 0}
          />
          <SmallProCard title="Sold" value={stats.soldProducts} subtitle="Total sold" icon={<TrendingUp className="text-emerald-600" />} />

          <SmallProCard title="Restored" value={stats.restoredProducts} subtitle="Returned" icon={<Archive className="text-indigo-600" />} />
          <SmallProCard title="Deleted" value={stats.deletedProducts} subtitle="In trash" icon={<XCircle className="text-rose-600" />} />
          <SmallProCard title="Low Stock" value={stats.lowStockProducts} subtitle="≤5 units" icon={<AlertTriangle className="text-amber-600" />} danger={stats.lowStockProducts > 0} />
          <SmallProCard title="Out of Stock" value={stats.outOfStockProducts} subtitle="0 units" icon={<XCircle className="text-rose-600" />} danger={stats.outOfStockProducts > 0} />
          <SmallProCard title="Avg Stock" value={stats.averageStockPerProduct} subtitle="Per product" icon={<Package className="text-cyan-600" />} />
        </div>

        {/* Stock Highlights */}
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

/* --- Reusable Components (Updated Styles) --- */
const BigProCard = ({ title, value, subtitle, icon, color }: any) => {
  const colors: any = {
    indigo: "bg-indigo-600 dark:bg-indigo-700",
    blue: "bg-blue-600 dark:bg-blue-700",
    violet: "bg-violet-600 dark:bg-violet-700",
    green: "bg-emerald-600 dark:bg-emerald-700",
    red: "bg-rose-600 dark:bg-rose-700",
  };
  return (
    <Card className={`border-none shadow-lg ${colors[color] || colors.blue} text-white transition-all hover:scale-[1.01] hover:shadow-xl rounded-2xl overflow-hidden`}>
      <CardContent className="p-6 relative">
        {/* Subtle pattern or glow could be added here */}
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
            {React.cloneElement(icon, { className: "h-6 w-6 text-white" })}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">{title}</p>
            <h3 className="text-4xl font-black mt-2 tracking-tight">{value}</h3>
          </div>
        </div>
        <div className="relative z-10 pt-2 border-t border-white/10">
          <p className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center gap-2">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const SmallProCard = ({ title, value, subtitle, icon, highlight, danger }: any) => (
  <Card className={`border-none shadow-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-[#1e293b] rounded-2xl overflow-hidden`}>
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl transition-colors ${highlight ? 'bg-indigo-50 dark:bg-indigo-900/20' :
            danger ? 'bg-amber-50 dark:bg-amber-900/20' :
              'bg-slate-50 dark:bg-slate-800'
          }`}>
          {React.cloneElement(icon, { className: highlight ? "h-4 w-4 text-indigo-600" : danger ? "h-4 w-4 text-amber-600" : "h-4 w-4" })}
        </div>
        {highlight && <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">NEW</span>}
      </div>
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
      <p className={`text-2xl font-black mt-1 ${danger ? 'text-amber-600 dark:text-amber-500' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className="text-[10px] font-medium text-slate-400 mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

const HighlightCard = ({ type, name, quantity, icon, color }: any) => {
  const accent: any = color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
  const text: any = color === 'emerald' ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500';
  const bgAccent: any = color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-amber-50 dark:bg-amber-900/10';

  return (
    <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-[#1e293b] flex flex-col rounded-2xl group hover:shadow-lg transition-all">
      <CardContent className="p-0 flex flex-col h-full">
        <div className={`p-6 ${bgAccent} border-b border-slate-100 dark:border-slate-800`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`${color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'} p-2 rounded-lg`}>
              {React.cloneElement(icon, { className: `h-5 w-5 ${text}` })}
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{type}</p>
          </div>
          <p className="text-xl font-bold uppercase text-slate-900 dark:text-white leading-tight mt-2 line-clamp-2">{name || 'N/A'}</p>
        </div>

        <div className="p-6 flex justify-between items-center mt-auto bg-white dark:bg-[#1e293b]">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Stock level</p>
            <p className={`text-[10px] uppercase font-black tracking-tight mt-1 ${text}`}>Inventory Count</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-black ${text}`}>{quantity}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Units</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardPage;