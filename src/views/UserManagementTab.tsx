import React, { useState } from 'react';
import { apiPost, apiPut, apiDelete } from '../lib/api';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, User as UserIcon, Plus, Key, Trash2, Shield, Settings } from 'lucide-react';
import { StaffMember } from '../types';
import { format } from 'date-fns';

const safeDate = (date: any) => {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date.seconds !== undefined) return new Date(date.seconds * 1000);
  return new Date(date);
};

const ALL_PERMISSIONS = [
  { id: 'activities', label: 'إدارة الأنشطة' },
  { id: 'bookings', label: 'إدارة الحجوزات' },
  { id: 'locations', label: 'أماكن الفعاليات' },
  { id: 'finances', label: 'الصلاحيات المالية' }
];

export default function UserManagementTab({ users, fetchAll }: { users: StaffMember[], fetchAll: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit user state
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'manager'>('manager');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState('');
  
  // Create state
  const [createPerms, setCreatePerms] = useState<string[]>(['activities', 'bookings', 'locations', 'finances']);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'admin' | 'manager';
    const displayName = formData.get('displayName') as string;

    try {
      await apiPost('/staff', {
        username,
        password,
        displayName,
        role,
        permissions: createPerms
      });
      toast.success('تم إضافة الموظف بنجاح');
      setOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إضافة الموظف');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (targetId: string | number) => {
    const r = await Swal.fire({ title: 'حذف الموظف؟', text: 'هل أنت متأكد من حذف هذا الموظف؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء', reverseButtons: true });
    if (!r.isConfirmed) return;
    try {
      await apiDelete(`/staff/${targetId}`);
      Swal.fire({ title: 'تم!', text: 'تم حذف الموظف بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });
      fetchAll();
    } catch (err: any) {
      Swal.fire({ title: 'خطأ', text: err.message || 'حدث خطأ أثناء حذف الموظف', icon: 'error' });
    }
  };

  const openEditModal = (user: StaffMember) => {
    setEditingUser(user);
    setEditName(user.displayName);
    setEditRole(user.role);
    try {
      setEditPerms(typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || []));
    } catch {
      setEditPerms([]);
    }
    setEditPassword('');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      await apiPut(`/staff/${editingUser.id}`, {
        displayName: editName,
        role: editRole,
        permissions: editPerms
      });
      // If password was provided, change it too
      if (editPassword && editPassword.length >= 4) {
        await apiPut(`/staff/${editingUser.id}/password`, { password: editPassword });
      }
      toast.success('تم تحديث معلومات الموظف بنجاح');
      setEditOpen(false);
      fetchAll();
    } catch(err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحديث الموظف');
    }
  };

  const handlePasswordChange = async (targetId: string | number) => {
    const newPass = prompt('أدخل كلمة المرور الجديدة:');
    if (newPass && newPass.length >= 4) {
      try {
        await apiPut(`/staff/${targetId}/password`, { password: newPass });
        toast.success('تم تغيير كلمة المرور');
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
      }
    } else if (newPass) {
      toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
    }
  };

  const toggleCreatePerm = (id: string, checked: boolean) => {
    if (checked) setCreatePerms([...createPerms, id]);
    else setCreatePerms(createPerms.filter(p => p !== id));
  };
  const toggleEditPerm = (id: string, checked: boolean) => {
    if (checked) setEditPerms([...editPerms, id]);
    else setEditPerms(editPerms.filter(p => p !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">إدارة الموظفين والصلاحيات</h2>
          <p className="text-neutral-500">تحكم كامل بحسابات الدخول والصلاحيات المخصصة لكل مستخدم</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 text-white"><Plus className="w-4 h-4 ml-2" /> إضافة موظف جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-xl">
            <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2"><Label>الاسم الكامل</Label><Input name="displayName" required /></div>
                 <div className="space-y-2"><Label>اسم المستخدم</Label><Input name="username" required dir="ltr" className="text-left" /></div>
                 <div className="space-y-2"><Label>كلمة المرور</Label><Input name="password" type="text" required dir="ltr" className="text-left" /></div>
                 <div className="space-y-2">
                   <Label>الدور (Role)</Label>
                   <Select name="role" defaultValue="manager">
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="manager">مدير (Manager)</SelectItem>
                       <SelectItem value="admin">مسؤول (Admin)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
              </div>
              <div className="pt-4 border-t">
                <Label className="block mb-3 font-bold text-neutral-900">الصلاحيات المخصصة للوصول:</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ALL_PERMISSIONS.map(p => (
                    <div key={p.id} className="flex items-center space-x-2 space-x-reverse bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                      <input 
                        type="checkbox"
                        id={`c_perm_${p.id}`} 
                        checked={createPerms.includes(p.id)}
                        onChange={(e) => toggleCreatePerm(p.id, e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                      />
                      <Label htmlFor={`c_perm_${p.id}`} className="cursor-pointer text-sm font-medium">{p.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="pt-4">
                 <Button type="submit" disabled={isCreating} className="w-full">{isCreating ? 'جاري الإضافة...' : 'حفظ الموظف'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم والصورة</TableHead>
                <TableHead className="text-right">اسم المستخدم</TableHead>
                <TableHead className="text-center">الصلاحية الكبرى</TableHead>
                <TableHead className="text-center">تاريخ الانضمام</TableHead>
                <TableHead className="text-center">آخر تسجيل دخول</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0 border">
                         {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-neutral-400" />}
                       </div>
                       <span className="font-medium text-neutral-900">{u.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">{u.username}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={u.role === 'admin' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                      {u.role === 'admin' ? 'مسؤول (Admin)' : 'مدير (Manager)'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{u.createdAt ? format(safeDate(u.createdAt)!, 'yyyy/MM/dd') : '-'}</TableCell>
                  <TableCell className="text-center text-sm text-neutral-500" dir="ltr">{u.lastLogin ? format(safeDate(u.lastLogin)!, 'yyyy/MM/dd - hh:mm a') : 'لم يسجل الدخول'}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-600 hover:text-emerald-600" onClick={() => openEditModal(u)}>
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 w-8" onClick={() => handleDeleteUser(u.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={6} className="text-center py-8 text-neutral-500">لا يوجد موظفين</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl" className="max-w-xl">
          <DialogHeader><DialogTitle>إعدادات الموظف وصلاحياته</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>الاسم الكامل</Label>
                   <Input value={editName} onChange={e => setEditName(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                   <Label>الدور (Role)</Label>
                   <Select value={editRole} onValueChange={(v: 'admin'|'manager') => setEditRole(v)}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="manager">مدير (Manager)</SelectItem>
                       <SelectItem value="admin">مسؤول (Admin)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>اسم المستخدم</Label>
                   <Input value={editingUser.username} readOnly disabled className="bg-neutral-100 text-neutral-500" dir="ltr" />
                 </div>
                 <div className="space-y-2">
                   <Label>كلمة مرور جديدة (اختياري)</Label>
                   <Input value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="اترك فارغاً للإبقاء على القديمة" type="text" dir="ltr" className="text-left" />
                 </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2 mt-2">
                 <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                 <p>تنبيه: المشرفون (Admins) لديهم صلاحية كاملة على كل شيء بصرف النظر عن الصلاحيات أدناه، وتخوّلهم أيضاً لرؤية هذه الشاشة (إدارة الموظفين).</p>
              </div>

              <div className="py-2">
                <Label className="block mb-3 font-bold text-neutral-900">الصلاحيات المخصصة (للمدراء):</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ALL_PERMISSIONS.map(p => (
                    <div key={p.id} className="flex items-center space-x-2 space-x-reverse bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                      <input 
                        type="checkbox"
                        id={`e_perm_${p.id}`} 
                        checked={editPerms.includes(p.id)}
                        onChange={(e) => toggleEditPerm(p.id, e.target.checked)}
                        disabled={editRole === 'admin'} // Admin has all logically
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 disabled:opacity-50"
                      />
                      <Label htmlFor={`e_perm_${p.id}`} className="cursor-pointer text-sm font-medium">{p.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="pt-2">
                 <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
                 <Button onClick={saveEdit}>حفظ التغييرات</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
