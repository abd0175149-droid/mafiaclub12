import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from './lib/api';
import Swal from 'sweetalert2';
import { collection, query, onSnapshot, orderBy, Timestamp, addDoc, updateDoc, doc, deleteDoc, setDoc, where, writeBatch, getDocs, db, handleFirestoreError, OperationType, createNotification, notifyAllAdmins, updatePassword, updateProfile, auth as firebaseAuth } from './lib/firebase-compat';
import { Activity, Booking, Cost, Notification, UserSettings, FoundationalCost, StaffMember, Location } from './types';
import LocationsView from './views/LocationsView';
import FinanceView from './views/FinanceView';
import ActivityDetails from './views/ActivityDetails';
import { useAuth } from './AuthContext';
import ProfileTab from './views/ProfileSettings';
import UserManagementTab from './views/UserManagementTab';
import { ImageCropper } from '@/components/ImageCropper';
import { Button } from '@/components/ui/button';
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
  Building2, User as UserIcon, LogOut, Shield, Key, Menu, X
} from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  const fetchAll = useCallback(async () => {
    try {
      const [act, book, cos, found, notif, sett, locs] = await Promise.all([
        apiGet<Activity[]>('/activities'),
        apiGet<Booking[]>('/bookings'),
        apiGet<Cost[]>('/costs'),
        apiGet<FoundationalCost[]>('/foundational'),
        apiGet<Notification[]>('/notifications'),
        apiGet<UserSettings>('/settings'),
        apiGet<Location[]>('/locations').catch(() => []),
      ]);
      setActivities(act); setBookings(book); setCosts(cos);
      setFoundationalCosts(found); setNotifications(notif); setSettings(sett);
      setLocations(locs || []);
      if (isAdmin) { const s = await apiGet<StaffMember[]>('/staff'); setStaff(s); }
    } catch (err) { console.error('Fetch error:', err); }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 30000); return () => clearInterval(iv); }, [fetchAll]);

  // Financial Calculations (memoized) [PERF-02, ARCH-03]
  const totalRevenue = useMemo(() => bookings.reduce((sum, b) => sum + (b.isPaid ? b.paidAmount : 0), 0), [bookings]);
  const totalCosts = useMemo(() => costs.reduce((sum, c) => sum + c.amount, 0), [costs]);
  const netProfit = totalRevenue - totalCosts;

  const getActivityStats = useMemo(() => {
    const statsMap = new Map<string, { revenue: number; expense: number; profit: number; attendees: number; freeAttendees: number; paidAttendees: number }>();
    activities.forEach(activity => {
      const activityBookings = bookings.filter(b => b.activityId === activity.id);
      const activityCosts = costs.filter(c => c.activityId === activity.id);
      const revenue = activityBookings.reduce((sum, b) => sum + (b.isPaid ? b.paidAmount : 0), 0);
      const expense = activityCosts.reduce((sum, c) => sum + c.amount, 0);
      const attendees = activityBookings.reduce((sum, b) => sum + b.count, 0);
      const freeAttendees = activityBookings.filter(b => b.isFree).reduce((sum, b) => sum + b.count, 0);
      statsMap.set(activity.id, { revenue, expense, profit: revenue - expense, attendees, freeAttendees, paidAttendees: attendees - freeAttendees });
    });
    return (activityId: string) => statsMap.get(activityId) || { revenue: 0, expense: 0, profit: 0, attendees: 0, freeAttendees: 0, paidAttendees: 0 };
  }, [activities, bookings, costs]);

  const upcomingActivities = useMemo(() => activities
    .filter(a => isAfter(safeDate(a.date)!, startOfDay(new Date())) && a.status !== 'cancelled')
    .sort((a, b) => safeDate(a.date)!.getTime() - safeDate(b.date)!.getTime()), [activities]);

  const activeBookingsCount = useMemo(() => bookings.filter(b => {
    const activity = activities.find(a => a.id === b.activityId);
    return activity && isAfter(safeDate(activity.date)!, startOfDay(new Date()));
  }).length, [bookings, activities]);

  const chartData = useMemo(() => activities.slice(0, 5).reverse().map(a => {
    const stats = getActivityStats(a.id);
    return {
      name: a.name,
      profit: stats.profit,
      revenue: stats.revenue,
      expense: stats.expense
    };
  }), [activities, getActivityStats]);

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
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      reverseButtons: true
    });
    if (!result.isConfirmed) return;
    try {
      await apiDelete(`/activities/${activity.id}`);
      Swal.fire({ title: 'تم الحذف!', text: `تم حذف "${activity.name}" بنجاح`, icon: 'success', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (err: any) {
      Swal.fire({ title: 'خطأ', text: err.message || 'حدث خطأ أثناء الحذف', icon: 'error' });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (selectedActivity) {
    return (
      <ActivityDetails
        activity={selectedActivity}
        location={locations.find(l => l.id == selectedActivity.locationId) || null}
        bookings={bookings}
        costs={costs}
        onBack={() => setSelectedActivity(null)}
      />
    );
  }

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
            { id: 'locations', icon: PieChartIcon, label: 'أماكن الفعاليات', reqPerm: 'locations' },
          ].map(tc => {
            const hasPerm = isAdmin || !tc.reqPerm || (Array.isArray(profile?.permissions) && profile.permissions.includes(tc.reqPerm));
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
              <NotificationCenter notifications={notifications} />
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

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

          <div className={activeTab === 'overview' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
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

              {/* Booking Status Chart */}
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" /> حالة الحجوزات
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {activeTab === 'overview' && !selectedActivity && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'مدفوع', count: bookings.filter(b => b.isPaid && !b.isFree).length, color: '#10b981' },
                        { name: 'مجاني', count: bookings.filter(b => b.isFree).length, color: '#3b82f6' },
                        { name: 'غير مدفوع', count: bookings.filter(b => !b.isPaid && !b.isFree).length, color: '#f59e0b' }
                      ]}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count">
                          {[0, 1, 2].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b'][index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className={activeTab === 'activities' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">الأنشطة المجدولة</h2>
                  <p className="text-neutral-500">إدارة الجلسات والفعاليات</p>
                </div>
                <ActivityForm locations={locations} fetchAll={fetchAll} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.length > 0 ? activities.map(activity => (
                  <div key={activity.id}>
                    <ActivityCard activity={activity} stats={getActivityStats(activity.id)} onDelete={() => handleDeleteActivity(activity)} onStatusChange={fetchAll} onSelect={() => setSelectedActivity(activity)} />
                  </div>
                )) : (
                  <div className="col-span-full text-center py-16 text-neutral-400">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">لا توجد أنشطة حالياً</p>
                    <p className="text-sm">ابدأ بإضافة نشاط جديد</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={activeTab === 'bookings' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <BookingsTabContent bookings={bookings} activities={activities} fetchAll={fetchAll} />
          </div>

          <div className={activeTab === 'finances' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <FinanceView activities={activities} bookings={bookings} costs={costs} foundationalCosts={foundationalCosts} fetchData={fetchAll} />
          </div>

          <div className={activeTab === 'locations' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
            <LocationsView />
          </div>

          <div className={activeTab === 'profile' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
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
            <div className={activeTab === 'users' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
              <UserManagementTab users={staff} fetchAll={fetchAll} />
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

function NotificationCenter({ notifications }: { notifications: Notification[] }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string | number) => {
    await apiPut('/notifications/' + id + '/read', {});
  };

  const markAllAsRead = async () => {
    await apiPut('/notifications/read-all', {});
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
      <DropdownMenuContent className="w-80 p-0" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-4 flex items-center justify-between">
            <span>الإشعارات</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-auto p-0" onClick={markAllAsRead}>تحديد الكل كمقروء</Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? notifications.map(n => (
            <div
              key={n.id}
              className={`p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
              onClick={() => markAsRead(n.id)}
            >
              <div className="flex gap-3">
                <div className={`p-2 rounded-full h-fit ${n.type === 'cost_alert' ? 'bg-rose-100 text-rose-600' :
                    n.type === 'new_booking' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-blue-100 text-blue-600'
                  }`}>
                  {n.type === 'cost_alert' ? <AlertTriangle className="w-4 h-4" /> :
                    n.type === 'new_booking' ? <Users className="w-4 h-4" /> :
                      <CalendarIcon className="w-4 h-4" />}
                </div>
                <div className="space-y-1">
                  <p className={`text-sm font-bold ${!n.read ? 'text-neutral-900' : 'text-neutral-600'}`}>{n.title}</p>
                  <p className="text-xs text-neutral-500 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-neutral-400">{format(safeDate(n.createdAt)!, 'hh:mm a - yyyy/MM/dd')}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-neutral-400">لا توجد إشعارات حالياً</div>
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
    expense: number;
    profit: number;
    attendees: number;
    freeAttendees: number;
    paidAttendees: number;
  };
  onDelete?: () => void;
  onStatusChange?: () => void;
  onSelect?: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, stats, onDelete, onStatusChange, onSelect }) => {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className={STATUS_COLORS[activity.status]}>
            {STATUS_LABELS[activity.status]}
          </Badge>
          <p className="text-xs text-neutral-500">{format(safeDate(activity.date)!, 'yyyy/MM/dd')}</p>
        </div>
        <CardTitle className="mt-2">{activity.name}</CardTitle>
        <CardDescription className="line-clamp-2">{activity.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-50 p-3 rounded-lg">
            <p className="text-[10px] text-neutral-500 uppercase font-bold">الحضور</p>
            <p className="text-lg font-bold">{stats.attendees}</p>
          </div>
          <div className="bg-neutral-50 p-3 rounded-lg">
            <p className="text-[10px] text-neutral-500 uppercase font-bold">الربح</p>
            <p className={`text-lg font-bold ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.profit} {CURRENCY}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {stats.freeAttendees} مجاني</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {activity.basePrice} {CURRENCY} / شخص</span>
        </div>
        {/* Status + View + Delete */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
          <Select
            value={activity.status}
            onValueChange={async (v) => { try { await apiPut('/activities/' + activity.id, { status: v }); if (onStatusChange) onStatusChange(); } catch (e) { console.error(e); } }}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">مخطط له</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          <button type="button" title="عرض التفاصيل" className="inline-flex items-center justify-center text-blue-600 h-8 w-8 rounded-md hover:bg-blue-50 transition-colors" onClick={() => { console.log('[CARD] View details:', activity.id); if (onSelect) onSelect(); }}>
            <Info className="w-4 h-4" />
          </button>
          <button type="button" title="حذف" className="inline-flex items-center justify-center text-rose-500 h-8 w-8 rounded-md hover:bg-rose-50 transition-colors" onClick={() => { console.log('[CARD] Delete clicked:', activity.id); if (onDelete) onDelete(); }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// BookingsTabContent with search, filter, edit [BL-05, F-03, F-06, UX-02, UX-03]
function BookingsTabContent({ bookings, activities, fetchAll }: { bookings: Booking[], activities: Activity[], fetchAll: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActivity, setFilterActivity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

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
        receivedBy: fd.get('receivedBy') as string,
        notes: fd.get('notes') as string,
      });
      setEditingBooking(null);
      toast.success('تم تحديث الحجز بنجاح');
      window.location.reload();
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
        <BookingForm activities={activities} />
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>النشاط</TableHead>
              <TableHead>العدد</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>المستلم</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length > 0 ? filteredBookings.map(booking => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">{booking.name}</TableCell>
                <TableCell>{activities.find(a => a.id === booking.activityId)?.name || 'غير معروف'}</TableCell>
                <TableCell>{booking.count}</TableCell>
                <TableCell>
                  {booking.isFree ? (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">مجاني</Badge>
                  ) : booking.isPaid ? (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">تم الدفع</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">لم يتم الدفع</Badge>
                  )}
                </TableCell>
                <TableCell>{booking.paidAmount} {CURRENCY}</TableCell>
                <TableCell>{booking.receivedBy || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingBooking(booking)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!booking.isPaid && !booking.isFree && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => {
                        const basePrice = activities.find(a => a.id === booking.activityId)?.basePrice || 0;
                        const suggestedAmount = basePrice * booking.count;
                        const { value: actualAmount } = await Swal.fire({
                          title: 'تأكيد الدفع',
                          input: 'number',
                          inputLabel: `المبلغ المقترح: ${suggestedAmount} ${CURRENCY}`,
                          inputValue: suggestedAmount,
                          showCancelButton: true,
                          confirmButtonText: 'تأكيد الدفع',
                          cancelButtonText: 'إلغاء',
                          confirmButtonColor: '#10b981',
                          reverseButtons: true
                        });
                        if (actualAmount !== undefined) {
                          try {
                            await apiPut('/bookings/' + booking.id + '/pay', { paidAmount: Number(actualAmount) });
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
      </CardContent>

      {/* Edit Booking Dialog [BL-05, F-03] */}
      <Dialog open={!!editingBooking} onOpenChange={(o) => { if (!o) setEditingBooking(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
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
                <Input name="receivedBy" defaultValue={editingBooking.receivedBy || ''} />
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
    </Card>
  );
}

// Forms
function ActivityForm({ locations, fetchAll }: { locations: Location[], fetchAll: () => void }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const name = formData.get('name') as string;
      const locationId = formData.get('locationId') as string;

      await apiPost('/activities', {
        name,
        date: new Date(formData.get('date') as string).toISOString(),
        description: formData.get('description'),
        basePrice: Number(formData.get('basePrice')),
        status: 'planned',
        locationId: locationId && locationId !== 'none' ? Number(locationId) : null,
        driveLink: formData.get('driveLink')
      });

      setOpen(false);
      toast.success('تم إضافة النشاط بنجاح');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ عند الحفظ');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-neutral-900 text-white hover:bg-neutral-800">
            <Plus className="w-4 h-4 ml-2" /> إضافة نشاط جديد
          </Button>
        }
      />
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة نشاط جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>اسم النشاط</Label>
            <Input name="name" required placeholder="مثلاً: ليلة المافيا الكبرى" />
          </div>
          <div className="space-y-2">
            <Label>التاريخ</Label>
            <Input name="date" type="datetime-local" required />
          </div>
          <div className="space-y-2">
            <Label>سعر التذكرة (د.أ)</Label>
            <Input name="basePrice" type="number" required placeholder="10" />
          </div>
          <div className="space-y-2">
            <Label>الوصف</Label>
            <Input name="description" placeholder="تفاصيل النشاط..." />
          </div>
          <div className="space-y-2">
            <Label>موقع الفعالية</Label>
            <Select name="locationId" defaultValue="none">
              <SelectTrigger><SelectValue placeholder="اختر المكان..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">غير محدد</SelectItem>
                {locations.map(loc => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>رابط التعاون Google Drive (اختياري)</Label>
            <Input name="driveLink" placeholder="يجب أن يكون Anyone with the link" dir="ltr" />
            <p className="text-[10px] text-orange-500">ملاحظة: تأكد أن مجلد درايف مفتوح الصلاحية "Anyone with the link".</p>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">حفظ النشاط</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BookingForm({ activities }: { activities: Activity[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isFree, setIsFree] = useState(false);

  // Reset form state when dialog closes [UX-06]
  useEffect(() => { if (!open) setIsFree(false); }, [open]);

  const availableActivities = activities.filter(a => a.status !== 'cancelled' && a.status !== 'completed');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const activityId = formData.get('activityId') as string;
    const activity = activities.find(a => a.id === activityId);
    const count = Number(formData.get('count'));
    const isPaid = formData.get('isPaid') === 'true';
    const name = formData.get('name') as string;

    try {
      await addDoc(collection(db, 'bookings'), {
        activityId,
        name,
        phone: formData.get('phone'),
        count,
        isFree,
        isPaid: isFree ? true : isPaid,
        paidAmount: isFree ? 0 : (isPaid ? Number(formData.get('paidAmount')) : 0),
        receivedBy: formData.get('receivedBy'),
        notes: formData.get('notes'),
        createdAt: Timestamp.now()
      });

      if (user && activity) {
        await notifyAllAdmins('حجز جديد', `تم تسجيل حجز جديد لـ ${name} في نشاط ${activity.name}`, 'new_booking', user.uid);
      }

      setOpen(false);
      toast.success('تم تسجيل الحجز بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'bookings');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline"><Plus className="w-4 h-4 ml-2" /> حجز جديد</Button>
        }
      />
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل حجز جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>النشاط</Label>
            <Select name="activityId" required>
              <SelectTrigger>
                <SelectValue placeholder="اختر النشاط" />
              </SelectTrigger>
              <SelectContent>
                {availableActivities.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input name="phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>عدد الأشخاص</Label>
              <Input name="count" type="number" defaultValue="1" required />
            </div>
            <div className="space-y-2">
              <Label>نوع الحجز</Label>
              <Select onValueChange={(v) => setIsFree(v === 'true')} defaultValue="false">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">مدفوع</SelectItem>
                  <SelectItem value="true">مجاني (ضيف)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isFree && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>حالة الدفع</Label>
                  <Select name="isPaid" defaultValue="false">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">لم يدفع</SelectItem>
                      <SelectItem value="true">تم الدفع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المبلغ المدفوع</Label>
                  <Input name="paidAmount" type="number" placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المستلم</Label>
                <Input name="receivedBy" placeholder="اسم الشخص الذي استلم المبلغ" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Input name="notes" />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">تأكيد الحجز</Button>
          </DialogFooter>
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


