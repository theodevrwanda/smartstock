import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Package, Layers, Box, Clock, PlusCircle, RefreshCw,
  Archive, AlertTriangle, XCircle, TrendingUp, TrendingDown,
  CheckCircle, Zap, ShieldCheck, Hourglass, DollarSign,
  Calendar as CalendarIcon, Award
} from 'lucide-react';
import SEOHelmet from '@/components/SEOHelmet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDashboardStats } from '@/functions/dashboard';
import { DashboardStats } from '@/types/interface';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const DashboardPage: React.FC = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: t('error'), description: t('enter_details_login'), variant: 'destructive' });
      navigate('/login');
    }
  }, [authLoading, user, toast, navigate, t]);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.businessId) return;
      setLoading(true);
      try {
        const branchId = typeof user.branch === 'string' ? user.branch : null;
        const data = await getDashboardStats(user.businessId, user.role, branchId);
        setStats(data);
      } catch (err) {
        toast({ title: t('error'), description: 'Failed to load dashboard data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (user) loadStats();
  }, [user, t, toast]);

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
      <SEOHelmet title={`${t('dashboard_title')} - SmartStock`} description="Inventory Management" />

      <div className="min-h-screen bg-background p-6 md:p-8 space-y-8 transition-colors duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {t('inventory_console')} <Zap className="h-6 w-6 text-primary" />
            </h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">
              {t('real_time_analytics')}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-secondary p-3 rounded-2xl shadow-sm border border-border">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="pr-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t('system_status')}</p>
              <p className="text-sm font-bold text-primary">{t('live_connection')}</p>
            </div>
          </div>
        </div>

        {/* Date Context */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 bg-secondary border-dashed border-border flex items-center gap-2">
            <CalendarIcon size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">{t('dashboard_context')}</span>
            <span className="font-semibold text-foreground">{format(new Date(), 'MMMM do, yyyy')}</span>
          </Badge>
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BigProCard title={t('total_products')} value={stats.totalProducts} subtitle={t('all_products')} icon={<Package />} color="indigo" />
          <BigProCard title={t('categories')} value={stats.totalCategories} subtitle={t('unique_categories')} icon={<Layers />} color="blue" />
          <BigProCard title={t('models')} value={stats.totalModels} subtitle={t('unique_models')} icon={<Box />} color="violet" />
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BigProCard
            title={t('total_net_profit')}
            value={stats.totalNetProfit.toLocaleString()}
            subtitle={t('net_profit_subtitle')}
            icon={<DollarSign />}
            color={stats.totalNetProfit >= 0 ? "green" : "red"}
          />
          <BigProCard
            title={t('current_stock_value')}
            value={stats.totalStockValue.toLocaleString()}
            subtitle={t('total_stock_value_subtitle')}
            icon={<Package />}
            color="emerald"
          />
          <BigProCard
            title={t('total_loss')}
            value={stats.totalLoss.toLocaleString()}
            subtitle={t('total_loss_subtitle')}
            icon={<TrendingDown />}
            color="red"
          />
        </div>

        {/* Secondary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <SmallProCard title={t('added_today')} value={stats.productsAddedToday} subtitle={t('new_today')} icon={<PlusCircle className="text-emerald-600" />} highlight />
          <SmallProCard title={t('added_this_week')} value={stats.productsAddedThisWeek} subtitle={t('this_week')} icon={<TrendingUp className="text-gray-900 dark:text-gray-100" />} />
          <SmallProCard title={t('added_this_month')} value={stats.productsAddedThisMonth} subtitle={t('this_month')} icon={<TrendingUp className="text-violet-600" />} />
          <SmallProCard title={t('updated_today')} value={stats.productsUpdatedToday} subtitle={t('updated_at')} icon={<RefreshCw className="text-orange-600" />} />

          <SmallProCard title={t('never_updated')} value={stats.productsNeverUpdated} subtitle="No updates" icon={<Clock className="text-slate-400" />} />
          <SmallProCard title={t('in_stock')} value={stats.activeProducts} subtitle={t('min_qty')} icon={<CheckCircle className="text-emerald-600" />} />
          <SmallProCard
            title={t('pending_actions')}
            value={stats.pendingConfirmationCount}
            subtitle={t('pending')}
            icon={<Hourglass className="text-amber-600" />}
            danger={stats.pendingConfirmationCount > 0}
          />
          <SmallProCard title={t('sold')} value={stats.soldProducts} subtitle={t('total_products')} icon={<TrendingUp className="text-emerald-600" />} />

          <SmallProCard title={t('restored')} value={stats.restoredProducts} subtitle={t('restored_label')} icon={<Archive className="text-indigo-600" />} />
          <SmallProCard title={t('deleted')} value={stats.deletedProducts} subtitle={t('trash_label')} icon={<XCircle className="text-rose-600" />} />
          <SmallProCard title={t('low_stock')} value={stats.lowStockProducts} subtitle="≤10 units" icon={<AlertTriangle className="text-amber-600" />} danger={stats.lowStockProducts > 0} />
          <SmallProCard title={t('out_of_stock')} value={stats.outOfStockProducts} subtitle="0 units" icon={<XCircle className="text-rose-600" />} danger={stats.outOfStockProducts > 0} />
          <SmallProCard title={t('avg_stock')} value={stats.averageStockPerProduct.toFixed(1)} subtitle={t('per_product')} icon={<Package className="text-cyan-600" />} />
        </div>

        {/* Stock Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HighlightCard
            type={t('most_stocked')}
            name={stats.mostStockedProduct.name}
            quantity={stats.mostStockedProduct.quantity}
            value={stats.mostStockedProduct.value}
            icon={<TrendingUp />}
            color="emerald"
          />
          <HighlightCard
            type={t('least_stocked')}
            name={stats.leastStockedProduct.name}
            quantity={stats.leastStockedProduct.quantity}
            value={stats.leastStockedProduct.value}
            icon={<TrendingDown />}
            color="amber"
          />
        </div>
      </div>
    </>
  );
};

/* --- Reusable Components --- */
const BigProCard = ({ title, value, subtitle, icon, color }: any) => {
  const colors: any = {
    indigo: "bg-indigo-600",
    blue: "bg-primary text-primary-foreground",
    violet: "bg-violet-600",
    emerald: "bg-emerald-600",
    green: "bg-emerald-600",
    red: "bg-rose-600",
  };
  return (
    <Card className={`border-none shadow-lg ${colors[color] || colors.blue} ${color === 'blue' ? '' : 'text-white'} transition-all rounded-2xl overflow-hidden`}>
      <CardContent className="p-6 relative">
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={`p-3 rounded-xl ${color === 'blue' ? 'bg-primary-foreground/10' : 'bg-white/10'} backdrop-blur-sm`}>
            {React.cloneElement(icon, { className: `h-6 w-6 ${color === 'blue' ? 'text-primary-foreground' : 'text-white'}` })}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">{title}</p>
            <h3 className="text-4xl font-black mt-2 tracking-tight">{value}</h3>
          </div>
        </div>
        <div className={`relative z-10 pt-2 border-t ${color === 'blue' ? 'border-primary-foreground/10' : 'border-white/10'}`}>
          <p className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center gap-2">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const SmallProCard = ({ title, value, subtitle, icon, highlight, danger }: any) => (
  <Card className={`border-none group bg-white dark:bg-secondary rounded-2xl overflow-hidden`}>
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl transition-colors ${highlight ? 'bg-primary/10' :
          danger ? 'bg-destructive/10' :
            'bg-secondary'
          }`}>
          {React.cloneElement(icon, { className: highlight ? "h-4 w-4 text-primary" : danger ? "h-4 w-4 text-destructive" : "h-4 w-4" })}
        </div>
        {highlight && <span className="text-[9px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full">NEW</span>}
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
      <p className={`text-2xl font-black mt-1 ${danger ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

const HighlightCard = ({ type, name, quantity, value, icon, color }: any) => {
  const accent: any = color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
  const text: any = color === 'emerald' ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500';
  const bgAccent: any = color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-amber-50 dark:bg-amber-900/10';

  return (
    <Card className="overflow-hidden border-none shadow-md bg-card flex flex-col rounded-2xl group hover:shadow-lg transition-all">
      <CardContent className="p-0 flex flex-col h-full">
        <div className={`p-6 ${bgAccent} border-b border-border`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`${color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'} p-2 rounded-lg`}>
              {React.cloneElement(icon, { className: `h-5 w-5 ${text}` })}
            </div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{type}</p>
          </div>
          <p className="text-xl font-bold uppercase text-foreground leading-tight mt-2 line-clamp-2">{name || 'N/A'}</p>
        </div>

        <div className="p-6 flex justify-between items-center mt-auto bg-card">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Stock</p>
            <p className={`text-[10px] uppercase font-black tracking-tight mt-1 ${text}`}>Inventory Count</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-black ${text}`}>{quantity}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Units</p>
            {value && (
              <p className={`text-xs font-bold mt-1 ${text}`}>
                {value.toLocaleString()} RWF
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardPage;