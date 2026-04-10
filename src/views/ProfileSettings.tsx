import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiPut } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, User as UserIcon } from 'lucide-react';
import { ImageCropper } from '@/components/ImageCropper';

export default function ProfileSettings() {
  const { profile, checkAuth } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await apiPut('/staff/me', { displayName, photoURL });
      toast.success('تم تحديث الملف الشخصي بنجاح');
      if (checkAuth) checkAuth(); // Refresh profile in context
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !newPassword) return;
    setIsUpdating(true);
    try {
      await apiPut(`/staff/${profile.id}/password`, { password: newPassword });
      setNewPassword('');
      toast.success('تم تغيير كلمة المرور بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">إعدادات الحساب</h2>
        <p className="text-neutral-500">إدارة معلوماتك الشخصية وكلمة المرور</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">المعلومات الشخصية</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex flex-col items-center justify-center mb-6 relative">
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                  {photoURL ? <img src={photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-12 h-12 text-neutral-300" />}
                </div>
                <Label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-neutral-900 border-2 border-white text-white p-1.5 rounded-full cursor-pointer hover:bg-neutral-800 transition-colors shadow-sm">
                  <Pencil className="w-4 h-4" />
                </Label>
                <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>الاسم المعروض</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={isUpdating} className="w-full">حفظ التغييرات</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">تغيير كلمة المرور</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>كلمة المرور الجديدة</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={4} />
            </div>
            <Button type="submit" variant="outline" disabled={isUpdating || !newPassword} className="w-full">تحديث كلمة المرور</Button>
          </form>
        </CardContent>
      </Card>

      {cropImageSrc && (
        <ImageCropper 
          imageSrc={cropImageSrc} 
          onCropComplete={(base64) => {
             setPhotoURL(base64);
             setCropImageSrc(null);
          }} 
          onCancel={() => setCropImageSrc(null)} 
        />
      )}
    </div>
  );
}
