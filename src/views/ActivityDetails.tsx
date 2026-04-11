import React, { useState, useEffect } from 'react';
import { Activity, Booking, Cost, Location } from '../types';
import { apiGet, apiDelete } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, ArrowRight, DollarSign, Users, Link as LinkIcon, Gift, Calendar, AlertTriangle, FolderOpen, ChevronRight, Home, ExternalLink, File, Image as ImageIcon, Video as VideoIcon, Download, Loader2, X, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

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

import DriveFolderBrowser from '@/components/DriveFolderBrowser';

export default function ActivityDetails({ activity, location, bookings, costs, onBack }: ActivityDetailsProps) {
  const activityBookings = bookings.filter(b => b.activityId === activity.id);
  const activityCosts = costs.filter(c => c.activityId === activity.id);

  const revenue = activityBookings.reduce((sum, b) => sum + (b.isPaid ? b.paidAmount : 0), 0);
  const expense = activityCosts.reduce((sum, c) => sum + c.amount, 0);
  const profit = revenue - expense;

  const totalAttendees = activityBookings.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="space-y-6 h-[calc(100vh-80px)] overflow-auto pb-10" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-neutral-50/80 backdrop-blur-md z-10 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-full h-10 w-10 shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              {activity.name}
            </h1>
            <p className="text-sm text-neutral-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(safeDate(activity.date), 'dd MMMM yyyy - hh:mm a')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Metadata & Stats) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Financial Summary */}
          <Card className="border-none shadow-sm bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-300 font-medium">صافي الربح</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold mb-4">{profit.toLocaleString()} د.أ</div>
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-700 pt-4 text-sm">
                <div>
                  <div className="text-neutral-400">الإيرادات</div>
                  <div className="font-bold text-emerald-400">+{revenue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-neutral-400">التكاليف</div>
                  <div className="font-bold text-rose-400">-{expense.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings Summary */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" /> ملخص الحضور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttendees} <span className="text-sm font-normal text-neutral-500">حضور</span></div>
              <p className="text-sm text-neutral-500 mt-1">من {activityBookings.length} عملية حجز</p>
            </CardContent>
          </Card>

          {/* Location details */}
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
                                 <Badge variant="outline" className="mr-2 text-rose-500 border-rose-200 bg-rose-50 px-1 py-0!">{offer.price} د.أ</Badge>
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

        {/* Right Column (Drive Embed) */}
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
