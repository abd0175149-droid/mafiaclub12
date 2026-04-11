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
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewportFile, setViewportFile] = useState<any | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const currentFolderId = folderStack.length > 0 
    ? folderStack[folderStack.length - 1].id 
    : rootFolderId;

  const fetchFiles = async (id: string) => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const data = await apiGet(`/drive/list?folderId=${id}`);
      setFiles(data || []);
    } catch (err: any) {
      if (err.message && err.message.includes('google-service-account')) {
        setError('مفتاح الخدمة google-service-account.json غير موجود في السيرفر.');
      } else {
        setError(err.message || 'فشل في جلب الملفات. تأكد من صحة الرابط والصلاحيات.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolderId) {
      fetchFiles(currentFolderId);
    }
  }, [currentFolderId]);

  const handleGoBack = () => setFolderStack(prev => prev.slice(0, -1));
  const handleGoHome = () => setFolderStack([]);

  const handleFileClick = (file: any) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setFolderStack(prev => [...prev, { id: file.id, label: file.name }]);
    } else {
      setViewportFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);
    formData.append('folderId', currentFolderId);

    setIsUploading(true);
    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: formData
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'فشل رفع الملف');
      }
      toast.success('تم رفع الملف بنجاح');
      fetchFiles(currentFolderId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string, fileName: string) => {
    e.stopPropagation();
    const r = await Swal.fire({ title: 'حذف الملف؟', text: `سيتم حذف ${fileName} بغير رجعة، تأكيد؟`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' });
    if (!r.isConfirmed) return;
    
    try {
      await apiDelete(`/drive/file/${fileId}`);
      toast.success('تم حذف الملف');
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err: any) {
      toast.error(err.message || 'خطأ في الحذف');
    }
  };

  if (!driveLink || !rootFolderId) {
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

  const renderIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return <FolderOpen className="w-8 h-8 text-blue-500" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-emerald-500" />;
    if (mimeType.startsWith('video/')) return <VideoIcon className="w-8 h-8 text-purple-500" />;
    return <File className="w-8 h-8 text-neutral-400" />;
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-neutral-50/50">
      {/* Navigation toolbar */}
      <div className="flex flex-col gap-2 px-4 py-2 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10">
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

          <div className="flex items-center gap-1 shrink-0">
            {folderStack.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="h-7 text-xs gap-1">
                <ArrowRight className="w-3 h-3" /> رجوع
              </Button>
            )}
            {/* hidden upload input */}
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
            <Button 
              size="sm" 
              onClick={handleUploadClick} 
              disabled={isUploading}
              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              رفع
            </Button>
            <a 
              href={`https://drive.google.com/drive/folders/${currentFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Drive دائم
            </a>
          </div>
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-auto p-4 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
             <AlertTriangle className="w-12 h-12 text-rose-500" />
             <p className="text-neutral-900 font-bold text-lg">تعذر الوصول للملفات</p>
             <p className="text-neutral-500 text-sm max-w-sm">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
            <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
            <p>المجلد فارغ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map(file => (
              <div 
                key={file.id} 
                onClick={() => handleFileClick(file)}
                className="group relative bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer aspect-square flex flex-col"
              >
                <div className="flex-1 bg-neutral-50 flex items-center justify-center relative overflow-hidden group">
                  {file.thumbnailLink ? (
                    <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    renderIcon(file.mimeType)
                  )}
                  {file.mimeType.startsWith('video/') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                       <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                         <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[12px] border-l-white border-b-8 border-b-transparent ml-1" />
                       </div>
                    </div>
                  )}

                  {/* Delete Button overlaid on hover */}
                  {file.mimeType !== 'application/vnd.google-apps.folder' && (
                    <button 
                      onClick={(e) => handleDeleteFile(e, file.id, file.name)} 
                      className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="حذف الملف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="p-3 shrink-0 bg-white">
                  <p className="text-xs font-bold text-neutral-800 truncate" title={file.name}>{file.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Previewer */}
      {viewportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/95 backdrop-blur-md p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-neutral-800 rounded-full z-50 h-12 w-12"
            onClick={() => setViewportFile(null)}
          >
            <X className="w-8 h-8" />
          </Button>

          <div className="relative w-full h-full max-w-6xl max-h-[90vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            {viewportFile.mimeType.startsWith('image/') ? (
              <img src={`/api/drive/file/${viewportFile.id}`} alt={viewportFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            ) : viewportFile.mimeType.startsWith('video/') ? (
              <video src={`/api/drive/file/${viewportFile.id}`} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl bg-black" />
            ) : (
              <div className="bg-white p-8 rounded-xl text-center max-w-md w-full">
                {renderIcon(viewportFile.mimeType)}
                <h3 className="mt-4 font-bold text-lg mb-2 truncate">{viewportFile.name}</h3>
                <p className="text-neutral-500 text-sm mb-6">لا يمكن معاينة هذا النوع من الملفات مباشرة.</p>
                <a href={`/api/drive/file/${viewportFile.id}`} target="_blank" rel="noreferrer" download>
                  <Button className="w-full gap-2">
                     <Download className="w-4 h-4" /> تحميل الملف
                  </Button>
                </a>
              </div>
            )}
            
            {/* File info footer */}
            <div className="absolute bottom-[-10px] bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md">
               {viewportFile.name}
            </div>
          </div>
        </div>
      )}
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
