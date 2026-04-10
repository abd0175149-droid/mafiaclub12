import React, { useState } from 'react';
import { Activity, Booking, Cost, FoundationalCost } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, DollarSign, Plus, ArrowLeftRight, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';
import { apiPost, apiDelete } from '../lib/api';
import { toast } from 'sonner';

interface FinanceViewProps {
  activities: Activity[];
  bookings: Booking[];
  costs: Cost[];
  foundationalCosts: FoundationalCost[];
  fetchData: () => void;
}

export default function FinanceView({ activities, bookings, costs, foundationalCosts, fetchData }: FinanceViewProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'transactions' | 'foundational'>('transactions');

  // Transactions State
  const [costItem, setCostItem] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costActivityId, setCostActivityId] = useState<string>('general');
  const [costPaidBy, setCostPaidBy] = useState('');
  const [isAddingCost, setIsAddingCost] = useState(false);

  // Foundational State
  const [fItem, setFItem] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fPaidBy, setFPaidBy] = useState('');
  const [fSource, setFSource] = useState('');
  const [isAddingF, setIsAddingF] = useState(false);

  // Handlers
  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costItem || !costAmount) return toast.error('بيانات ناقصة');
    setIsAddingCost(true);
    try {
      await apiPost('/costs', {
        item: costItem,
        amount: parseFloat(costAmount),
        activityId: costActivityId === 'general' ? null : Number(costActivityId),
        date: new Date().toISOString(),
        paidBy: costPaidBy,
        type: costActivityId === 'general' ? 'general' : 'activity'
      });
      toast.success('تمت إضافة التكلفة');
      setCostItem(''); setCostAmount(''); setCostActivityId('general'); setCostPaidBy('');
      fetchData();
    } catch (err: any) { toast.error(err.message || 'خطأ'); }
    setIsAddingCost(false);
  };

  const handleDeleteCost = async (id: string | number) => {
    if (!window.confirm('موافق على الحذف؟')) return;
    try {
      await apiDelete(`/costs/${id}`);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddFoundational = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fItem || !fAmount) return;
    setIsAddingF(true);
    try {
      await apiPost('/foundational', { item: fItem, amount: parseFloat(fAmount), paidBy: fPaidBy, source: fSource, date: new Date().toISOString() });
      toast.success('تمت الإضافة');
      setFItem(''); setFAmount(''); setFPaidBy(''); setFSource('');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    setIsAddingF(false);
  };

  const handleDeleteFoundational = async (id: string | number) => {
    if (!window.confirm('موافق على الحذف؟')) return;
    try {
      await apiDelete(`/foundational/${id}`);
      fetchData();
    } catch (err: any) { toast.error(err.message); }
  };

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const totalFoundational = foundationalCosts.reduce((s, c) => s + c.amount, 0);

  // Compile Transactions
  const revenues = bookings.filter(b => b.isPaid).map(b => ({
    id: `rev-${b.id}`, date: b.createdAt, description: `حجز: ${b.name}`,
    amount: b.paidAmount, type: 'revenue' as const, reference: activities.find(a => a.id === b.activityId)?.name || 'غير معروف'
  }));
  const expenses = costs.map(c => ({
    id: `exp-${c.id}`, date: c.date, description: c.item,
    amount: c.amount, type: 'expense' as const, reference: c.type === 'activity' ? activities.find(a => a.id === c.activityId)?.name : 'تكاليف عامة',
    rawId: c.id
  }));
  const transactions = [...revenues, ...expenses].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
      
      {/* Finance Internal Sidebar */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-3 p-4 rounded-xl text-right transition-all font-bold ${activeTab === 'transactions' ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white hover:bg-neutral-100 text-neutral-600'}`}
        >
          <ArrowLeftRight className="w-5 h-5 flex-shrink-0" />
          <span>المالية والحركات</span>
        </button>
        <button 
          onClick={() => setActiveTab('foundational')}
          className={`flex items-center gap-3 p-4 rounded-xl text-right transition-all font-bold ${activeTab === 'foundational' ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white hover:bg-neutral-100 text-neutral-600'}`}
        >
          <Building2 className="w-5 h-5 flex-shrink-0" />
          <span>مصاريف التأسيس</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
        
        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="text-emerald-500" /> الحركات المالية وتكاليف الأنشطة</h2>
            </div>
            
            <form onSubmit={handleAddCost} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <Input placeholder="وصف التكلفة..." value={costItem} onChange={e => setCostItem(e.target.value)} required className="bg-white" />
              <Input type="number" placeholder="المبلغ (د.أ)" value={costAmount} onChange={e => setCostAmount(e.target.value)} required className="bg-white" />
              <Input placeholder="دفع بواسطة (اختياري)" value={costPaidBy} onChange={e => setCostPaidBy(e.target.value)} className="bg-white" />
              <Select value={costActivityId} onValueChange={setCostActivityId}>
                 <SelectTrigger className="bg-white"><SelectValue placeholder="ارتباط بتكلفة" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="general">تكاليف عامة</SelectItem>
                   {activities.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                 </SelectContent>
              </Select>
              <Button type="submit" disabled={isAddingCost} className="bg-neutral-900 text-white"><Plus className="w-4 h-4 ml-2" /> تسجيل</Button>
            </form>

            <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-neutral-50 sticky top-0">
                  <TableRow>
                     <TableHead className="text-right">التاريخ</TableHead>
                     <TableHead className="text-right">البيان</TableHead>
                     <TableHead className="text-right">الارتباط</TableHead>
                     <TableHead className="text-right">النوع</TableHead>
                     <TableHead className="text-right">المبلغ</TableHead>
                     <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                       <TableCell className="text-xs text-neutral-500">{t.date ? format(new Date(t.date), 'dd/MM HH:mm') : '-'}</TableCell>
                       <TableCell className="font-bold">{t.description}</TableCell>
                       <TableCell><Badge variant="outline" className="bg-neutral-100">{t.reference}</Badge></TableCell>
                       <TableCell>{t.type === 'revenue' ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">إيراد</Badge> : <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">صرف</Badge>}</TableCell>
                       <TableCell className="font-bold">{t.amount} د.أ</TableCell>
                       <TableCell>
                         {isAdmin && t.type === 'expense' && (
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteCost(t.rawId)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                         )}
                       </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-neutral-400">لا توجد حركات مسجلة</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Foundational Tab */}
        {activeTab === 'foundational' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="text-blue-500" /> مصاريف التأسيس</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm">
                الإجمالي: {totalFoundational} د.أ
              </Badge>
            </div>
            
            <form onSubmit={handleAddFoundational} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <Input placeholder="البيان..." value={fItem} onChange={e => setFItem(e.target.value)} required className="bg-white" />
              <Input type="number" placeholder="المبلغ" value={fAmount} onChange={e => setFAmount(e.target.value)} required className="bg-white" />
              <Input placeholder="دفع بواسطة" value={fPaidBy} onChange={e => setFPaidBy(e.target.value)} className="bg-white" />
              <Input placeholder="المصدر / تفاصيل" value={fSource} onChange={e => setFSource(e.target.value)} className="bg-white" />
              <Button type="submit" disabled={isAddingF} className="bg-neutral-900 text-white"><Plus className="w-4 h-4 ml-2" /> أضف مصاريف</Button>
            </form>

            <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-neutral-50 sticky top-0">
                   <TableRow>
                     <TableHead className="text-right">التاريخ</TableHead>
                     <TableHead className="text-right">البيان</TableHead>
                     <TableHead className="text-right">المبلغ</TableHead>
                     <TableHead className="text-right">معلومات الدفع</TableHead>
                     <TableHead></TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {foundationalCosts.map(cost => (
                    <TableRow key={cost.id}>
                      <TableCell className="text-xs text-neutral-500">{cost.date ? format(new Date(cost.date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="font-bold">{cost.item}</TableCell>
                      <TableCell className="text-rose-600 font-bold">{cost.amount} د.أ</TableCell>
                      <TableCell className="text-xs">
                        <div className="text-neutral-500 flex gap-2"><span className="text-neutral-900">{cost.paidBy}</span> {cost.source && `| ${cost.source}`}</div>
                      </TableCell>
                      <TableCell>
                         {isAdmin && (
                            <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleDeleteFoundational(cost.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                         )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {foundationalCosts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-neutral-400">لا توجد مصاريف تأسيس مسجلة</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
