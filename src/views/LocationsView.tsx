import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import Swal from 'sweetalert2';
import { Location, LocationOffer, normalizeOffer } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls, usePagination } from '@/components/Pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Plus, Trash2, Edit2, Link as LinkIcon, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationsView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const locationsPagination = usePagination(locations, 6);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  const [name, setName] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [offers, setOffers] = useState<LocationOffer[]>([]);
  const [newOfferDesc, setNewOfferDesc] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferClubShare, setNewOfferClubShare] = useState('');
  const [newOfferVenueShare, setNewOfferVenueShare] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');

  const fetchLocations = async () => {
    try {
      const data = await apiGet<Location[]>('/locations');
      setLocations(data);
    } catch (err) {
      toast.error('فشل جلب الأماكن');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const generateOfferId = () => `offer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferDesc.trim()) return;
    const price = parseFloat(newOfferPrice) || 0;
    const venueShare = parseFloat(newOfferVenueShare) || 0;
    const clubShare = parseFloat(newOfferClubShare) || (price - venueShare);
    
    setOffers([...offers, {
      id: generateOfferId(),
      description: newOfferDesc.trim(),
      price,
      clubShare: Math.max(0, clubShare),
      venueShare
    }]);
    setNewOfferDesc('');
    setNewOfferPrice('');
    setNewOfferClubShare('');
    setNewOfferVenueShare('');
  };

  const handleRemoveOffer = (index: number) => {
    setOffers(offers.filter((_, i) => i !== index));
  };

  // Auto-calc clubShare when price or venueShare changes
  const handlePriceChange = (val: string) => {
    setNewOfferPrice(val);
    const p = parseFloat(val) || 0;
    const v = parseFloat(newOfferVenueShare) || 0;
    setNewOfferClubShare(String(Math.max(0, p - v)));
  };

  const handleVenueShareChange = (val: string) => {
    setNewOfferVenueShare(val);
    const p = parseFloat(newOfferPrice) || 0;
    const v = parseFloat(val) || 0;
    setNewOfferClubShare(String(Math.max(0, p - v)));
  };

  const handleClubShareChange = (val: string) => {
    setNewOfferClubShare(val);
  };

  const handleOpenNew = () => {
    setEditingLoc(null);
    setName('');
    setMapUrl('');
    setOffers([]);
    setNewOfferDesc('');
    setNewOfferPrice('');
    setNewOfferClubShare('');
    setNewOfferVenueShare('');
    setOwnerUsername('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLoc(loc);
    setName(loc.name);
    setMapUrl(loc.mapUrl || '');
    const parsedOffers = (loc.offers || []).map((o: any, i: number) => normalizeOffer(o, i));
    setOffers(parsedOffers);
    setNewOfferDesc('');
    setNewOfferPrice('');
    setNewOfferClubShare('');
    setNewOfferVenueShare('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('يرجى كتابة اسم المكان');
    try {
      const payload = { name, mapUrl, offers, ownerUsername: ownerUsername.trim() || undefined };
      if (editingLoc) {
        await apiPut(`/locations/${editingLoc.id}`, payload);
        toast.success('تم التعديل بنجاح');
      } else {
        const result = await apiPost('/locations', payload) as any;
        toast.success('تمت الإضافة بنجاح');
        if (result?.ownerAccount) {
          Swal.fire({
            title: 'تم إنشاء حساب صاحب المكان',
            html: `
              <div style="text-align:right; direction:rtl; line-height:2;">
                <p><strong>اسم المستخدم:</strong> <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;">${result.ownerAccount.username}</code></p>
                <p><strong>كلمة المرور:</strong> <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;">${result.ownerAccount.password}</code></p>
                <hr style="margin:10px 0"/>
                <p style="color:#6b7280;font-size:13px;">يمكن لصاحب المكان تسجيل الدخول بهذه البيانات لمتابعة الأنشطة والحجوزات المرتبطة بمكانه</p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'تم',
            confirmButtonColor: '#0f172a'
          });
        }
      }
      setIsDialogOpen(false);
      setOwnerUsername('');
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ عند الحفظ');
    }
  };

  const handleDelete = async (id: string | number, locName: string) => {
    const r = await Swal.fire({ title: `حذف ${locName}؟`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'احذف', cancelButtonText: 'إلغاء', reverseButtons: true });
    if (!r.isConfirmed) return;
    try {
      await apiDelete(`/locations/${id}`);
      Swal.fire({ title: 'تم!', icon: 'success', timer: 1200, showConfirmButton: false });
      fetchLocations();
    } catch (err: any) {
      Swal.fire({ title: 'خطأ', text: err.message || 'حدث خطأ عند الحذف', icon: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="text-rose-500" />
            أماكن الفعاليات
          </h2>
          <p className="text-neutral-500 text-sm">أضف القهاوي والكافيهات التي تقام بها الفعاليات مع عروضها وحصص التقسيم</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleOpenNew} className="bg-neutral-900 text-white hover:bg-neutral-800">
            <Plus className="w-4 h-4 ml-2" /> إضافة مكان جديد
          </Button>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingLoc ? 'تعديل بيانات المكان' : 'إضافة مكان جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-1">
              <div className="space-y-2">
                <Label>اسم المكان (الكافيه / القهوة) <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: The Coffee Bean" />
              </div>

              {!editingLoc && (
                <div className="space-y-2">
                  <Label>اسم المستخدم لحساب صاحب المكان <span className="text-neutral-400 text-xs">(اختياري - إن لم يكتب سيتم توليده تلقائياً)</span></Label>
                  <Input value={ownerUsername} onChange={e => setOwnerUsername(e.target.value)} placeholder="مثال: coffebean" dir="ltr" />
                </div>
              )}

              <div className="space-y-2">
                <Label>رابط جوجل ماب (اختياري)</Label>
                <Input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" />
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2 border-t pt-4"><Gift className="w-4 h-4" /> عروض المكان (اختياري)</Label>
                
                <form onSubmit={handleAddOffer} className="space-y-3 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                  <div className="flex gap-2">
                    <Input value={newOfferDesc} onChange={e => setNewOfferDesc(e.target.value)} placeholder="وصف العرض..." className="flex-1" />
                    <Input value={newOfferPrice} onChange={e => handlePriceChange(e.target.value)} placeholder="السعر" type="number" step="0.01" className="w-24" dir="ltr" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-neutral-500">حصة المكان</Label>
                      <Input value={newOfferVenueShare} onChange={e => handleVenueShareChange(e.target.value)} placeholder="0" type="number" step="0.01" dir="ltr" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-neutral-500">حصة النادي</Label>
                      <Input value={newOfferClubShare} onChange={e => handleClubShareChange(e.target.value)} placeholder="0" type="number" step="0.01" dir="ltr" className="h-8 text-sm" />
                    </div>
                    <Button type="submit" variant="secondary" className="self-end h-8 text-sm">إضافة</Button>
                  </div>
                </form>

                {offers.length > 0 && (
                  <ul className="space-y-2 mt-2">
                    {offers.map((off, idx) => (
                      <li key={off.id || idx} className="flex justify-between items-center gap-3 text-sm bg-white p-3 rounded-lg shadow-sm border border-neutral-100">
                        <div className="flex-1 space-y-1">
                          <span className="font-bold text-neutral-800">{off.description}</span>
                          <div className="flex items-center gap-3 text-xs text-neutral-500">
                            <span>الإجمالي: <strong className="text-neutral-700">{off.price} د.أ</strong></span>
                            <span className="text-emerald-600">النادي: {off.clubShare} د.أ</span>
                            <span className="text-blue-600">المكان: {off.venueShare} د.أ</span>
                            {off.price > off.clubShare + off.venueShare && (
                              <span className="text-amber-600">خصم: {(off.price - off.clubShare - off.venueShare).toFixed(2)} د.أ</span>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveOffer(idx)} className="text-rose-500 hover:text-rose-700 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} className="w-full bg-neutral-900 text-white">حفظ البيانات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locationsPagination.paginatedData.map(loc => (
          <Card key={loc.id} id={'glow-location-' + loc.id} className="border-none shadow-sm hover:shadow-md transition-all group">
            <CardHeader className="pb-3 border-b border-neutral-100">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>{loc.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-blue-500" onClick={() => handleOpenEdit(loc)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-300 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(loc.id, loc.name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {loc.mapUrl ? (
                <a href={loc.mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <LinkIcon className="w-4 h-4" /> عرض الموقع على الخريطة
                </a>
              ) : (
                <p className="text-sm text-neutral-400 flex items-center gap-2"><MapPin className="w-4 h-4" /> لا يوجد رابط للخريطة</p>
              )}
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1"><Gift className="w-3 h-3" /> العروض المتوفرة ({loc.offers?.length || 0})</p>
                {loc.offers && loc.offers.length > 0 ? (
                  <ul className="text-sm space-y-2">
                    {loc.offers.map((o: any, i: number) => {
                      const offer = normalizeOffer(o, i);
                      return (
                        <li key={offer.id} className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                          <p className="font-bold text-neutral-800 text-sm">{offer.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="text-neutral-600">{offer.price} د.أ</span>
                            {offer.clubShare > 0 && <span className="text-emerald-600">النادي: {offer.clubShare}</span>}
                            {offer.venueShare > 0 && <span className="text-blue-600">المكان: {offer.venueShare}</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-400 border border-dashed border-neutral-200 rounded p-3 text-center">لا توجد عروض مسجلة لهذا المكان</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {locations.length === 0 && (
          <div className="col-span-full text-center py-12 text-neutral-400 border-2 border-dashed border-neutral-200 rounded-xl">
            لا توجد أماكن مضافة بعد. يمكنك إضافة أماكن وحفظ عروضها.
          </div>
        )}
      </div>
      <PaginationControls
        currentPage={locationsPagination.currentPage}
        totalPages={locationsPagination.totalPages}
        itemsPerPage={locationsPagination.itemsPerPage}
        totalItems={locations.length}
        onPageChange={locationsPagination.setCurrentPage}
        onItemsPerPageChange={locationsPagination.setItemsPerPage}
        itemsPerPageOptions={[6, 12, 24, 48]}
        label="مكان"
      />
    </div>
  );
}
