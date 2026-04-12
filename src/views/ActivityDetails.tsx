import React, { useState } from 'react';
import { Activity, Booking, Cost, Location } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ArrowRight, DollarSign, Users, Link as LinkIcon, Gift, Calendar, AlertTriangle, Ticket, ChevronDown, ChevronUp, Receipt, CreditCard, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ActivityDetailsProps {
  activity: Activity;
  location: Location | null;
  bookings: Booking[];
  costs: Cost[];
  onBack: () => void;
}

const safeDate = (date: any) => {
  if (!date) return new Date();
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

import DriveFolderBrowser from '@/components/DriveFolderBrowser';

export default function ActivityDetails({ activity, location, bookings, costs, onBack }: ActivityDetailsProps) {
  const activityBookings = bookings.filter(b => b.activityId === activity.id);
  const activityCosts = costs.filter(c => c.activityId === activity.id);

  const revenue = activityBookings.reduce((sum, b) => sum + (b.isPaid ? b.paidAmount : 0), 0);
  const expense = activityCosts.reduce((sum, c) => sum + c.amount, 0);
  const profit = revenue - expense;

  const totalAttendees = activityBookings.reduce((sum, b) => sum + b.count, 0);
  const paidAttendees = activityBookings.filter(b => b.isPaid && !b.isFree).reduce((sum, b) => sum + b.count, 0);
  const freeAttendees = activityBookings.filter(b => b.isFree).reduce((sum, b) => sum + b.count, 0);
  const unpaidAttendees = activityBookings.filter(b => !b.isPaid && !b.isFree).reduce((sum, b) => sum + b.count, 0);

  // Collapsible states
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [costsOpen, setCostsOpen] = useState(false);

  // Pie chart data
  const financialPieData = [
    { name: 'الإيرادات', value: revenue, color: '#10b981' },
    { name: 'التكاليف', value: expense, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const attendancePieData = [
    { name: 'مدفوع', value: paidAttendees, color: '#10b981' },
    { name: 'مجاني', value: freeAttendees, color: '#3b82f6' },
    { name: 'غير مدفوع', value: unpaidAttendees, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      
      {/* ===== HEADER ===== */}
      <div className="pb-2">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-full h-10 w-10 shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-neutral-900">{activity.name}</h1>
              <Badge variant="outline" className={`${STATUS_COLORS[activity.status]} text-xs px-2.5 py-0.5`}>
                {STATUS_LABELS[activity.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(safeDate(activity.date), 'dd MMMM yyyy - hh:mm a')}
              </span>
              <span className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4" />
                {activity.basePrice} {CURRENCY} / شخص
              </span>
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {location.name}
                </span>
              )}
            </div>
            {activity.description && (
              <p className="text-sm text-neutral-600 mt-2 max-w-2xl leading-relaxed">{activity.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== PIE CHARTS (Financial + Attendance) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Financial Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" /> الملخص المالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Pie */}
              <div className="w-[160px] h-[160px] shrink-0">
                {financialPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialPieData}
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {financialPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ${CURRENCY}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <DollarSign className="w-10 h-10" />
                  </div>
                )}
              </div>
              {/* Stats */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-lg">
                  <span className="text-neutral-300 text-sm">صافي الربح</span>
                  <span className={`font-bold text-lg ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {profit.toLocaleString()} {CURRENCY}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-neutral-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    الإيرادات
                  </span>
                  <span className="font-bold text-emerald-600">+{revenue.toLocaleString()} {CURRENCY}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-neutral-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    التكاليف
                  </span>
                  <span className="font-bold text-rose-600">-{expense.toLocaleString()} {CURRENCY}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> توزيع الحضور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Pie */}
              <div className="w-[160px] h-[160px] shrink-0">
                {attendancePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendancePieData}
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {attendancePieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} شخص`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <Users className="w-10 h-10" />
                  </div>
                )}
              </div>
              {/* Stats */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-lg">
                  <span className="text-neutral-300 text-sm">إجمالي الحضور</span>
                  <span className="font-bold text-lg text-white">
                    {totalAttendees} <span className="text-xs text-neutral-400 font-normal">من {activityBookings.length} حجز</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-neutral-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    مدفوع
                  </span>
                  <span className="font-bold text-emerald-600">{paidAttendees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-neutral-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    مجاني
                  </span>
                  <span className="font-bold text-blue-600">{freeAttendees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-neutral-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    غير مدفوع
                  </span>
                  <span className="font-bold text-amber-600">{unpaidAttendees}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== BOOKINGS TABLE (Collapsible) ===== */}
      <Card className="border-none shadow-sm">
        <button
          onClick={() => setBookingsOpen(!bookingsOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors rounded-t-xl"
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-bold text-neutral-900">قائمة الحجوزات</span>
            <Badge variant="outline" className="mr-2 text-xs bg-neutral-50">{activityBookings.length} حجز</Badge>
          </div>
          <div className="flex items-center gap-3">
            {unpaidAttendees > 0 && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {unpaidAttendees} لم يدفعوا
              </span>
            )}
            {bookingsOpen ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </div>
        </button>
        
        {bookingsOpen && (
          <CardContent className="pt-0">
            {activityBookings.length > 0 ? (
              <>
                <div className="border border-neutral-100 rounded-xl overflow-hidden">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow className="bg-neutral-50/80">
                        <TableHead className="text-right w-10 font-bold">#</TableHead>
                        <TableHead className="text-right font-bold">الاسم</TableHead>
                        <TableHead className="text-right font-bold">الهاتف</TableHead>
                        <TableHead className="text-center font-bold">العدد</TableHead>
                        <TableHead className="text-center font-bold">الحالة</TableHead>
                        <TableHead className="text-center font-bold">المبلغ</TableHead>
                        <TableHead className="text-right font-bold">المستلم</TableHead>
                        <TableHead className="text-right font-bold">ملاحظات</TableHead>
                        <TableHead className="text-right font-bold">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityBookings.map((booking, index) => (
                        <TableRow key={booking.id} className="hover:bg-neutral-50/50 transition-colors">
                          <TableCell className="text-neutral-400 text-xs font-mono">{index + 1}</TableCell>
                          <TableCell className="font-medium text-neutral-900">{booking.name}</TableCell>
                          <TableCell className="text-neutral-600 text-sm" dir="ltr">
                            {booking.phone || <span className="text-neutral-300">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md text-sm font-bold">
                              {booking.count}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {booking.isFree ? (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">مجاني</Badge>
                            ) : booking.isPaid ? (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">مدفوع</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">غير مدفوع</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {booking.isFree ? (
                              <span className="text-neutral-400">—</span>
                            ) : (
                              <span className={booking.isPaid ? 'text-emerald-600' : 'text-amber-600'}>
                                {booking.paidAmount} {CURRENCY}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-neutral-600 text-sm">{booking.receivedBy || <span className="text-neutral-300">—</span>}</TableCell>
                          <TableCell className="text-neutral-500 text-xs max-w-[150px] truncate" title={booking.notes}>
                            {booking.notes || <span className="text-neutral-300">—</span>}
                          </TableCell>
                          <TableCell className="text-neutral-400 text-xs whitespace-nowrap">
                            {booking.createdAt ? format(safeDate(booking.createdAt), 'MM/dd hh:mm a') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Summary Footer */}
                <div className="mt-3 flex flex-wrap items-center gap-5 text-sm text-neutral-500 bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <strong className="text-neutral-700">{totalAttendees}</strong> حضور
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <strong className="text-emerald-600">{revenue.toLocaleString()} {CURRENCY}</strong> محصّل
                  </span>
                  {unpaidAttendees > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <strong>{(activity.basePrice * unpaidAttendees).toLocaleString()} {CURRENCY}</strong> متوقع تحصيله
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-10 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
                <Users className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500 font-medium">لا توجد حجوزات لهذا النشاط بعد</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ===== COSTS TABLE (Collapsible) ===== */}
      <Card className="border-none shadow-sm">
        <button
          onClick={() => setCostsOpen(!costsOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors rounded-t-xl"
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-500" />
            <span className="text-lg font-bold text-neutral-900">تكاليف النشاط</span>
            <Badge variant="outline" className="mr-2 text-xs bg-neutral-50">{activityCosts.length} بند</Badge>
          </div>
          <div className="flex items-center gap-3">
            {activityCosts.length > 0 && (
              <span className="text-sm font-bold text-rose-600">{expense.toLocaleString()} {CURRENCY}</span>
            )}
            {costsOpen ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </div>
        </button>
        
        {costsOpen && (
          <CardContent className="pt-0">
            {activityCosts.length > 0 ? (
              <div className="border border-neutral-100 rounded-xl overflow-hidden">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow className="bg-neutral-50/80">
                      <TableHead className="text-right w-10 font-bold">#</TableHead>
                      <TableHead className="text-right font-bold">البند</TableHead>
                      <TableHead className="text-center font-bold">المبلغ</TableHead>
                      <TableHead className="text-right font-bold">المدفوع بواسطة</TableHead>
                      <TableHead className="text-right font-bold">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityCosts.map((cost, index) => (
                      <TableRow key={cost.id} className="hover:bg-neutral-50/50 transition-colors">
                        <TableCell className="text-neutral-400 text-xs font-mono">{index + 1}</TableCell>
                        <TableCell className="font-medium text-neutral-900">{cost.item}</TableCell>
                        <TableCell className="text-center font-bold text-rose-600">{cost.amount.toLocaleString()} {CURRENCY}</TableCell>
                        <TableCell className="text-neutral-600">{cost.paidBy}</TableCell>
                        <TableCell className="text-neutral-400 text-sm whitespace-nowrap">
                          {cost.date ? format(safeDate(cost.date), 'yyyy/MM/dd') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500 font-medium">لا توجد تكاليف مسجلة</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ===== LOCATION + DRIVE (Dynamic Height) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Location Card (measured for Drive height) */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" /> مكان الفعالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {location ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-lg">{location.name}</span>
                    {location.mapUrl && (
                      <a href={location.mapUrl} target="_blank" rel="noreferrer" className="text-blue-500 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 transition-colors">
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {location.offers && location.offers.length > 0 && (
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                      <p className="text-xs font-bold text-neutral-500 mb-2 flex items-center gap-1"><Gift className="w-3 h-3" /> عروض المكان</p>
                      <ul className="text-sm space-y-1 list-disc list-inside text-neutral-700">
                        {location.offers.map((offer, i) => (
                          <li key={i} className="line-clamp-2">
                             {typeof offer === 'string' ? offer : (
                               <span>
                                 {offer.description} 
                                 <Badge variant="outline" className="mr-2 text-rose-500 border-rose-200 bg-rose-50 px-1 py-0!">{offer.price} {CURRENCY}</Badge>
                               </span>
                             )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 bg-neutral-50 rounded-lg text-neutral-400 text-sm">
                  لم يتم تحديد مكان لهذه الفعالية.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drive Embed (height = 2.5 × location card) */}
        <div className="lg:col-span-2 h-[700px] flex flex-col">
          <Card className="border-none shadow-sm flex-1 flex flex-col overflow-hidden relative">
            <CardHeader className="border-b border-neutral-100 bg-white z-10 shrink-0 pb-4 pt-5 px-6">
              <CardTitle className="text-lg">
                ملفات الفعالية (Google Drive)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative bg-neutral-50">
              <DriveFolderBrowser driveLink={activity.driveLink} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
