# 📏 اتفاقيات وأنماط الكود — Conventions & Patterns

## 🗂️ بنية الملفات

### التسمية
| النوع | النمط | مثال |
|-------|-------|------|
| مكونات React | PascalCase | `Dashboard.tsx`, `App.tsx` |
| ملفات مكتبة | camelCase | `firebase.ts`, `utils.ts` |
| خدمات | camelCase | `notificationService.ts` |
| مكونات UI (Shadcn) | kebab-case | `dropdown-menu.tsx`, `scroll-area.tsx` |
| أنماط TypeScript | camelCase ملف / PascalCase أنماط | `types.ts` → `Activity`, `Booking` |
| CSS | kebab-case | `index.css` |

### هيكل المجلدات
```
src/
├── [ComponentName].tsx     # مكونات على المستوى الأعلى
├── types.ts                # أنماط مشتركة
├── components/
│   └── ui/                 # مكونات Shadcn فقط
├── lib/                    # أدوات ومكتبات
└── services/               # خدمات الأعمال (Business Logic)
```

## 🎨 أنماط CSS / TailwindCSS

### الإعداد
- **TailwindCSS v4** عبر `@tailwindcss/vite` plugin
- **أسلوب Shadcn**: `base-nova`
- **متغيرات CSS**: نعم (`cssVariables: true`)
- **لوحة الألوان**: `neutral` كأساس
- **دعم RTL**: عبر `dir="rtl"` على العناصر الحاوية

### نظام الألوان (Design Tokens)
```css
/* Light Mode - oklch */
--primary: oklch(0.205 0 0);        /* أسود تقريباً */
--secondary: oklch(0.97 0 0);       /* رمادي فاتح جداً */
--destructive: oklch(0.577 0.245 27.325);  /* أحمر */
--muted: oklch(0.97 0 0);           /* صامت */

/* نصف القطر */
--radius: 0.625rem;                 /* 10px */
```

### أنماط الرسوم المتحركة
```css
/* Shadcn Animations */
data-open:animate-in, data-open:fade-in-0, data-open:zoom-in-95
data-closed:animate-out, data-closed:fade-out-0, data-closed:zoom-out-95
slide-in-from-top-2, slide-in-from-bottom-2
```

### أنماط شائعة
```tsx
// ألوان الحالات
const statusColors = {
  planned: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-neutral-50 text-neutral-700 border-neutral-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
};

// ألوان حالة الدفع
const paymentColors = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  free: 'bg-blue-50 text-blue-700 border-blue-200',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200'
};

// العملة المستخدمة
const currency = 'د.أ';  // دينار أردني (في النصوص)
const currencyFoundational = '₪';  // شيكل (في التكاليف التأسيسية فقط)
```

## ⚛️ أنماط React

### إدارة الحالة (State Management)
- **React Context** → حالة المصادقة فقط (`AuthContext.tsx`)
- **useState** → كل حالة أخرى محلية في `Dashboard.tsx`
- **لا يوجد**: Redux, Zustand, Jotai, أو أي state manager خارجي

### التعامل مع البيانات
```tsx
// Real-time listeners (onSnapshot)
useEffect(() => {
  const q = query(collection(db, 'X'), orderBy('field', 'desc'));
  const unsub = onSnapshot(q, (snapshot) => {
    setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'X'));
  return () => unsub();
}, [dependencies]);

// Write operations
await addDoc(collection(db, 'X'), { ...data, createdAt: Timestamp.now() });
await updateDoc(doc(db, 'X', id), { field: value });
await deleteDoc(doc(db, 'X', id));
```

### أنماط النماذج (Forms)
```tsx
// نمط FormData (المستخدم حالياً)
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const name = formData.get('name') as string;
  // ...
};

// كل نموذج مغلف في Dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger render={<Button>...</Button>} />
  <DialogContent dir="rtl">
    <form onSubmit={handleSubmit}>
      {/* fields */}
      <DialogFooter>
        <Button type="submit">حفظ</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### التعامل مع التواريخ
```tsx
// دالة آمنة لتحويل التواريخ (Firestore Timestamp → JS Date)
const safeDate = (date: any) => {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate();  // Firestore Timestamp
  if (date.seconds !== undefined) return new Date(date.seconds * 1000);  // Serialized
  return new Date(date);  // String/Number
};

// التنسيق
format(safeDate(date)!, 'yyyy/MM/dd')
format(safeDate(date)!, 'hh:mm a')
format(safeDate(date)!, 'MMM')
format(safeDate(date)!, 'dd')
```

### معالجة الأخطاء
```tsx
// Firebase Error Handler
handleFirestoreError(error, OperationType.CREATE, 'collectionName');
// → Logs detailed error with auth info
// → Throws new Error with JSON details

// UI Errors
toast.success('تم بنجاح');
toast.error('حدث خطأ');

// Auth Errors
error.code === 'auth/operation-not-allowed'
error.code === 'auth/admin-restricted-operation'
error.code === 'auth/requires-recent-login'
```

## 🔤 اللغة والـ i18n
- **اللغة الأساسية**: العربية (AR)
- **اتجاه النص**: RTL
- **عملة العرض**: `د.أ` (دينار أردني) و `₪` (شيكل)
- **لا يوجد i18n framework**: كل النصوص مكتوبة مباشرة في JSX
- **تنسيق الأرقام**: `number.toLocaleString()`

## 📦 الاستيراد (Imports)

### ترتيب الاستيراد
```tsx
// 1. React
import React, { useState, useEffect } from 'react';

// 2. Firebase
import { collection, query, onSnapshot } from 'firebase/firestore';

// 3. مكتبات محلية
import { db } from './lib/firebase';
import { Activity, Booking } from './types';
import { useAuth } from './AuthContext';

// 4. مكونات UI (Shadcn)
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 5. أيقونات
import { Plus, Users, DollarSign } from 'lucide-react';

// 6. مكتبات خارجية
import { format } from 'date-fns';
import { BarChart, Bar } from 'recharts';
```

### Path Aliases
```json
// tsconfig.json
"@/*": ["./src/*"]

// استخدام
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

## 🧪 التحقق والاختبار
- **لا يوجد** إطار اختبار (no Jest, Vitest, etc.)
- **فحص TypeScript**: `npm run lint` → `tsc --noEmit`
- **التحقق من البيانات**: عبر Firestore rules (server-side) + `required` attributes (client-side)

## 📝 معايير عامة
1. **لا يوجد Routing library** — التنقل عبر Tabs فقط
2. **لا يوجد Error Boundary** — الأخطاء تُعالج في كل مكون
3. **جميع المكونات في ملف واحد** — `Dashboard.tsx` (1357 سطر)
4. **الاتصال مباشر مع Firebase** — بدون طبقة API وسيطة
5. **Real-time first** — كل البيانات تُحدَّث فوراً عبر listeners
