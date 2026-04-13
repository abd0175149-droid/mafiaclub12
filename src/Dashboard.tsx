import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from './lib/api';
import Swal from 'sweetalert2';
import { collection, query, onSnapshot, orderBy, Timestamp, addDoc, updateDoc, doc, deleteDoc, setDoc, where, writeBatch, getDocs, db, handleFirestoreError, OperationType, createNotification, notifyAllAdmins, updatePassword, updateProfile, auth as firebaseAuth } from './lib/firebase-compat';
import { Activity, Booking, Cost, Notification, UserSettings, FoundationalCost, StaffMember, Location, LocationOffer, BookingOfferItem, normalizeOffer } from './types';
import LocationsView from './views/LocationsView';
import FinanceView from './views/FinanceView';
import ActivityDetails from './views/ActivityDetails';
import { useAuth } from './AuthContext';
import ProfileTab from './views/ProfileSettings';
import UserManagementTab from './views/UserManagementTab';
import { ImageCropper } from '@/components/ImageCropper';
import { Button } from '@/components/ui/button';
import { PaginationControls, usePagination } from '@/components/Pagination';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Users, DollarSign, Calendar as CalendarIcon, TrendingUp, TrendingDown,
  Trash2, Pencil, CheckCircle2, Clock, Bell, Settings as SettingsIcon,
  LayoutDashboard, AlertTriangle, Info, Check, PieChart as PieChartIcon,
  Building2, User as UserIcon, LogOut, Shield, Key, Menu, X, Eye, EyeOff, Loader2, Gift, Filter
} from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const safeDate = (date: any) => {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date.seconds !== undefined) return new Date(date.seconds * 1000);
  return new Date(date);
};

const CURRENCY = 'د.أ';

const STATUS_LABELS: Record<string, string> = {
  planned: 'مخطط له',
  active: 'نشط حالياً',
  completed: 'مكتمل',
  cancelled: 'ملغي'
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-neutral-50 text-neutral-700 border-neutral-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
};

