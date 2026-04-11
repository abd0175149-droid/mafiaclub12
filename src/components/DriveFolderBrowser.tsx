import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ArrowRight, AlertTriangle, FolderOpen, ChevronRight, Home, ExternalLink, File, Image as ImageIcon, Video as VideoIcon, Download, Loader2, X, Upload, Trash2, FolderPlus, Search, Edit2, Link as LinkIcon, MoreVertical, Copy, Share2, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { apiGet, apiDelete, apiPost, apiPut } from '../lib/api';

export const extractFolderId = (link?: string): string | null => {
  if (!link) return null;
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const embedMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
};

export default function DriveFolderBrowser({ driveLink }: { driveLink?: string }) {
  const rootFolderId = extractFolderId(driveLink);
  const [folderStack, setFolderStack] = useState<{ id: string; label: string }[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewportFile, setViewportFile] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [replaceFileId, setReplaceFileId] = useState<string | null>(null);
  
  const currentFolderId = folderStack.length > 0 
    ? folderStack[folderStack.length - 1].id 
    : rootFolderId;

  const fetchFiles = async (id: string, q?: string) => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      let url = `/drive/list?folderId=${id}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;
      const data = await apiGet(url);
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
      const delay = setTimeout(() => {
        fetchFiles(currentFolderId, searchQuery);
      }, 500);
      return () => clearTimeout(delay);
    }
  }, [currentFolderId, searchQuery]);

  const handleGoBack = () => setFolderStack(prev => prev.slice(0, -1));
  const handleGoHome = () => setFolderStack([]);

  const handleFileClick = (file: any) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setFolderStack(prev => [...prev, { id: file.id, label: file.name }]);
      setSearchQuery('');
    } else {
      setViewportFile(file);
    }
  };

  const handleUploadClick = () => {
    setReplaceFileId(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);
    formData.append('folderId', currentFolderId!);
    if (replaceFileId) formData.append('replaceFileId', replaceFileId);

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
      toast.success(replaceFileId ? 'تم تحديث الإصدار بنجاح' : 'تم رفع الملف بنجاح');
      fetchFiles(currentFolderId!);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
      setReplaceFileId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async () => {
    const { value: folderName } = await Swal.fire({
      title: 'إنشاء مجلد جديد',
      input: 'text',
      inputPlaceholder: 'اسم المجلد...',
      showCancelButton: true,
      confirmButtonText: 'إنشاء',
      cancelButtonText: 'إلغاء'
    });

    if (!folderName) return;
    try {
      await apiPost('/drive/folder', { name: folderName, parentId: currentFolderId });
      toast.success('تم إنشاء المجلد');
      fetchFiles(currentFolderId!);
    } catch (err: any) {
      toast.error(err.message || 'خطأ في إنشاء المجلد');
    }
  };

  const handleRename = async (e: React.MouseEvent, fileId: string, currentName: string) => {
    e.stopPropagation();
    const { value: newName } = await Swal.fire({
      title: 'إعادة التسمية',
      input: 'text',
      inputValue: currentName,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء'
    });

    if (!newName || newName === currentName) return;
    try {
      await apiPut(`/drive/file/${fileId}`, { name: newName });
      toast.success('تم تعديل الاسم');
      fetchFiles(currentFolderId!);
    } catch (err: any) {
      toast.error(err.message || 'خطأ في إعادة التسمية');
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      await apiPost(`/drive/file/${fileId}/copy`, {});
      toast.success('تم استنساخ الملف');
      fetchFiles(currentFolderId!);
    } catch (err: any) {
      toast.error(err.message || 'خطأ في الاستنساخ');
    }
  };

  const handleTrash = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const r = await Swal.fire({ title: 'سلة المهملات', text: `سيتم نقل الملف للمهملات، متأكد؟`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' });
    if (!r.isConfirmed) return;
    try {
      await apiPut(`/drive/file/${fileId}`, { trashed: true });
      toast.success('تم نقل الملف للمهملات');
      fetchFiles(currentFolderId!);
    } catch (err: any) {
      toast.error(err.message || 'خطأ');
    }
  };

  const handleDeletePermanent = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const r = await Swal.fire({ title: 'حذف نهائي', text: `سيتم حذف الملف نهائياً ولا يمكن استعادته!`, icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء' });
    if (!r.isConfirmed) return;
    try {
      await apiDelete(`/drive/file/${fileId}`);
      toast.success('تم الحذف النهائي');
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err: any) {
      toast.error(err.message || 'خطأ');
    }
  };

  const handleCopyLink = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    if (!link) {
      toast.error('لا يوجد رابط متاح حاليا');
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ الرابط الأصل');
  };

  const handleUpdateVersion = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setReplaceFileId(fileId);
    fileInputRef.current?.click();
  };

  const handleShare = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const { value: email } = await Swal.fire({
      title: 'مشاركة الملف',
      text: 'أدخل الإيميل لمشاركته، أو اترك الحقل فارغاً لجعله عاماً لأي شخص يملك الرابط.',
      input: 'email',
      showCancelButton: true,
      confirmButtonText: 'مشاركة',
      cancelButtonText: 'إلغاء'
    });

    if (email === false) return; // Cancelled
    try {
      await apiPost(`/drive/file/${fileId}/share`, { emailAddress: email || undefined });
      toast.success('تم تحديث صلاحيات المشاركة');
    } catch (err: any) {
      toast.error(err.message || 'خطأ في مشاركة الملف');
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
    if (mimeType === 'application/pdf') return <File className="w-8 h-8 text-rose-500 fill-rose-50" />;
    return <File className="w-8 h-8 text-neutral-400" />;
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-neutral-50/50">
      {/* Navigation toolbar */}
      <div className="flex flex-col gap-2 px-4 py-2 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-1 min-w-0 text-sm">
            <button 
              onClick={handleGoHome}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 transition-colors shrink-0 ${folderStack.length === 0 ? 'text-neutral-900 font-bold' : 'text-blue-600'}`}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الرئيسي</span>
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

          <div className="flex items-center gap-1 shrink-0 bg-neutral-100 rounded-full px-2 py-1 border border-neutral-200 focus-within:border-blue-400 focus-within:bg-white w-full max-w-[200px]">
            <Search className="w-3 h-3 text-neutral-400 shrink-0" />
            <Input 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="بحث في المجلد..." 
              className="h-6 border-none bg-transparent shadow-none focus-visible:ring-0 text-xs px-1"
            />
            {searchQuery && <X className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-rose-500 shrink-0" onClick={() => setSearchQuery('')} />}
          </div>

          <div className="flex items-center gap-1 shrink-0 mt-2 sm:mt-0">
            {folderStack.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="h-7 text-xs gap-1">
                <ArrowRight className="w-3 h-3" /> رجوع
              </Button>
            )}
            
            <Button size="sm" onClick={handleCreateFolder} variant="outline" className="h-7 px-3 text-xs gap-1 border-dashed">
              <FolderPlus className="w-3 h-3" /> مجلد جديد
            </Button>
            
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
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors hidden sm:inline-flex"
            >
              <ExternalLink className="w-3 h-3" /> 드رايف
            </a>
          </div>
        </div>
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-auto p-4 relative" dir="rtl">
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
            <p>لا يوجد ملفات هنا</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map(file => (
              <div 
                key={file.id} 
                onClick={() => handleFileClick(file)}
                className="group relative bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-300 transition-all cursor-pointer aspect-square flex flex-col"
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

                  {/* Context Menu Dropdown */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 bg-white/90 hover:bg-neutral-100 backdrop-blur shadow-sm text-neutral-700 rounded-md">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-right" dir="rtl">
                        <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleCopyLink(e as any, file.webViewLink)}>
                          <LinkIcon className="w-4 h-4" /> نسخ الرابط 
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleRename(e as any, file.id, file.name)}>
                          <Edit2 className="w-4 h-4" /> إعادة التسمية
                        </DropdownMenuItem>
                        
                        {file.mimeType !== 'application/vnd.google-apps.folder' && (
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleDuplicate(e as any, file.id)}>
                            <Copy className="w-4 h-4" /> استنساخ (Duplicate)
                          </DropdownMenuItem>
                        )}
                        {file.mimeType !== 'application/vnd.google-apps.folder' && (
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleUpdateVersion(e as any, file.id)}>
                            <FileUp className="w-4 h-4" /> تحديث إصدار (إحلال)
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem className="cursor-pointer gap-2" onClick={(e) => handleShare(e as any, file.id)}>
                          <Share2 className="w-4 h-4" /> مشاركة الملف
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700" onClick={(e) => handleTrash(e as any, file.id)}>
                          <Trash2 className="w-4 h-4" /> سلة المهملات
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer gap-2 text-red-700 focus:text-red-800 bg-red-50 focus:bg-red-100" onClick={(e) => handleDeletePermanent(e as any, file.id)}>
                          <X className="w-4 h-4" /> حذف نهائي
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="p-3 shrink-0 bg-white border-t border-neutral-100">
                  <p className="text-xs font-bold text-neutral-800 truncate" title={file.name}>{file.name}</p>
                  {file.size && <p className="text-[10px] text-neutral-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Previewer */}
      {viewportFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/95 backdrop-blur-md p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-neutral-800 rounded-full z-[110] h-12 w-12"
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
                <div className="flex gap-2">
                  <a href={`/api/drive/file/${viewportFile.id}`} target="_blank" rel="noreferrer" download className="flex-1">
                    <Button className="w-full gap-2">
                       <Download className="w-4 h-4" /> تحميل
                    </Button>
                  </a>
                  <a href={viewportFile.webViewLink} target="_blank" rel="noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                       <ExternalLink className="w-4 h-4" /> فتح الأصل
                    </Button>
                  </a>
                </div>
              </div>
            )}
            
            {/* File info footer */}
            <div className="absolute bottom-[-10px] bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md flex items-center gap-2">
               <span>{viewportFile.name}</span>
               {viewportFile.webViewLink && (
                 <a href={viewportFile.webViewLink} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-white transition-colors" title="Открыть в Google Drive" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3 h-3" />
                 </a>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
