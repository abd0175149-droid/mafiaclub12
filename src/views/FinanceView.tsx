import React, { useState, useMemo } from 'react';
import { Activity, Booking, Cost, FoundationalCost, StaffMember, Location, normalizeOffer, BookingOfferItem } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls, usePagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, DollarSign, Plus, ArrowLeftRight, Building2, Filter, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';
import { apiPost, apiDelete, apiPut } from '../lib/api';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

interface FinanceViewProps {
  activities: Activity[];
  bookings: Booking[];
  costs: Cost[];
  foundationalCosts: FoundationalCost[];
  fetchData: () => void;
  staff: StaffMember[];
  locations: Location[];
}

export default function FinanceView({ activities, bookings, costs, foundationalCosts, fetchData, staff, locations }: FinanceViewProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isLocationOwner = profile?.role === 'location_owner';
  const [activeTab, setActiveTab] = useState<'transactions' | 'foundational' | 'venue_dues'>('transactions');

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

  // --- Filter State (for all users) ---
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all');
  const [filterReference, setFilterReference] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

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
    const r = await Swal.fire({ title: 'حذف التكلفة؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء', reverseButtons: true });
    if (!r.isConfirmed) return;
    try {
      await apiDelete(`/costs/${id}`);
      Swal.fire({ title: 'تم!', icon: 'success', timer: 1200, showConfirmButton: false });
      fetchData();
    } catch (err: any) { Swal.fire({ title: 'خطأ', text: err.message, icon: 'error' }); }
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
    const r = await Swal.fire({ title: 'حذف التكلفة التأسيسية؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء', reverseButtons: true });
    if (!r.isConfirmed) return;
    try {
    } catch (err: any) { Swal.fire({ title: 'خطأ', text: err.message, icon: 'error' }); }
  };

  const handleToggleProcessed = async (id: string | number, isProcessed: boolean) => {
    try {
      await apiPut(`/foundational/${id}/process`, { isProcessed });
      toast.success('تم تحديث حالة المعالجة');
      fetchData();
    } catch (err: any) { toast.error(err.message || 'حدث خطأ'); }
  };

  const showPartnerStats = (personPaidBy: string) => {
    if (!personPaidBy) return;
    const cleanPerson = String(personPaidBy).trim();
    const partnerCount = Math.max(staff.filter(s => s.isPartner === 1 || s.isPartner === true).length, 1);
    const grandTotal = foundationalCosts.reduce((s, c) => s + Number(c.amount || 0), 0);
    if (grandTotal === 0) return;

    const allProcessedTotal = foundationalCosts.filter(c => c.isProcessed == 1 || c.isProcessed === true).reduce((s, c) => s + Number(c.amount || 0), 0);
    const personUnprocessed = foundationalCosts.filter(c => String(c.paidBy).trim() === cleanPerson && c.isProcessed != 1 && c.isProcessed !== true).reduce((s, c) => s + Number(c.amount || 0), 0);
    
    const fraction = (personUnprocessed + (allProcessedTotal / partnerCount)) / grandTotal;
    const percentage = (fraction * 100).toFixed(2);

    Swal.fire({
      title: 'إحصائيات المساهمة',
      html: `
        <div style="text-align:right; direction:rtl; line-height:2;">
           <p><strong>الشريك:</strong> ${personPaidBy}</p>
           <p><strong>إجمالي المبالغ غير المعالجة للشريك:</strong> <span style="color:red">${personUnprocessed} د.أ</span></p>
           <p><strong>إجمالي المبالغ المعالجة للجميع:</strong> <span style="color:green">${allProcessedTotal} د.أ</span></p>
           <p><strong>عدد الشركاء المعتمدين بالقسمة:</strong> ${partnerCount}</p>
           <hr style="margin:10px 0"/>
           <p><strong>إجمالي مصاريف التأسيس:</strong> ${grandTotal} د.أ</p>
           <h3 style="margin-top:15px; color:#2563eb">نسبة المساهمة الحالية: %${percentage}</h3>
        </div>
      `,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#0f172a'
    });
  };

  const totalFoundational = foundationalCosts.reduce((s, c) => s + c.amount, 0);

  // Helper: get club or venue revenue from booking
  const getBookingDisplayAmount = (b: Booking) => {
    if (isLocationOwner) {
      // Location owner sees their venue share only
      if (b.offerItems && b.offerItems.length > 0) {
        return b.offerItems.reduce((s, item) => s + (item.venueShare * item.quantity), 0);
      }
      return 0; // Legacy bookings without offers: location owner sees 0
    }
    // Admin sees club share
    if (b.offerItems && b.offerItems.length > 0) {
      return b.offerItems.reduce((s, item) => s + (item.clubShare * item.quantity), 0);
    }
    return b.paidAmount;
  };

  // Compile Transactions
  const revenues = bookings.filter(b => b.isPaid).map(b => ({
    id: `rev-${b.id}`, date: b.createdAt, description: `حجز: ${b.name}`,
    amount: getBookingDisplayAmount(b), type: 'revenue' as const, reference: activities.find(a => a.id === b.activityId)?.name || 'غير معروف',
    rawId: b.id, activityId: b.activityId
  }));
  const expenses = isLocationOwner ? [] : costs.map(c => ({
    id: `exp-${c.id}`, date: c.date, description: c.item,
    amount: c.amount, type: 'expense' as const, reference: c.type === 'activity' ? activities.find(a => a.id === c.activityId)?.name : 'تكاليف عامة',
    rawId: c.id, activityId: c.activityId
  }));
  const allTransactions = [...revenues, ...expenses].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  // --- Apply Filters ---
  const filteredTransactions = useMemo(() => {
    let result = allTransactions;

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }

    // Filter by reference (activity name)
    if (filterReference !== 'all') {
      result = result.filter(t => t.reference === filterReference);
    }

    // Filter by date range
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(t => t.date && new Date(t.date) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => t.date && new Date(t.date) <= to);
    }

    return result;
  }, [allTransactions, filterType, filterReference, filterDateFrom, filterDateTo]);

  // Unique references for filter dropdown
  const uniqueReferences = useMemo(() => {
    const refs = new Set(allTransactions.map(t => t.reference).filter(Boolean));
    return Array.from(refs);
  }, [allTransactions]);

  const transactionsPagination = usePagination(filteredTransactions, 10);
  const foundationalPagination = usePagination(foundationalCosts, 10);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      
      {/* Finance Internal Sidebar */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-3 p-3 rounded-xl text-right transition-all font-bold ${activeTab === 'transactions' ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white hover:bg-neutral-100 text-neutral-600'}`}
        >
          <ArrowLeftRight className="w-5 h-5 flex-shrink-0" />
          <span>{isLocationOwner ? 'الإيرادات' : 'المالية والحركات'}</span>
        </button>
        {!isLocationOwner && (
          <button 
            onClick={() => setActiveTab('foundational')}
            className={`flex items-center gap-3 p-3 rounded-xl text-right transition-all font-bold ${activeTab === 'foundational' ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white hover:bg-neutral-100 text-neutral-600'}`}
          >
            <Building2 className="w-5 h-5 flex-shrink-0" />
            <span>مصاريف التأسيس</span>
          </button>
        )}
        {!isLocationOwner && (
          <button 
            onClick={() => setActiveTab('venue_dues')}
            className={`flex items-center gap-3 p-3 rounded-xl text-right transition-all font-bold ${activeTab === 'venue_dues' ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white hover:bg-neutral-100 text-neutral-600'}`}
          >
            <MapPin className="w-5 h-5 flex-shrink-0" />
            <span>مستحقات الأماكن</span>
          </button>
        )}
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-100 p-5">
        
        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2"><DollarSign className="text-emerald-500" /> {isLocationOwner ? 'إيرادات المكان' : 'الحركات المالية وتكاليف الأنشطة'}</h2>
            </div>
            
            {/* Add Cost Form (hidden for location_owner) */}
            {!isLocationOwner && (
              <form onSubmit={handleAddCost} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100 mt-3">
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
            )}

            {/* --- Filters Bar (for all users) --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 mt-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="النوع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="revenue">إيرادات فقط</SelectItem>
                    {!isLocationOwner && <SelectItem value="expense">مصروفات فقط</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Select value={filterReference} onValueChange={setFilterReference}>
                <SelectTrigger className="bg-white h-9 text-xs"><SelectValue placeholder="الارتباط" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنشطة</SelectItem>
                  {uniqueReferences.map(ref => <SelectItem key={ref} value={ref!}>{ref}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="bg-white h-9 text-xs" placeholder="من تاريخ" />
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="bg-white h-9 text-xs" placeholder="إلى تاريخ" />
            </div>

            <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                     <TableHead className="text-right">التاريخ</TableHead>
                     <TableHead className="text-right">البيان</TableHead>
                     <TableHead className="text-right">الارتباط</TableHead>
                     {!isLocationOwner && <TableHead className="text-right">النوع</TableHead>}
                     <TableHead className="text-right">المبلغ</TableHead>
                     <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsPagination.paginatedData.map(t => (
                    <TableRow key={t.id} id={'glow-' + (t.type === 'revenue' ? `booking-${t.rawId}` : `cost-${t.rawId}`)}>
                       <TableCell className="text-xs text-neutral-500">{t.date ? format(new Date(t.date), 'dd/MM HH:mm') : '-'}</TableCell>
                       <TableCell className="font-bold">{t.description}</TableCell>
                       <TableCell><Badge variant="outline" className="bg-neutral-100">{t.reference}</Badge></TableCell>
                       {!isLocationOwner && (
                         <TableCell>{t.type === 'revenue' ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">إيراد</Badge> : <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">صرف</Badge>}</TableCell>
                       )}
                       <TableCell className="font-bold">{t.amount} د.أ</TableCell>
                       <TableCell>
                         {isAdmin && t.type === 'expense' && !activities.find(a => a.id === (t as any).activityId)?.isLocked && (
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); handleDeleteCost(t.rawId); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                         )}
                       </TableCell>
                    </TableRow>
                  ))}
                  {filteredTransactions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-neutral-400">لا توجد حركات مسجلة</TableCell></TableRow>}
                </TableBody>
              </Table>
            <PaginationControls
              currentPage={transactionsPagination.currentPage}
              totalPages={transactionsPagination.totalPages}
              itemsPerPage={transactionsPagination.itemsPerPage}
              totalItems={filteredTransactions.length}
              onPageChange={transactionsPagination.setCurrentPage}
              onItemsPerPageChange={transactionsPagination.setItemsPerPage}
              label="حركة"
            />
          </div>
        )}

        {/* Foundational Tab (hidden for location_owner) */}
        {activeTab === 'foundational' && !isLocationOwner && (
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="text-blue-500" /> مصاريف التأسيس</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm">
                الإجمالي: {totalFoundational} د.أ
              </Badge>
            </div>
            
            <form onSubmit={handleAddFoundational} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100 mb-3">
              <Input placeholder="البيان..." value={fItem} onChange={e => setFItem(e.target.value)} required className="bg-white" />
              <Input type="number" placeholder="المبلغ" value={fAmount} onChange={e => setFAmount(e.target.value)} required className="bg-white" />
              <Input placeholder="دفع بواسطة" value={fPaidBy} onChange={e => setFPaidBy(e.target.value)} className="bg-white" />
              <Input placeholder="المصدر / تفاصيل" value={fSource} onChange={e => setFSource(e.target.value)} className="bg-white" />
              <Button type="submit" disabled={isAddingF} className="bg-neutral-900 text-white"><Plus className="w-4 h-4 ml-2" /> أضف مصاريف</Button>
            </form>

            <Table>
                <TableHeader className="bg-neutral-50">
                   <TableRow>
                     <TableHead className="text-right">التاريخ</TableHead>
                     <TableHead className="text-right">البيان</TableHead>
                     <TableHead className="text-right">المبلغ</TableHead>
                     <TableHead className="text-right">معلومات الدفع</TableHead>
                     <TableHead className="text-center">معالج؟</TableHead>
                     <TableHead></TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {foundationalPagination.paginatedData.map(cost => (
                    <TableRow key={cost.id}>
                      <TableCell className="text-xs text-neutral-500">{cost.date ? format(new Date(cost.date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="font-bold">{cost.item}</TableCell>
                      <TableCell className="text-rose-600 font-bold">{cost.amount} د.أ</TableCell>
                      <TableCell className="text-xs">
                        <div 
                           className="text-neutral-500 flex gap-2 cursor-pointer hover:text-blue-500 transition-colors"
                           onClick={() => showPartnerStats(cost.paidBy)}
                        >
                           <span className="text-neutral-900 font-bold">{cost.paidBy}</span> {cost.source && `| ${cost.source}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex items-center justify-center">
                            <input 
                              type="checkbox"
                              checked={!!cost.isProcessed}
                              onChange={(e) => handleToggleProcessed(cost.id, e.target.checked)}
                              disabled={!(isAdmin || profile?.isPartner)}
                              className="w-4 h-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                              title="تحديد أو إلغاء المعالجة"
                            />
                         </div>
                      </TableCell>
                      <TableCell>
                         {isAdmin && (
                            <Button variant="ghost" size="icon" className="text-rose-500" onClick={(e) => { e.stopPropagation(); handleDeleteFoundational(cost.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                         )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {foundationalCosts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-neutral-400">لا توجد مصاريف تأسيس مسجلة</TableCell></TableRow>}
                </TableBody>
              </Table>
            <PaginationControls
              currentPage={foundationalPagination.currentPage}
              totalPages={foundationalPagination.totalPages}
              itemsPerPage={foundationalPagination.itemsPerPage}
              totalItems={foundationalCosts.length}
              onPageChange={foundationalPagination.setCurrentPage}
              onItemsPerPageChange={foundationalPagination.setItemsPerPage}
              label="مصروف"
            />
          </div>
        )}

        {/* Venue Dues Tab */}
        {activeTab === 'venue_dues' && !isLocationOwner && (
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="text-violet-500" /> مستحقات الأماكن</h2>
            </div>
            
            {(() => {
              // Calculate venue dues per location
              const venueDuesMap = new Map<string | number, { locationName: string; totalDue: number; activities: { activityName: string; amount: number }[] }>();
              
              bookings.filter(b => b.isPaid && b.offerItems && b.offerItems.length > 0).forEach(b => {
                const activity = activities.find(a => a.id === b.activityId);
                if (!activity?.locationId) return;
                const loc = locations.find(l => l.id === activity.locationId);
                if (!loc) return;
                
                const venueAmount = b.offerItems!.reduce((s, item) => s + (item.venueShare * item.quantity), 0);
                if (venueAmount <= 0) return;
                
                if (!venueDuesMap.has(loc.id)) {
                  venueDuesMap.set(loc.id, { locationName: loc.name, totalDue: 0, activities: [] });
                }
                const entry = venueDuesMap.get(loc.id)!;
                entry.totalDue += venueAmount;
                const existingActivity = entry.activities.find(a => a.activityName === (activity.name || 'غير معروف'));
                if (existingActivity) {
                  existingActivity.amount += venueAmount;
                } else {
                  entry.activities.push({ activityName: activity.name || 'غير معروف', amount: venueAmount });
                }
              });

              const duesArray = Array.from(venueDuesMap.values()).sort((a, b) => b.totalDue - a.totalDue);
              const grandTotal = duesArray.reduce((s, d) => s + d.totalDue, 0);

              return (
                <>
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 px-3 py-1 text-sm mb-4">
                    إجمالي المستحقات: {grandTotal} د.أ
                  </Badge>
                  <Table>
                      <TableHeader className="bg-neutral-50">
                        <TableRow>
                          <TableHead className="text-right">المكان</TableHead>
                          <TableHead className="text-right">التفاصيل</TableHead>
                          <TableHead className="text-right">المبلغ المستحق</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {duesArray.map((due) => (
                          <TableRow key={due.locationName}>
                            <TableCell className="font-bold">{due.locationName}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {due.activities.map((act, i) => (
                                  <div key={i} className="text-xs text-neutral-500">
                                    {act.activityName}: <span className="text-neutral-700 font-medium">{act.amount} د.أ</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-violet-700">{due.totalDue} د.أ</TableCell>
                          </TableRow>
                        ))}
                        {duesArray.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-neutral-400">
                              لا توجد مستحقات للأماكن حالياً
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                  </Table>
                </>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}

