import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import Swal from 'sweetalert2';
import { Location } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Plus, Trash2, Edit2, Link as LinkIcon, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationsView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  const [name, setName] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [offers, setOffers] = useState<{description: string, price: number}[]>([]);
  const [newOfferDesc, setNewOfferDesc] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState('');

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

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferDesc.trim()) return;
    setOffers([...offers, { description: newOfferDesc.trim(), price: parseFloat(newOfferPrice) || 0 }]);
    setNewOfferDesc('');
    setNewOfferPrice('');
  };

  const handleRemoveOffer = (index: number) => {
    setOffers(offers.filter((_, i) => i !== index));
  };

  const handleOpenNew = () => {
    setEditingLoc(null);
    setName('');
    setMapUrl('');
    setOffers([]);
    setNewOfferDesc('');
    setNewOfferPrice('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLoc(loc);
    setName(loc.name);
    setMapUrl(loc.mapUrl || '');
    // Backward compat: if old format (string[]), convert to new format
    const parsedOffers = (loc.offers || []).map((o: any) => {
      if (typeof o === 'string') return { description: o, price: 0 };
      return o;
    });
    setOffers(parsedOffers);
    setNewOfferDesc('');
    setNewOfferPrice('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('يرجى كتابة اسم المكان');
    try {
      const payload = { name, mapUrl, offers };
      if (editingLoc) {
        await apiPut(`/locations/${editingLoc.id}`, payload);
        toast.success('تم التعديل بنجاح');
      } else {
        await apiPost('/locations', payload);
        toast.success('تمت الإضافة بنجاح');
      }
      setIsDialogOpen(false);
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
          <p className="text-neutral-500 text-sm">أضف القهاوي والكافيهات التي تقام بها الفعاليات مع عروضها</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleOpenNew} className="bg-neutral-900 text-white hover:bg-neutral-800">
            <Plus className="w-4 h-4 ml-2" /> إضافة مكان جديد
          </Button>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingLoc ? 'تعديل بيانات المكان' : 'إضافة مكان جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>اسم المكان (الكافيه / القهوة) <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: The Coffee Bean" />
              </div>

              <div className="space-y-2">
                <Label>رابط جوجل ماب (اختياري)</Label>
                <Input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" />
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2 border-t pt-4"><Gift className="w-4 h-4" /> عروض المكان (اختياري)</Label>
                
                <form onSubmit={handleAddOffer} className="flex gap-2">
                  <Input value={newOfferDesc} onChange={e => setNewOfferDesc(e.target.value)} placeholder="تفاصيل العرض..." className="flex-1" />
                  <Input value={newOfferPrice} onChange={e => setNewOfferPrice(e.target.value)} placeholder="السعر" type="number" step="0.01" className="w-24" dir="ltr" />
                  <Button type="submit" variant="secondary" className="whitespace-nowrap">إضافة</Button>
                </form>

                {offers.length > 0 && (
                  <ul className="space-y-2 mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                    {offers.map((off, idx) => (
                      <li key={idx} className="flex justify-between items-center gap-4 text-sm bg-white p-3 rounded shadow-sm border border-neutral-100">
                        <span className="leading-relaxed flex-1">{typeof off === 'string' ? off : off.description}</span>
                        <span className="font-bold text-emerald-700 whitespace-nowrap">{typeof off === 'string' ? '' : off.price + ' د.أ'}</span>
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
        {locations.map(loc => (
          <Card key={loc.id} className="border-none shadow-sm hover:shadow-md transition-all group">
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
                  <ul className="text-sm space-y-1.5 list-disc list-inside text-neutral-700">
                    {loc.offers.map((o: any, i: number) => (
                      <li key={i} className="line-clamp-2 flex justify-between items-center gap-2">
                        <span>{typeof o === 'string' ? o : o.description}</span>
                        {typeof o !== 'string' && o.price > 0 && <span className="text-emerald-600 font-bold whitespace-nowrap text-xs">{o.price} د.أ</span>}
                      </li>
                    ))}
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
    </div>
  );
}
