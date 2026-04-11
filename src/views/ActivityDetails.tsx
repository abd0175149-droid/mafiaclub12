import React, { useState, useEffect } from 'react';
import { Activity, Booking, Cost, Location } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, ArrowRight, DollarSign, Users, Link as LinkIcon, Gift, Calendar, AlertTriangle, FolderOpen, ChevronRight, Home, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

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

// Extract folder ID from any Google Drive folder URL
const extractFolderId = (link?: string): string | null => {
  if (!link) return null;
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Also check embeddedfolderview format
  const embedMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
};

// Convert Google Drive links to embeddable URLs
const getEmbedUrl = (link?: string) => {
  if (!link) return null;
  const folderMatch = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return 'https://drive.google.com/embeddedfolderview?id=' + folderMatch[1] + '#list';
  }
  const fileMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return 'https://drive.google.com/file/d/' + fileMatch[1] + '/preview';
  }
  const docsMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch && link.includes('docs.google.com')) {
    return link.replace(/\/edit.*$/, '/preview');
  }
  return link;
};

// Drive Folder Browser Component
function DriveFolderBrowser({ driveLink }: { driveLink?: string }) {
  const rootFolderId = extractFolderId(driveLink);
  const [folderStack, setFolderStack] = useState<{ id: string; label: string }[]>([]);
  const [pasteUrl, setPasteUrl] = useState('');
  
  const currentFolderId = folderStack.length > 0 
    ? folderStack[folderStack.length - 1].id 
    : rootFolderId;

  const embedUrl = currentFolderId 
    ? `https://drive.google.com/embeddedfolderview?id=${currentFolderId}#list`
    : getEmbedUrl(driveLink);

  const handleGoBack = () => {
    setFolderStack(prev => prev.slice(0, -1));
  };

  const handleGoHome = () => {
    setFolderStack([]);
  };

  // Navigate to folder from pasted URL
  const navigateToFolder = (url: string) => {
    if (!url) return;
    const folderId = extractFolderId(url);
    if (folderId && folderId !== currentFolderId) {
      setFolderStack(prev => [...prev, { id: folderId, label: `مجلد ${prev.length + 1}` }]);
      setPasteUrl('');
      return true;
    }
    return false;
  };

  // 🔥 Auto-detect paste (Ctrl+V) anywhere on the page
  // If user pastes a Google Drive folder URL, auto-navigate!
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      if (text.includes('drive.google.com') && (text.includes('/folders/') || text.includes('id='))) {
        const folderId = extractFolderId(text);
        if (folderId && folderId !== currentFolderId) {
          e.preventDefault();
          setFolderStack(prev => [...prev, { id: folderId, label: `مجلد ${prev.length + 1}` }]);
          setPasteUrl('');
        }
      }
    };
    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [currentFolderId]);

  if (!driveLink || !embedUrl) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 p-8 text-center space-y-3">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle className="w-8 h-8 text-neutral-300" />
        </div>
        <p className="font-bold text-neutral-600">لم يتم إرفاق رابط Drive</p>
        <p className="text-sm text-neutral-400 max-w-sm">قم بتعديل بيانات الفعالية وإضافة رابط مجلد Google Drive لتتمكن من معاينة الملفات هنا.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Navigation toolbar */}
      <div className="flex flex-col gap-2 px-4 py-2 bg-white border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-1 min-w-0 text-sm">
            <button 
              onClick={handleGoHome}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 transition-colors shrink-0 ${folderStack.length === 0 ? 'text-neutral-900 font-bold' : 'text-blue-600'}`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>الرئيسي</span>
            </button>
            {folderStack.map((folder, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="w-3 h-3 text-neutral-300 shrink-0 rotate-180" />
                <button
                  onClick={() => setFolderStack(prev => prev.slice(0, i + 1))}
                  className={`px-2 py-1 rounded hover:bg-neutral-100 transition-colors truncate max-w-[120px] ${i === folderStack.length - 1 ? 'text-neutral-900 font-bold' : 'text-blue-600'}`}
                >
                  {folder.label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {folderStack.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="h-7 text-xs gap-1">
                <ArrowRight className="w-3 h-3" /> رجوع
              </Button>
            )}
            <a 
              href={`https://drive.google.com/drive/folders/${currentFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> فتح في Drive
            </a>
          </div>
        </div>
        
        {/* URL Paste input - always visible */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigateToFolder(pasteUrl); }}
              placeholder="📂 لفتح مجلد فرعي: انقر بالزر الأيمن على المجلد → نسخ الرابط → الصقه هنا"
              className="w-full h-8 px-3 text-xs border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none transition-all placeholder:text-neutral-400"
              dir="rtl"
            />
          </div>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigateToFolder(pasteUrl)}
            disabled={!pasteUrl}
            className="h-8 text-xs px-3 shrink-0"
          >
            <FolderOpen className="w-3 h-3 ml-1" /> انتقال
          </Button>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 relative">
        <iframe 
          key={currentFolderId}
          src={embedUrl} 
          className="w-full h-full border-none absolute inset-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          allow="autoplay"
          title="Google Drive Activity Files"
        />
      </div>
    </div>
  );
}

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
                        {location.offers.map((offer, i) => <li key={i} className="line-clamp-2">{offer}</li>)}
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
