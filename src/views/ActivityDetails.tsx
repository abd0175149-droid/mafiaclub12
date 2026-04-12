import React, { useState, useEffect } from 'react';
import { Activity, Booking, Cost, Location } from '../types';
import { apiGet, apiDelete } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, ArrowRight, DollarSign, Users, Link as LinkIcon, Gift, Calendar, AlertTriangle, FolderOpen, ChevronRight, Home, ExternalLink, File, Image as ImageIcon, Video as VideoIcon, Download, Loader2, X, Upload, Trash2, TrendingUp, TrendingDown, CreditCard, UserCheck, UserX, Ticket, Clock, Phone, StickyNote, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  // Progress bar percentages
  const paidPercent = totalAttendees > 0 ? (paidAttendees / totalAttendees) * 100 : 0;
  const freePercent = totalAttendees > 0 ? (freeAttendees / totalAttendees) * 100 : 0;
  const unpaidPercent = totalAttendees > 0 ? (unpaidAttendees / totalAttendees) * 100 : 0;

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      
      {/* ===== SECTION 1: Enhanced Header ===== */}
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack} className="rounded-full h-10 w-10 shrink-0">
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-neutral-900">{activity.name}</h1>
                <Badge variant="outline" className={`${STATUS_COLORS[activity.status]} text-xs px-2.5 py-0.5`}>
                  {STATUS_LABELS[activity.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-500">
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
      </div>

      {/* ===== SECTION 2: KPI Cards Row 1 (Financial) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Net Profit */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-300 text-xs font-medium">صافي الربح</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {profit.toLocaleString()} {CURRENCY}
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-xs font-medium">الإيرادات</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">+{revenue.toLocaleString()} {CURRENCY}</div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-xs font-medium">التكاليف</span>
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600">-{expense.toLocaleString()} {CURRENCY}</div>
          </CardContent>
        </Card>

        {/* Total Attendees */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-xs font-medium">إجمالي الحضور</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{totalAttendees}</div>
            <p className="text-xs text-neutral-400 mt-0.5">من {activityBookings.length} عملية حجز</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== SECTION 2b: KPI Cards Row 2 (Attendance Breakdown) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Base Price */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-xs font-medium">سعر التذكرة</span>
              <Ticket className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{activity.basePrice} {CURRENCY}</div>
          </CardContent>
        </Card>

        {/* Paid Attendees */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-xs font-medium">حضور مدفوع</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{paidAttendees}</div>
          </CardContent>
        </Card>

        {/* Free Attendees */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-xs font-medium">حضور مجاني</span>
              <Gift className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{freeAttendees}</div>
          </CardContent>
        </Card>

        {/* Unpaid Attendees */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-500 text-xs font-medium">غير مدفوع</span>
              <UserX className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{unpaidAttendees}</div>
          </CardContent>
        </Card>
      </div>

      {/* ===== SECTION 3: Payment Progress Bar ===== */}
      {totalAttendees > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-neutral-700">توزيع حالة الدفع</span>
              <span className="text-xs text-neutral-500">{totalAttendees} حضور إجمالي</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden flex">
              {paidPercent > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${paidPercent}%` }}
                  title={`مدفوع: ${paidAttendees} (${paidPercent.toFixed(0)}%)`}
                />
              )}
              {freePercent > 0 && (
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${freePercent}%` }}
                  title={`مجاني: ${freeAttendees} (${freePercent.toFixed(0)}%)`}
                />
              )}
              {unpaidPercent > 0 && (
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${unpaidPercent}%` }}
                  title={`غير مدفوع: ${unpaidAttendees} (${unpaidPercent.toFixed(0)}%)`}
                />
              )}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-6 mt-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                مدفوع ({paidAttendees} — {paidPercent.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                مجاني ({freeAttendees} — {freePercent.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                غير مدفوع ({unpaidAttendees} — {unpaidPercent.toFixed(0)}%)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== SECTION 4: Bookings Table ===== */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              قائمة الحجوزات
              <Badge variant="outline" className="mr-2 text-xs bg-neutral-50">{activityBookings.length} حجز</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activityBookings.length > 0 ? (
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
          ) : (
            <div className="text-center py-12 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
              <Users className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-500 font-medium">لا توجد حجوزات لهذا النشاط بعد</p>
              <p className="text-xs text-neutral-400 mt-1">يمكنك إضافة حجوزات من تبويب "قاعدة الحجوزات"</p>
            </div>
          )}

          {/* Bookings Summary Footer */}
          {activityBookings.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-neutral-500 bg-neutral-50 rounded-lg p-3 border border-neutral-100">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <strong className="text-neutral-700">{totalAttendees}</strong> حضور إجمالي
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <strong className="text-emerald-600">{revenue.toLocaleString()} {CURRENCY}</strong> إجمالي المحصّل
              </span>
              <span className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4" />
                <strong className="text-neutral-700">{activity.basePrice} {CURRENCY}</strong> سعر التذكرة
              </span>
              {unpaidAttendees > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <strong>{unpaidAttendees}</strong> لم يدفعوا بعد ({(activity.basePrice * unpaidAttendees).toLocaleString()} {CURRENCY} متوقع)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 5: Costs Table ===== */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-500" />
              تكاليف النشاط
              <Badge variant="outline" className="mr-2 text-xs bg-neutral-50">{activityCosts.length} بند</Badge>
            </CardTitle>
            {activityCosts.length > 0 && (
              <span className="text-sm font-bold text-rose-600">
                الإجمالي: {expense.toLocaleString()} {CURRENCY}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
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
            <div className="text-center py-10 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-500 font-medium">لا توجد تكاليف مسجلة لهذا النشاط</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 6: Location + Drive (Side by Side) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Location details */}
        <div className="space-y-6 lg:col-span-1">
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

        {/* Drive Embed */}
        <div className="lg:col-span-2 h-[600px] md:h-auto flex flex-col">
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