export default function Dashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { profile, logout } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [foundationalCosts, setFoundationalCosts] = useState<FoundationalCost[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingActivityMain, setEditingActivityMain] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  // Activity filters
  const [actFilterStatus, setActFilterStatus] = useState<string>('all');
  const [actFilterDateFrom, setActFilterDateFrom] = useState('');
  const [actFilterDateTo, setActFilterDateTo] = useState('');

  const isAdmin = profile?.role === 'admin';
  const isLocationOwner = profile?.role === 'location_owner';

  const fetchAll = useCallback(async () => {
    try {
      let act = await apiGet<Activity[]>('/activities');
      const book = await apiGet<Booking[]>('/bookings');
      const cos = await apiGet<Cost[]>('/costs');
      const found = await apiGet<FoundationalCost[]>('/foundational');
      const notif = await apiGet<Notification[]>('/notifications');
      const sett = await apiGet<UserSettings>('/settings');
      const locs = await apiGet<Location[]>('/locations').catch(() => []);

      const now = new Date();
      act = await Promise.all(act.map(async (a) => {
        if (a.status === 'completed' || a.status === 'cancelled') return a;
        const activityDate = safeDate(a.date);
        if (!activityDate) return a;
        
        const nextDay = new Date(activityDate);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0,0,0,0);
        
        let newStatus: Activity['status'] = a.status;
        if (now >= nextDay) newStatus = 'completed';
        else if (now >= activityDate) newStatus = 'active';
        else newStatus = 'planned';
        
        if (newStatus !== a.status) {
          try {
            await apiPut('/activities/' + a.id, { status: newStatus });
            return { ...a, status: newStatus };
          } catch(e) { console.error('Failed to auto-update activity status', e); }
        }
        return a;
      }));

      setActivities(act); setBookings(book); setCosts(cos);
      setFoundationalCosts(found); setNotifications(notif); setSettings(sett);
      setLocations(locs || []);
      if (isAdmin) { const s = await apiGet<StaffMember[]>('/staff'); setStaff(s); }
    } catch (err) { console.error('Fetch error:', err); }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 30000); return () => clearInterval(iv); }, [fetchAll]);

  // Helper: calculate club revenue from a booking (uses offerItems if available)
  const getBookingClubRevenue = useCallback((b: Booking) => {
    if (!b.isPaid) return 0;
    if (b.offerItems && b.offerItems.length > 0) {
      return b.offerItems.reduce((sum, item) => sum + (item.clubShare * item.quantity), 0);
    }
    return b.paidAmount;
  }, []);

  const getBookingVenueRevenue = useCallback((b: Booking) => {
    if (!b.isPaid) return 0;
    if (b.offerItems && b.offerItems.length > 0) {
      return b.offerItems.reduce((sum, item) => sum + (item.venueShare * item.quantity), 0);
    }
    return 0;
  }, []);

  // Financial Calculations (memoized) [PERF-02, ARCH-03]
  const totalRevenue = useMemo(() => bookings.reduce((sum, b) => sum + getBookingClubRevenue(b), 0), [bookings, getBookingClubRevenue]);
  const totalCosts = useMemo(() => costs.reduce((sum, c) => sum + c.amount, 0), [costs]);
  const netProfit = totalRevenue - totalCosts;

  const getActivityStats = useMemo(() => {
    const statsMap = new Map<string, { revenue: number; venueRevenue: number; expense: number; profit: number; attendees: number; freeAttendees: number; paidAttendees: number }>();
    activities.forEach(activity => {
      const activityBookings = bookings.filter(b => b.activityId === activity.id);
      const activityCosts = costs.filter(c => c.activityId === activity.id);
      const revenue = activityBookings.reduce((sum, b) => sum + getBookingClubRevenue(b), 0);
      const venueRevenue = activityBookings.reduce((sum, b) => sum + getBookingVenueRevenue(b), 0);
      const expense = activityCosts.reduce((sum, c) => sum + c.amount, 0);
      const attendees = activityBookings.reduce((sum, b) => sum + b.count, 0);
      const freeAttendees = activityBookings.filter(b => b.isFree).reduce((sum, b) => sum + b.count, 0);
      const paidAttendees = activityBookings.filter(b => b.isPaid && !b.isFree).reduce((sum, b) => sum + b.count, 0);
      statsMap.set(activity.id, { revenue, venueRevenue, expense, profit: revenue - expense, attendees, freeAttendees, paidAttendees });
    });
    return (activityId: string) => statsMap.get(activityId) || { revenue: 0, venueRevenue: 0, expense: 0, profit: 0, attendees: 0, freeAttendees: 0, paidAttendees: 0 };
  }, [activities, bookings, costs, getBookingClubRevenue, getBookingVenueRevenue]);

  const upcomingActivities = useMemo(() => activities
    .filter(a => isAfter(safeDate(a.date)!, startOfDay(new Date())) && a.status !== 'cancelled')
    .sort((a, b) => safeDate(a.date)!.getTime() - safeDate(b.date)!.getTime()), [activities]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (actFilterStatus !== 'all') result = result.filter(a => a.status === actFilterStatus);
    if (actFilterDateFrom) { const from = new Date(actFilterDateFrom); from.setHours(0,0,0,0); result = result.filter(a => new Date(a.date) >= from); }
    if (actFilterDateTo) { const to = new Date(actFilterDateTo); to.setHours(23,59,59,999); result = result.filter(a => new Date(a.date) <= to); }
    return result;
  }, [activities, actFilterStatus, actFilterDateFrom, actFilterDateTo]);
  const activitiesPagination = usePagination(filteredActivities, 6);

  const activeBookingsCount = useMemo(() => bookings.filter(b => {
    const activity = activities.find(a => a.id === b.activityId);
    return activity && isAfter(safeDate(activity.date)!, startOfDay(new Date()));
  }).reduce((sum, b) => sum + b.count, 0), [bookings, activities]);

  const chartData = useMemo(() => activities.slice(0, 5).reverse().map(a => {
    const stats = getActivityStats(a.id);
    return {
      name: a.name,
      profit: stats.profit,
      revenue: stats.revenue,
      expense: stats.expense
    };
  }), [activities, getActivityStats]);

  const last5ActivitiesStats = useMemo(() => activities.slice(0, 5).reverse().map(a => {
    const stats = getActivityStats(a.id);
    const unpaid = stats.attendees - stats.freeAttendees - stats.paidAttendees;
    return {
      name: a.name,
      "مدفوع": stats.paidAttendees,
      "مجاني": stats.freeAttendees,
      "غير مدفوع": unpaid > 0 ? unpaid : 0
    };
  }), [activities, getActivityStats]);

  const upcomingBookingsPieData = useMemo(() => {
    const upcomingActsIds = upcomingActivities.map(a => a.id);
    const relatedBookings = bookings.filter(b => upcomingActsIds.includes(b.activityId));
    
    const paid = relatedBookings.filter(b => b.isPaid && !b.isFree).reduce((s, b) => s + b.count, 0);
    const free = relatedBookings.filter(b => b.isFree).reduce((s, b) => s + b.count, 0);
    const unpaid = relatedBookings.filter(b => !b.isPaid && !b.isFree).reduce((s, b) => s + b.count, 0);

    return [
      { name: 'مدفوع', value: paid, color: '#10b981' },
      { name: 'مجاني', value: free, color: '#3b82f6' },
      { name: 'غير مدفوع', value: unpaid, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [upcomingActivities, bookings]);

  const toggleLayoutItem = async (item: string) => {
    if (!settings) return;
    const newLayout = settings.dashboardLayout.includes(item)
      ? settings.dashboardLayout.filter(i => i !== item)
      : [...settings.dashboardLayout, item];
    await apiPut('/settings', { dashboardLayout: newLayout });
    setSettings({ ...settings, dashboardLayout: newLayout });
  };

  const updateNotificationSetting = async (key: keyof UserSettings['notifications'], value: boolean) => {
    if (!settings) return;
    const newNotif = { ...settings.notifications, [key]: value };
    await apiPut('/settings', { notifications: newNotif });
    setSettings({ ...settings, notifications: newNotif });
  };

  const handleDeleteActivity = async (activity: Activity) => {
    const result = await Swal.fire({
      title: 'هل تريد حذف هذا النشاط؟',
      text: `سيتم حذف "${activity.name}" وجميع الحجوزات والتكاليف المرتبطة.`,
      icon: 'warning',
      input: 'checkbox',
      inputValue: 0,
      inputPlaceholder: 'حذف المجلد المرتبط في Google Drive أيضاً؟',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      reverseButtons: true
    });
    if (!result.isConfirmed) return;
    try {
      await apiDelete(`/activities/${activity.id}?deleteDriveFolder=${result.value ? 'true' : 'false'}`);
      Swal.fire({ title: 'تم الحذف!', text: `تم حذف "${activity.name}" بنجاح`, icon: 'success', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (err: any) {
      Swal.fire({ title: 'خطأ', text: err.message || 'حدث خطأ أثناء الحذف', icon: 'error' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;


  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden relative" dir="rtl">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`bg-neutral-900 border-l border-neutral-800 text-white w-64 flex-shrink-0 flex flex-col transition-all duration-300 md:relative md:flex ${isMobileMenuOpen ? 'fixed inset-y-0 right-0 z-50 flex' : 'hidden'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-neutral-800">
          <div className="bg-neutral-800 p-2.5 rounded-xl text-white shadow-lg">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Mafia Club</h1>
            <p className="text-neutral-400 text-xs text-right">لوحة الإدارة</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'نظرة عامة', reqPerm: null },
            { id: 'activities', icon: CalendarIcon, label: 'الأنشطة المجدولة', reqPerm: 'activities' },
            { id: 'bookings', icon: Users, label: 'قاعدة الحجوزات', reqPerm: 'bookings' },
            { id: 'finances', icon: DollarSign, label: 'المالية الشاملة', reqPerm: 'finances' },
            ...(!isLocationOwner ? [{ id: 'locations', icon: PieChartIcon, label: 'أماكن الفعاليات', reqPerm: 'locations' }] : []),
          ].map(tc => {
            const hasPerm = isAdmin || isLocationOwner || !tc.reqPerm || (Array.isArray(profile?.permissions) && profile.permissions.includes(tc.reqPerm));
            if (!hasPerm) return null;
            return (
              <button
                key={tc.id}
                onClick={() => { setActiveTab(tc.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tc.id ? 'bg-neutral-800 text-white shadow-md border border-neutral-700/50' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'}`}
              >
                <tc.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold text-sm">{tc.label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <button
              onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-neutral-800 text-white shadow-md border border-neutral-700/50' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'}`}
            >
              <Shield className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span className="font-bold text-sm text-emerald-400">إدارة الإداريين</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full min-w-0 bg-neutral-50/50 relative">
        {/* Top Navbar */}
        <header className="bg-white border-b border-neutral-200 p-4 sticky top-0 z-30 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4 w-full justify-between md:justify-end flex-row-reverse md:flex-row">
            {/* Mobile Branding inside Navbar */}
            <div className="flex items-center gap-2 md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6 text-neutral-900" />
              </Button>
              <span className="font-bold text-lg text-neutral-900 ml-2">Mafia Club</span>
            </div>

            {/* Desktop/Mobile User Controls */}
            <div className="flex items-center gap-3 dir-ltr">
              <NotificationCenter notifications={notifications} onUpdate={fetchAll} onNotificationClick={(n) => {
                if (n.type === 'new_booking') setActiveTab('bookings');
                else if (n.type === 'financial' || n.type === 'cost_alert') setActiveTab('finances');
                else if (n.type === 'new_location') setActiveTab('locations');
                
                if (n.targetId) {
                  setTimeout(() => {
                    const el = document.getElementById(`glow-${n.targetId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-4', 'ring-emerald-500', 'shadow-xl', 'shadow-emerald-500/30', 'transition-all', 'duration-500', 'scale-[1.02]');
                      setTimeout(() => {
                        el.classList.remove('ring-4', 'ring-emerald-500', 'shadow-xl', 'shadow-emerald-500/30', 'scale-[1.02]');
                      }, 3000);
                    }
                  }, 600);
                }
              }} />
              <div className="h-6 w-px bg-neutral-200 mx-1"></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all">
                    <div className="text-right hidden sm:block mr-2">
                      <p className="text-sm font-bold leading-none text-neutral-800">{profile?.displayName || 'مستخدم'}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{isAdmin ? 'مسؤول' : 'مدير'}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200 shrink-0">
                      {profile?.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-neutral-500" />}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-1 font-sans" dir="rtl">
                  <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}>
                    <SettingsIcon className="w-4 h-4 ml-2" /> إعدادات الحساب
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-rose-600 focus:bg-rose-50 py-2.5" onClick={() => logout()}>
                    <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

          <div className={activeTab === 'overview' && !selectedActivity ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <h2 className="text-2xl font-bold mb-6">نظرة عامة والتحليلات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {settings?.dashboardLayout.includes('revenue') && (
                <KPICard title="إجمالي الإيرادات" value={`${totalRevenue.toLocaleString()} د.أ`} icon={<TrendingUp className="text-emerald-500" />} subtitle={`من ${bookings.length} حجز`} />
              )}
              {settings?.dashboardLayout.includes('costs') && (
                <KPICard title="إجمالي التكاليف" value={`${totalCosts.toLocaleString()} د.أ`} icon={<TrendingDown className="text-rose-500" />} subtitle="تكاليف عامة وأنشطة" />
              )}
              {settings?.dashboardLayout.includes('profit') && (
                <KPICard title="صافي الربح" value={`${netProfit.toLocaleString()} د.أ`} icon={<DollarSign className="text-blue-500" />} subtitle="بعد خصم المصاريف" trend={netProfit >= 0 ? 'up' : 'down'} />
              )}
              {settings?.dashboardLayout.includes('bookings') && (
                <KPICard title="الحجوزات النشطة" value={activeBookingsCount.toString()} icon={<Users className="text-amber-500" />} subtitle="للأنشطة القادمة" />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              {/* Upcoming Activities */}
              <Card className="lg:col-span-2 border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" /> الأنشطة القادمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingActivities.length > 0 ? upcomingActivities.map(activity => {
                      const stats = getActivityStats(activity.id);
                      return (
                        <div key={activity.id} className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-xl hover:border-neutral-300 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="bg-neutral-900 text-white p-3 rounded-lg text-center min-w-[60px]">
                              <div className="text-xs uppercase">{format(safeDate(activity.date)!, 'MMM')}</div>
                              <div className="text-xl font-bold">{format(safeDate(activity.date)!, 'dd')}</div>
                            </div>
                            <div>
                              <h4 className="font-bold text-neutral-900">{activity.name}</h4>
                              <p className="text-sm text-neutral-500">{format(safeDate(activity.date)!, 'hh:mm a')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-xs text-neutral-500">الحضور</p>
                              <p className="font-bold">{stats.attendees}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-neutral-500">الحالة</p>
                              <Badge variant="outline" className={STATUS_COLORS[activity.status]}>{STATUS_LABELS[activity.status]}</Badge>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-8 text-neutral-400">لا توجد أنشطة قادمة حالياً</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Booking Status Chart (Upcoming) */}
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-blue-500" /> الدفع للأنشطة القادمة
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {activeTab === 'overview' && !selectedActivity && (
                    <>
                      {upcomingBookingsPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={upcomingBookingsPieData}
                              cx="50%"
                              cy="45%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {upcomingBookingsPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} شخص`, 'العدد']} />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full text-neutral-400 pb-8 space-y-2">
                          <PieChartIcon className="w-8 h-8 opacity-20" />
                          <p className="text-sm">لا توجد حجوزات لأنشطة قادمة حالياً</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Last 5 Activities Comparison Chart */}
            <Card className="border-none shadow-sm mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" /> إحصائية الحضور (لآخر 5 أنشطة)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                {activeTab === 'overview' && !selectedActivity && (
                  <ResponsiveContainer width="100%" height="100%">
                    {last5ActivitiesStats.length > 0 ? (
                      <BarChart data={last5ActivitiesStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="name" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                        <Bar dataKey="مدفوع" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="مجاني" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="غير مدفوع" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-neutral-400">لا توجد بيانات سابقة لعرضها</div>
                    )}
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className={activeTab === 'activities' && !selectedActivity ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <div className="flex flex-col" style={{ height: 'calc(100vh - 11rem)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">الأنشطة المجدولة</h2>
                  <p className="text-neutral-500 text-sm">إدارة الجلسات والفعاليات</p>
                </div>
                {!isLocationOwner && <ActivityForm locations={locations} fetchAll={fetchAll} />}
              </div>
              {/* Activity Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-neutral-50 p-2 rounded-xl border border-neutral-100 mb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
                  <Select value={actFilterStatus} onValueChange={setActFilterStatus}>
                    <SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="planned">مخطط</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input type="date" value={actFilterDateFrom} onChange={e => setActFilterDateFrom(e.target.value)} className="bg-white h-9 text-xs" placeholder="من تاريخ" />
                <Input type="date" value={actFilterDateTo} onChange={e => setActFilterDateTo(e.target.value)} className="bg-white h-9 text-xs" placeholder="إلى تاريخ" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{filteredActivities.length} من {activities.length} نشاط</span>
                  {(actFilterStatus !== 'all' || actFilterDateFrom || actFilterDateTo) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setActFilterStatus('all'); setActFilterDateFrom(''); setActFilterDateTo(''); }}>مسح</Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col flex-1 min-h-0 gap-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 content-start overflow-hidden">
                  {filteredActivities.length > 0 ? activitiesPagination.paginatedData.map(activity => (
                    <div key={activity.id}>
                      <ActivityCard 
                        activity={activity} 
                        stats={getActivityStats(activity.id)} 
                        onDelete={isLocationOwner ? undefined : (() => handleDeleteActivity(activity))} 
                        onStatusChange={isLocationOwner ? undefined : fetchAll} 
                        onSelect={isLocationOwner ? undefined : (() => setSelectedActivity(activity))} 
                        onEdit={isLocationOwner ? undefined : (() => setEditingActivityMain(activity))}
                      />
                    </div>
                  )) : (
                    <div className="col-span-full text-center py-8 text-neutral-400">
                      <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-base font-medium">لا توجد أنشطة حالياً</p>
                      <p className="text-sm">ابدأ بإضافة نشاط جديد</p>
                    </div>
                  )}
                </div>
                
                <PaginationControls
                  currentPage={activitiesPagination.currentPage}
                  totalPages={activitiesPagination.totalPages}
                  itemsPerPage={activitiesPagination.itemsPerPage}
                  totalItems={filteredActivities.length}
                  onPageChange={activitiesPagination.setCurrentPage}
                  onItemsPerPageChange={activitiesPagination.setItemsPerPage}
                  itemsPerPageOptions={[6, 9, 12, 24]}
                  label="نشاط"
                />
              </div>
            </div>
            {/* Edit Activity Dialog */}
            <Dialog open={!!editingActivityMain} onOpenChange={(o) => { if (!o) setEditingActivityMain(null); }}>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>تعديل النشاط</DialogTitle>
                </DialogHeader>
                {editingActivityMain && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    try {
                      const locationId = formData.get('locationId') as string;
                      await apiPut('/activities/' + editingActivityMain.id, {
                        name: formData.get('name') as string,
                        date: new Date(formData.get('date') as string).toISOString(),
                        description: formData.get('description'),
                        basePrice: Number(formData.get('basePrice')),
                        locationId: locationId && locationId !== 'none' ? Number(locationId) : null,
                        driveLink: formData.get('driveLink')
                      });
                      setEditingActivityMain(null);
                      toast.success('تم تحديث النشاط بنجاح');
                      fetchAll();
                    } catch (err: any) { toast.error(err.message || 'حدث خطأ عند التحديث'); }
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم النشاط</Label>
                      <Input name="name" required defaultValue={editingActivityMain.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input name="date" type="datetime-local" required defaultValue={format(safeDate(editingActivityMain.date) || new Date(), "yyyy-MM-dd'T'HH:mm")} />
                    </div>
                    <div className="space-y-2">
                      <Label>سعر التذكرة (د.أ)</Label>
                      <Input name="basePrice" type="number" required defaultValue={editingActivityMain.basePrice} />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Input name="description" defaultValue={editingActivityMain.description} />
                    </div>
                    <div className="space-y-2">
                      <Label>موقع الفعالية</Label>
                      <Select name="locationId" defaultValue={editingActivityMain.locationId?.toString() || "none"}>
                        <SelectTrigger><SelectValue placeholder="اختر المكان..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">غير محدد</SelectItem>
                          {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>رابط التعاون Google Drive (اختياري)</Label>
                      <Input name="driveLink" defaultValue={editingActivityMain.driveLink} dir="ltr" />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full">تحديث النشاط</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className={activeTab === 'bookings' && !selectedActivity ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <BookingsTabContent bookings={bookings} activities={activities} fetchAll={fetchAll} staff={staff} profile={profile} locations={locations} />
          </div>

          <div className={activeTab === 'finances' && !selectedActivity ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <FinanceView activities={activities} bookings={bookings} costs={costs} foundationalCosts={foundationalCosts} fetchData={fetchAll} staff={staff} locations={locations} />
          </div>

          <div className={activeTab === 'locations' && !selectedActivity ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <LocationsView />
          </div>

          <div className={activeTab === 'profile' && !selectedActivity ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ProfileTab />
              </div>
              <div>
                <Card className="border-none shadow-sm h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5 text-neutral-500" /> لوحة التحكم
                    </CardTitle>
                    <CardDescription>إعدادات واجهة المستخدم وتفضيلات العرض</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-neutral-900 border-b pb-2">عناصر النظرة العامة</h4>
                      {settings && [
                        { id: 'revenue', label: 'إجمالي الإيرادات' },
                        { id: 'costs', label: 'إجمالي التكاليف' },
                        { id: 'profit', label: 'صافي الربح' },
                        { id: 'bookings', label: 'الحجوزات النشطة' },
                      ].map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <Label className="cursor-pointer">{item.label}</Label>
                          <Switch
                            checked={settings.dashboardLayout.includes(item.id)}
                            onCheckedChange={() => toggleLayoutItem(item.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className={activeTab === 'users' && !selectedActivity ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
              <UserManagementTab users={staff} fetchAll={fetchAll} />
            </div>
          )}

          {/* Activity Details (rendered inside layout) */}
          {selectedActivity && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActivityDetails
                activity={selectedActivity}
                location={locations.find(l => l.id == selectedActivity.locationId) || null}
                bookings={bookings}
                costs={costs}
                onBack={() => setSelectedActivity(null)}
              />
            </div>
          )}
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}

function KPICard({ title, value, icon, subtitle, trend }: { title: string, value: string, icon: React.ReactNode, subtitle: string, trend?: 'up' | 'down' }) {
  return (
    <Card className="border-none shadow-sm bg-white overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-neutral-500">{title}</CardTitle>
        <div className="p-2 bg-neutral-50 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend && (
            trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />
          )}
          <p className="text-xs text-neutral-500">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationCenter({ notifications, onNotificationClick, onUpdate }: { notifications: Notification[], onNotificationClick?: (n: Notification) => void, onUpdate?: () => void }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (n: Notification) => {
    if (!n.read) {
      await apiPut('/notifications/' + n.id + '/read', {});
      if (onUpdate) onUpdate();
    }
    if (onNotificationClick) onNotificationClick(n);
  };

  const toggleReadStatus = async (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation();
    if (n.read) {
      await apiPut('/notifications/' + n.id + '/unread', {});
    } else {
      await apiPut('/notifications/' + n.id + '/read', {});
    }
    if (onUpdate) onUpdate();
  };

  const deleteNotification = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    await apiDelete('/notifications/' + id);
    if (onUpdate) onUpdate();
  };

  const markAllAsRead = async () => {
    await apiPut('/notifications/read-all', {});
    if (onUpdate) onUpdate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                {unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent className="w-[350px] p-0" align="end" dir="rtl">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-4 flex items-center justify-between">
            <span className="font-bold text-base">الإشعارات</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-auto p-0 text-blue-600 hover:text-blue-700" onClick={markAllAsRead}>تحديد الكل كمقروء</Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? notifications.map(n => (
            <div
              key={n.id}
              className={`group p-4 border-b border-neutral-100 hover:bg-neutral-50 transition-all cursor-pointer relative ${!n.read ? 'bg-blue-50/20' : 'opacity-70'}`}
              onClick={() => markAsRead(n)}
            >
              {!n.read && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-l-full" />}
              <div className="flex gap-4">
                <div className={`p-2 rounded-full h-fit flex-shrink-0 ${n.type === 'cost_alert' || n.type === 'foundational_cost' ? 'bg-rose-100 text-rose-600' :
                    n.type === 'new_booking' ? 'bg-emerald-100 text-emerald-600' :
                    n.type === 'new_activity' ? 'bg-purple-100 text-purple-600' :
                      'bg-blue-100 text-blue-600'
                  }`}>
                  {n.type === 'cost_alert' || n.type === 'foundational_cost' ? <AlertTriangle className="w-4 h-4" /> :
                    n.type === 'new_booking' ? <Users className="w-4 h-4" /> :
                    n.type === 'new_activity' ? <CalendarIcon className="w-4 h-4" /> :
                      <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm tracking-tight ${!n.read ? 'font-bold text-neutral-900' : 'font-medium text-neutral-600'}`}>{n.title}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-blue-500 hover:bg-blue-50" onClick={(e) => toggleReadStatus(e, n)}>
                        {n.read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-rose-500 hover:bg-rose-50" onClick={(e) => deleteNotification(e, n.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed ${!n.read ? 'text-neutral-800 font-medium' : 'text-neutral-500'}`}>{n.message}</p>
                  <p className="text-[10px] text-neutral-400 font-medium">{format(safeDate(n.createdAt)!, 'hh:mm a - yyyy/MM/dd')}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 flex flex-col items-center justify-center text-center text-neutral-400 space-y-3">
              <Bell className="w-8 h-8 opacity-20" />
              <p className="text-sm">لا توجد إشعارات حالياً</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ActivityCardProps {
  activity: Activity;
  stats: {
    revenue: number;
    venueRevenue: number;
    expense: number;
    profit: number;
    attendees: number;
    freeAttendees: number;
    paidAttendees: number;
  };
  onDelete?: () => void;
  onStatusChange?: () => void;
  onSelect?: () => void;
  onEdit?: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, stats, onDelete, onStatusChange, onSelect, onEdit }) => {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className={STATUS_COLORS[activity.status]}>
            {STATUS_LABELS[activity.status]}
          </Badge>
          <p className="text-xs text-neutral-500">{format(safeDate(activity.date)!, 'yyyy/MM/dd')}</p>
        </div>
        <CardTitle className="mt-1 text-sm">{activity.name}</CardTitle>
        <CardDescription className="line-clamp-1 text-xs">{activity.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pb-3 px-4 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-neutral-50 p-2 rounded-lg">
            <p className="text-[10px] text-neutral-500 uppercase font-bold">الحضور</p>
            <p className="text-base font-bold">{stats.attendees}</p>
          </div>
          <div className="bg-neutral-50 p-2 rounded-lg">
            <p className="text-[10px] text-neutral-500 uppercase font-bold">الربح</p>
            <p className={`text-base font-bold ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.profit} {CURRENCY}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {stats.freeAttendees} مجاني</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {activity.basePrice} {CURRENCY} / شخص</span>
        </div>
        {/* Status + View + Delete */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-100">
          {onStatusChange ? (
            <Select
              value={activity.status}
              onValueChange={async (v) => { try { await apiPut('/activities/' + activity.id, { status: v }); if (onStatusChange) onStatusChange(); } catch (e) { console.error(e); } }}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">مخطط له</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className={`${STATUS_COLORS[activity.status]} flex-1 justify-center py-1.5`}>{STATUS_LABELS[activity.status]}</Badge>
          )}
          <div className="flex items-center gap-1">
            {onEdit && activity.status === 'planned' && (
              <button type="button" title="تعديل النشاط" className="inline-flex items-center justify-center text-amber-500 h-7 w-7 rounded-md hover:bg-amber-50 transition-colors" onClick={() => { if (onEdit) onEdit(); }}>
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onSelect && (
              <button type="button" title="عرض التفاصيل" className="inline-flex items-center justify-center text-blue-600 h-7 w-7 rounded-md hover:bg-blue-50 transition-colors" onClick={() => { if (onSelect) onSelect(); }}>
                <Info className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button type="button" title="حذف" className="inline-flex items-center justify-center text-rose-500 h-7 w-7 rounded-md hover:bg-rose-50 transition-colors" onClick={() => { if (onDelete) onDelete(); }}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// BookingsTabContent with search, filter, edit [BL-05, F-03, F-06, UX-02, UX-03]
function BookingsTabContent({ bookings, activities, fetchAll, staff, profile, locations }: { bookings: Booking[], activities: Activity[], fetchAll: () => void, staff: StaffMember[], profile: any, locations: Location[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActivity, setFilterActivity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch = !searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone?.includes(searchQuery);
      const matchActivity = filterActivity === 'all' || b.activityId === filterActivity;
      const matchStatus = filterStatus === 'all' ||
        (filterStatus === 'paid' && b.isPaid && !b.isFree) ||
        (filterStatus === 'free' && b.isFree) ||
        (filterStatus === 'unpaid' && !b.isPaid && !b.isFree);
      return matchSearch && matchActivity && matchStatus;
    });
  }, [bookings, searchQuery, filterActivity, filterStatus]);

  const bookingsPagination = usePagination(filteredBookings, 10);

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBooking) return;
    const fd = new FormData(e.currentTarget);
    try {
      await apiPut('/bookings/' + editingBooking.id, {
        name: fd.get('name') as string,
        phone: fd.get('phone') as string,
        count: Number(fd.get('count')),
        paidAmount: Number(fd.get('paidAmount')),
        notes: fd.get('notes') as string,
        ...((!editingBooking.isPaid || !editingBooking.receivedBy || profile?.username === 'admin') && { receivedBy: fd.get('receivedBy') as string })
      });
      setEditingBooking(null);
      toast.success('تم تحديث الحجز بنجاح');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحديث الحجز');
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>سجل الحجوزات</CardTitle>
          <CardDescription>إدارة المشاركين وحالة الدفع — {filteredBookings.length} من {bookings.length}</CardDescription>
        </div>
        <BookingForm activities={activities} staff={staff} fetchAll={fetchAll} locations={locations} />
      </CardHeader>
      <CardContent>
        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="بحث بالاسم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterActivity} onValueChange={setFilterActivity}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="كل الأنشطة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنشطة</SelectItem>
              {activities.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="paid">مدفوع</SelectItem>
              <SelectItem value="free">مجاني</SelectItem>
              <SelectItem value="unpaid">غير مدفوع</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">النشاط</TableHead>
              <TableHead className="text-center">العدد</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">المبلغ</TableHead>
              <TableHead className="text-right">المستلم</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length > 0 ? bookingsPagination.paginatedData.map(booking => (
              <TableRow key={booking.id} id={'glow-booking-' + booking.id}>
                <TableCell className="font-medium text-right">{booking.name}</TableCell>
                <TableCell className="text-right">{activities.find(a => a.id === booking.activityId)?.name || 'غير معروف'}</TableCell>
                <TableCell className="text-center">{booking.count}</TableCell>
                <TableCell className="text-center">
                  {booking.isFree ? (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">مجاني</Badge>
                  ) : booking.isPaid ? (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">تم الدفع</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">لم يتم الدفع</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">{booking.paidAmount} {CURRENCY}</TableCell>
                <TableCell className="text-right">{booking.receivedBy || '-'}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" title="عرض التفاصيل" onClick={() => setViewingBooking(booking)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="تعديل" onClick={() => setEditingBooking(booking)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!booking.isPaid && !booking.isFree && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => {
                        const activity = activities.find(a => a.id === booking.activityId);
                        const basePrice = activity?.basePrice || 0;
                        const suggestedAmount = (booking.offerItems && booking.offerItems.length > 0)
                          ? booking.offerItems.reduce((s, item) => s + (item.unitPrice * item.quantity), 0)
                          : basePrice * booking.count;
                        const staffOptions = staff.reduce((acc: Record<string,string>, s) => { acc[s.id || s.displayName] = s.displayName; return acc; }, {});
                        const { value: formValues } = await Swal.fire({
                          title: 'تأكيد الدفع',
                          html: `
                            <div style="text-align:right;direction:rtl;">
                              <label style="display:block;margin-bottom:4px;font-weight:600;font-size:14px;">المبلغ المدفوع</label>
                              <input id="swal-amount" type="number" class="swal2-input" value="${suggestedAmount}" style="margin:0 0 12px 0;width:100%;text-align:right;" />
                              <label style="display:block;margin-bottom:4px;font-weight:600;font-size:14px;">الموظف المستلم</label>
                              <select id="swal-staff" class="swal2-select" style="margin:0;width:100%;text-align:right;">
                                <option value="">اختر الموظف</option>
                                ${staff.map(s => '<option value="' + s.displayName + '">' + s.displayName + '</option>').join('')}
                              </select>
                            </div>
                          `,
                          showCancelButton: true,
                          confirmButtonText: 'تأكيد الدفع',
                          cancelButtonText: 'إلغاء',
                          confirmButtonColor: '#10b981',
                          reverseButtons: true,
                          focusConfirm: false,
                          preConfirm: () => {
                            const amount = (document.getElementById('swal-amount') as HTMLInputElement)?.value;
                            const staffName = (document.getElementById('swal-staff') as HTMLSelectElement)?.value;
                            if (!amount || Number(amount) <= 0) { Swal.showValidationMessage('أدخل مبلغ صحيح'); return false; }
                            if (!staffName) { Swal.showValidationMessage('اختر الموظف المستلم'); return false; }
                            return { amount: Number(amount), staffName };
                          }
                        });
                        if (formValues) {
                          try {
                            await apiPut('/bookings/' + booking.id, { isPaid: true, paidAmount: formValues.amount, receivedBy: formValues.staffName });
                            Swal.fire({ title: 'تم!', text: 'تم تأكيد الدفع بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });
                            fetchAll();
                          } catch (err: any) { Swal.fire({ title: 'خطأ', text: err.message, icon: 'error' }); }
                        }
                      }}>دفع</Button>
                    )}
                    <Button size="icon" variant="ghost" className="text-rose-500 h-8 w-8" onClick={async () => {
                      const r = await Swal.fire({ title: 'حذف الحجز؟', text: 'هل تريد حذف هذا الحجز؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء', reverseButtons: true });
                      if (!r.isConfirmed) return;
                      try {
                        await apiDelete('/bookings/' + booking.id);
                        Swal.fire({ title: 'تم!', text: 'تم حذف الحجز', icon: 'success', timer: 1500, showConfirmButton: false });
                        fetchAll();
                      } catch (err: any) { Swal.fire({ title: 'خطأ', text: err.message, icon: 'error' }); }
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-neutral-400">
                  {searchQuery || filterActivity !== 'all' || filterStatus !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد حجوزات بعد'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={bookingsPagination.currentPage}
          totalPages={bookingsPagination.totalPages}
          itemsPerPage={bookingsPagination.itemsPerPage}
          totalItems={filteredBookings.length}
          onPageChange={bookingsPagination.setCurrentPage}
          onItemsPerPageChange={bookingsPagination.setItemsPerPage}
          label="حجز"
        />
      </CardContent>

      {/* Edit Booking Dialog [BL-05, F-03] */}
      <Dialog open={!!editingBooking} onOpenChange={(o) => { if (!o) setEditingBooking(null); }}>
        <DialogContent dir="rtl" className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>تعديل الحجز</DialogTitle></DialogHeader>
          {editingBooking && (
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input name="name" defaultValue={editingBooking.name} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العدد</Label>
                  <Input name="count" type="number" defaultValue={editingBooking.count} required min={1} />
                </div>
                <div className="space-y-2">
                  <Label>المبلغ المدفوع</Label>
                  <Input name="paidAmount" type="number" defaultValue={editingBooking.paidAmount} step="0.01" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input name="phone" defaultValue={editingBooking.phone || ''} />
              </div>
              <div className="space-y-2">
                <Label>المستلم</Label>
                <Input 
                  name="receivedBy" 
                  defaultValue={editingBooking.receivedBy || ''} 
                  disabled={!!(editingBooking.isPaid && editingBooking.receivedBy && profile?.username !== 'admin')}
                  className={!!(editingBooking.isPaid && editingBooking.receivedBy && profile?.username !== 'admin') ? 'bg-neutral-100 cursor-not-allowed opacity-70' : ''}
                />
                {!!(editingBooking.isPaid && editingBooking.receivedBy && profile?.username !== 'admin') && (
                  <p className="text-[10px] text-amber-600 mt-1">لا يمكن تغيير اسم المستلم لحجز مدفوع. (صلاحية المدير العام فقط)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input name="notes" defaultValue={editingBooking.notes || ''} />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">حفظ التعديلات</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Booking Details Dialog */}
      <Dialog open={!!viewingBooking} onOpenChange={(o) => { if (!o) setViewingBooking(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>تفاصيل الحجز</DialogTitle></DialogHeader>
          {viewingBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">الاسم</p>
                  <p className="font-bold text-neutral-900">{viewingBooking.name}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">رقم الهاتف</p>
                  <p className="font-bold text-neutral-900" dir="ltr">{viewingBooking.phone || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">النشاط</p>
                  <p className="font-bold text-neutral-900">{activities.find(a => a.id === viewingBooking.activityId)?.name || 'غير معروف'}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">عدد الأشخاص</p>
                  <p className="font-bold text-neutral-900">{viewingBooking.count}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">حالة الدفع</p>
                  <p className="font-bold">{viewingBooking.isFree ? <span className="text-blue-600">مجاني</span> : viewingBooking.isPaid ? <span className="text-emerald-600">تم الدفع</span> : <span className="text-amber-600">لم يتم الدفع</span>}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">المبلغ المدفوع</p>
                  <p className="font-bold text-neutral-900">{viewingBooking.paidAmount} {CURRENCY}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">الموظف المستلم</p>
                  <p className="font-bold text-neutral-900">{viewingBooking.receivedBy || '-'}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">تاريخ التسجيل</p>
                  <p className="font-bold text-neutral-900 text-sm">{viewingBooking.createdAt ? format(new Date(viewingBooking.createdAt), 'yyyy/MM/dd - hh:mm a') : '-'}</p>
                </div>
              </div>
              {viewingBooking.notes && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-[10px] text-amber-600 uppercase font-bold mb-1">ملاحظات</p>
                  <p className="text-sm text-neutral-700">{viewingBooking.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Forms
function ActivityForm({ locations, fetchAll }: { locations: Location[], fetchAll: () => void }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('none');
  const [enabledOfferIds, setEnabledOfferIds] = useState<string[]>([]);
  
  const selectedLocation = locations.find(l => l.id.toString() === selectedLocationId);
  const locationOffers: LocationOffer[] = (selectedLocation?.offers || []).map((o: any, i: number) => normalizeOffer(o, i));
  const hasEnabledOffers = enabledOfferIds.length > 0;

  const toggleOffer = (offerId: string) => {
    setEnabledOfferIds(prev => prev.includes(offerId) ? prev.filter(id => id !== offerId) : [...prev, offerId]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      const dateStr = formData.get('date') as string;
      
      const locName = selectedLocation?.name || 'نشاط خارجي';
      const d = new Date(dateStr);
      const fDateAr = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(d);
      const generatedName = `${locName} ${fDateAr}`;
      
      const fDateEn = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      const driveFolderName = `${locName} ${fDateEn}`;

      let finalDriveLink = "";
      try {
        const folderRes = await apiPost('/drive/folder', {
          name: driveFolderName,
          parentId: '1MLgq3qx0by7pi_MStkAofEiUYb4n33ml'
        });
        if (folderRes && folderRes.webViewLink) {
          finalDriveLink = folderRes.webViewLink;
        }
      } catch (folderErr) {
        console.error('Drive Folder Creation Error:', folderErr);
      }

      await apiPost('/activities', {
        name: generatedName,
        date: new Date(dateStr).toISOString(),
        description: formData.get('description'),
        basePrice: hasEnabledOffers ? 0 : Number(formData.get('basePrice') || 0),
        status: 'planned',
        locationId: selectedLocationId && selectedLocationId !== 'none' ? Number(selectedLocationId) : null,
        driveLink: finalDriveLink,
        enabledOfferIds: hasEnabledOffers ? enabledOfferIds : []
      });

      setOpen(false);
      setSelectedLocationId('none');
      setEnabledOfferIds([]);
      toast.success('تم إضافة النشاط بنجاح');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ عند الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelectedLocationId('none'); setEnabledOfferIds([]); } }}>
      <DialogTrigger
        render={
          <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
            <Plus className="w-4 h-4 ml-2" /> إضافة نشاط جديد
          </Button>
        }
      />
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إضافة نشاط جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>التاريخ</Label>
            <Input name="date" type="datetime-local" required />
          </div>
          <div className="space-y-2">
            <Label>موقع الفعالية</Label>
            <Select value={selectedLocationId} onValueChange={(v) => { setSelectedLocationId(v); setEnabledOfferIds([]); }}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المكان...">
                  {selectedLocationId === 'none' ? 'غير محدد' : locations.find(l => l.id.toString() === selectedLocationId)?.name || 'غير محدد'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">غير محدد</SelectItem>
                {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {locationOffers.length > 0 && (
            <div className="space-y-2 bg-neutral-50 rounded-xl p-4 border border-neutral-100">
              <Label className="flex items-center gap-2 text-sm font-bold">العروض المتاحة — اختر ما تريد تفعيله</Label>
              <div className="space-y-2 mt-2">
                {locationOffers.map(offer => (
                  <label key={offer.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${enabledOfferIds.includes(offer.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}>
                    <input type="checkbox" checked={enabledOfferIds.includes(offer.id)} onChange={() => toggleOffer(offer.id)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500" />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-800">{offer.description}</p>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span>{offer.price} د.أ</span>
                        <span className="text-emerald-600">النادي: {offer.clubShare} د.أ</span>
                        <span className="text-blue-600">المكان: {offer.venueShare} د.أ</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!hasEnabledOffers && (
            <div className="space-y-2">
              <Label>سعر التذكرة (د.أ)</Label>
              <Input name="basePrice" type="number" required placeholder="10" />
            </div>
          )}

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Input name="description" placeholder="تفاصيل النشاط..." />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                 <span className="flex items-center gap-2">
                   <Loader2 className="w-4 h-4 animate-spin" /> جاري التجهيز...
                 </span>
              ) : 'حفظ النشاط'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



function BookingForm({ activities, staff, fetchAll, locations }: { activities: Activity[], staff: StaffMember[], fetchAll: () => void, locations: Location[] }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>(undefined);
  const [offerQuantities, setOfferQuantities] = useState<Record<string, number>>({});

  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => { if (!open) { setIsFree(false); setIsPaid(false); setSelectedActivityId(undefined); setOfferQuantities({}); } }, [open]);

  const availableActivities = activities.filter(a => 
    a.status !== 'cancelled' && 
    (a.status !== 'completed' || profile?.username === 'admin')
  );

  const selectedActivity = activities.find(a => a.id.toString() === selectedActivityId);
  const selectedLocation = selectedActivity?.locationId ? locations.find(l => l.id === selectedActivity.locationId) : null;
  
  const enabledOffers: LocationOffer[] = (() => {
    if (!selectedActivity || !selectedLocation || !selectedActivity.enabledOfferIds?.length) return [];
    const allOffers = (selectedLocation.offers || []).map((o: any, i: number) => normalizeOffer(o, i));
    return allOffers.filter(o => selectedActivity.enabledOfferIds!.includes(o.id));
  })();

  const hasOffers = enabledOffers.length > 0;
  const totalCount = hasOffers ? Object.values(offerQuantities).reduce((s, q) => s + q, 0) : 0;
  const totalAmount = hasOffers ? enabledOffers.reduce((s, o) => s + (o.price * (offerQuantities[o.id] || 0)), 0) : 0;
  const totalClubShare = hasOffers ? enabledOffers.reduce((s, o) => s + (o.clubShare * (offerQuantities[o.id] || 0)), 0) : 0;
  const totalVenueShare = hasOffers ? enabledOffers.reduce((s, o) => s + (o.venueShare * (offerQuantities[o.id] || 0)), 0) : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const isPaid = formData.get('isPaid') === 'true';

    const offerItems: BookingOfferItem[] = hasOffers ? enabledOffers
      .filter(o => (offerQuantities[o.id] || 0) > 0)
      .map(o => ({
        offerId: o.id, offerName: o.description, quantity: offerQuantities[o.id] || 0,
        unitPrice: o.price, clubShare: o.clubShare, venueShare: o.venueShare
      })) : [];

    const count = hasOffers ? totalCount : Number(formData.get('count') || 1);
    const paidAmount = isFree ? 0 : (hasOffers ? (isPaid ? totalAmount : 0) : (isPaid ? Number(formData.get('paidAmount') || 0) : 0));

    if (hasOffers && totalCount === 0) { toast.error('يرجى تحديد كمية لعرض واحد على الأقل'); return; }

    try {
      await apiPost('/bookings', {
        activityId: selectedActivityId, name, phone: formData.get('phone'), count, isFree,
        isPaid: isFree ? true : isPaid, paidAmount, receivedBy: formData.get('receivedBy'),
        notes: formData.get('notes'), offerItems
      });
      setOpen(false); toast.success('تم تسجيل الحجز بنجاح'); fetchAll();
    } catch (err: any) { toast.error(err.message || 'حدث خطأ غير متوقع'); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"><Plus className="w-4 h-4 ml-2" /> حجز جديد</Button>} />
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>تسجيل حجز جديد</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>النشاط</Label>
            <Select value={selectedActivityId} onValueChange={(v) => { setSelectedActivityId(v); setOfferQuantities({}); }}>
              <SelectTrigger>
                <SelectValue placeholder="اختر النشاط">
                  {selectedActivityId ? availableActivities.find(a => a.id.toString() === selectedActivityId)?.name : "اختر النشاط"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>{availableActivities.map(a => (<SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>الاسم</Label><Input name="name" required /></div>
            <div className="space-y-2"><Label>رقم الهاتف</Label><Input name="phone" /></div>
          </div>
          {hasOffers ? (
            <div className="space-y-3 bg-neutral-50 rounded-xl p-4 border border-neutral-100">
              <Label className="text-sm font-bold">اختر العروض والكميات</Label>
              {enabledOffers.map(offer => (
                <div key={offer.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-200">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{offer.description}</p>
                    <p className="text-xs text-neutral-500">{offer.price} د.أ / شخص</p>
                  </div>
                  <Input type="number" min="0" value={offerQuantities[offer.id] || 0}
                    onChange={(e) => setOfferQuantities(prev => ({ ...prev, [offer.id]: Math.max(0, Number(e.target.value)) }))}
                    className="w-20 text-center h-9" />
                </div>
              ))}
              {totalCount > 0 && (
                <div className="bg-emerald-50 rounded-lg p-3 text-sm space-y-1 border border-emerald-100">
                  <div className="flex justify-between"><span>الإجمالي:</span> <strong>{totalAmount} د.أ ({totalCount} شخص)</strong></div>
                  <div className="flex justify-between text-emerald-700"><span>حصة النادي:</span> <strong>{totalClubShare} د.أ</strong></div>
                  <div className="flex justify-between text-blue-700"><span>حصة المكان:</span> <strong>{totalVenueShare} د.أ</strong></div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2"><Label>عدد الأشخاص</Label><Input name="count" type="number" defaultValue="1" required /></div>
          )}
          <div className="space-y-2">
            <Label>نوع الحجز</Label>
            <Select value={isFree ? 'true' : 'false'} onValueChange={(v) => setIsFree(v === 'true')}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الحجز">
                  {isFree ? 'مجاني (ضيف)' : 'مدفوع'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">مدفوع</SelectItem>
                <SelectItem value="true">مجاني (ضيف)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isFree && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>حالة الدفع</Label>
                  <Select value={isPaid ? 'true' : 'false'} onValueChange={(v) => setIsPaid(v === 'true')}>
                    <SelectTrigger>
                      <SelectValue placeholder="حالة الدفع">
                        {isPaid ? 'تم الدفع' : 'لم يدفع'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent><SelectItem value="false">لم يدفع</SelectItem><SelectItem value="true">تم الدفع</SelectItem></SelectContent>
                  </Select>
                  <input type="hidden" name="isPaid" value={isPaid ? 'true' : 'false'} />
                </div>
                {!hasOffers && (<div className="space-y-2"><Label>المبلغ المدفوع</Label><Input name="paidAmount" type="number" placeholder="0" /></div>)}
              </div>
              <div className="space-y-2">
                <Label>الموظف المستلم</Label>
                <Select name="receivedBy">
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>{staff.map(s => <SelectItem key={s.id || s.displayName} value={s.displayName}>{s.displayName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2"><Label>ملاحظات</Label><Input name="notes" /></div>
          <DialogFooter><Button type="submit" className="w-full">تأكيد الحجز</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CostForm({ activities, bookings, costs }: { activities: Activity[], bookings: Booking[], costs: Cost[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'activity' | 'general'>('general');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const activityId = formData.get('activityId') as string;
    const item = formData.get('item') as string;

    try {
      await addDoc(collection(db, 'costs'), {
        item,
        amount,
        date: Timestamp.fromDate(new Date(formData.get('date') as string)),
        paidBy: formData.get('paidBy'),
        type,
        activityId: type === 'activity' ? activityId : null,
        createdAt: Timestamp.now()
      });

      // Cost Threshold Check
      if (type === 'activity' && user) {
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
          const activityBookings = bookings.filter(b => b.activityId === activityId);
          const revenue = activityBookings.reduce((sum, b) => sum + (b.isPaid ? b.paidAmount : 0), 0);
          const currentCosts = costs.filter(c => c.activityId === activityId).reduce((sum, c) => sum + c.amount, 0) + amount;

          if (currentCosts > revenue && revenue > 0) {
            await createNotification(user.uid, 'تنبيه تكاليف', `تجاوزت تكاليف نشاط ${activity.name} إجمالي الإيرادات المحققة!`, 'cost_alert');
          }
        }
      }

      setOpen(false);
      toast.success('تم تسجيل المصروف بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'costs');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50">
            <Plus className="w-4 h-4 ml-2" /> إضافة مصروف
          </Button>
        }
      />
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تسجيل مصروف جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نوع المصروف</Label>
            <Select onValueChange={(v) => setType(v as any)} defaultValue="general">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">مصروف عام (إيجار، قرطاسية...)</SelectItem>
                <SelectItem value="activity">مرتبط بنشاط معين</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'activity' && (
            <div className="space-y-2">
              <Label>النشاط</Label>
              <Select name="activityId" required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر النشاط" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>البند / الوصف</Label>
            <Input name="item" required placeholder="مثلاً: ضيافة، إيجار قاعة" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المبلغ (د.أ)</Label>
              <Input name="amount" type="number" required />
            </div>
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input name="date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>الشخص الذي دفع</Label>
            <Input name="paidBy" required />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white">حفظ المصروف</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FoundationalCostForm() {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'foundationalCosts'), {
        item: formData.get('item'),
        amount: Number(formData.get('amount')),
        paidBy: formData.get('paidBy'),
        source: formData.get('source'),
        date: Timestamp.fromDate(new Date(formData.get('date') as string)),
        createdAt: Timestamp.now()
      });
      setOpen(false);
      toast.success('تم تسجيل التكلفة التأسيسية بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'foundationalCosts');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-amber-600 hover:bg-amber-700 text-white"><Plus className="w-4 h-4 ml-2" /> إضافة تكلفة تأسيسية</Button>} />
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة تكلفة تأسيسية</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>البند</Label><Input name="item" required /></div>
          <div className="space-y-2"><Label>المبلغ</Label><Input name="amount" type="number" required /></div>
          <div className="space-y-2"><Label>الشخص الذي دفع</Label><Input name="paidBy" required /></div>
          <div className="space-y-2"><Label>مصدر التمويل (من وين)</Label><Input name="source" placeholder="مثلاً: شخصي، قرض، شريك" required /></div>
          <div className="space-y-2"><Label>التاريخ</Label><Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required /></div>
          <DialogFooter><Button type="submit" className="w-full">حفظ</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FoundationalCostsTab({ costs }: { costs: FoundationalCost[] }) {
  const totalFoundational = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">التكاليف التأسيسية</h2>
          <p className="text-neutral-500">إدارة مصاريف التأسيس والتجهيزات الأولية</p>
        </div>
        <FoundationalCostForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-amber-50 border-amber-100">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-600">إجمالي التكاليف التأسيسية</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-900">{totalFoundational.toLocaleString()} {CURRENCY}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>البند</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>الشخص الذي دفع</TableHead>
              <TableHead>المصدر</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.length > 0 ? costs.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.item}</TableCell>
                <TableCell>{c.amount.toLocaleString()} {CURRENCY}</TableCell>
                <TableCell>{c.paidBy}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-white">{c.source}</Badge>
                </TableCell>
                <TableCell>{format(safeDate(c.date)!, 'yyyy/MM/dd')}</TableCell>
                <TableCell className="text-left">
                  <Button variant="ghost" size="icon-sm" className="text-rose-500" onClick={async () => {
                    const r = await Swal.fire({ title: 'حذف التكلفة التأسيسية؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء', reverseButtons: true });
                    if (!r.isConfirmed) return;
                    try { await apiDelete('/foundational/' + c.id); Swal.fire({ title: 'تم!', icon: 'success', timer: 1200, showConfirmButton: false }).then(() => window.location.reload()); } catch (e: any) { Swal.fire({ title: 'خطأ', text: e.message, icon: 'error' }); }
                  }}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-neutral-500">لا يوجد تكاليف تأسيسية مسجلة بعد</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}


