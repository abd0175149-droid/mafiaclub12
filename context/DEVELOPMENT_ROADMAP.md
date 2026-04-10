# 🗺️ خطة التطوير — Development Roadmap

## 📌 المبدأ العام
الخطة مقسمة لـ 4 مراحل مرتبة حسب **الأولوية والتأثير**:
1. **المرحلة 0**: إصلاحات أمنية عاجلة (يجب تنفيذها فوراً)
2. **المرحلة 1**: إكمال الوظائف الأساسية المفقودة (CRUD كامل)
3. **المرحلة 2**: تحسين المعمارية والأداء
4. **المرحلة 3**: ميزات جديدة وتحسين التجربة

---

## 🚨 المرحلة 0: إصلاحات أمنية عاجلة (الأسبوع 1)

> **الهدف**: حماية البيانات ومنع الوصول غير المصرح به

### 0.1 — إصلاح قواعد أمان Firestore `[SEC-01]`
- **الملف**: `firestore.rules`
- **الإجراء**: 
  - إزالة `isLocalOrAuthenticated()` واستبدالها بـ `isAuthenticated()`
  - ضمان أن Anonymous Auth يعمل قبل التعديل
  - اختبار كل العمليات بعد التعديل
- **التحقق**: محاولة الوصول لـ Firestore بدون auth يجب أن تفشل

### 0.2 — تأمين مجموعة `staff` `[SEC-02, SEC-03]`
- **الإجراء**:
  - إنشاء Express API endpoint: `POST /api/auth/staff-login`
  - نقل عملية التحقق من اسم المستخدم/كلمة المرور للخادم
  - تغيير قاعدة `staff` لـ: `allow read, write: if false;` (وصول عبر Admin SDK فقط)
  - تشفير كلمات المرور الحالية باستخدام `bcrypt` (migration script)
- **الملفات المتأثرة**:
  - `server.ts` — إضافة endpoint
  - `firestore.rules` — تقييد staff
  - `AuthContext.tsx` — استدعاء API بدلاً من Firestore direct
  - `Dashboard.tsx` — إخفاء عمود كلمة المرور + استدعاء API لإنشاء موظف

### 0.3 — إزالة حساب Admin الافتراضي `[SEC-04]`
- **الملف**: `App.tsx:132-153`
- **الإجراء**: حذف كود `seedAdmin` أو تحويله لسكريبت تشغيل لمرة واحدة
- **التحقق**: التأكد من وجود حساب admin فعلي قبل الحذف

### 0.4 — إضافة حماية Brute Force `[SEC-07]`
- **الإجراء**: إضافة counter لمحاولات الدخول الفاشلة في `staffLogin`
  - بعد 5 محاولات فاشلة ← قفل 5 دقائق
  - تخزين العداد في `localStorage` + Firestore (لمنع التحايل بتنظيف المتصفح)
- **الملف**: `AuthContext.tsx`

### 0.5 — تأمين الجلسة `[SEC-08]`
- **الإجراء**:
  - إضافة TTL (24 ساعة) للجلسة في `localStorage`
  - عدم تخزين الدور في localStorage (جلبه من Firestore عند كل تحميل)
- **الملف**: `AuthContext.tsx`

---

## 🔧 المرحلة 1: إكمال الوظائف الأساسية (الأسبوع 2-3)

> **الهدف**: كل كيان في النظام يملك CRUD كامل

### 1.1 — إضافة زر "إنشاء نشاط" `[BL-01]` 🔴
- **الملف**: `Dashboard.tsx` — تبويب الأنشطة
- **الإجراء**: تفعيل `<ActivityForm />` المُعرَّف بالفعل وإضافته في header تبويب الأنشطة
- **الجهد**: 5 دقائق

### 1.2 — تعديل الأنشطة `[BL-04, F-01]`
- **الإجراء**:
  - إنشاء `ActivityEditDialog` مع نموذج مُعبأ بالبيانات الحالية
  - إضافة زر "تعديل" في `ActivityCard`
  - تمكين تغيير الحالة (planned → active → completed)
  - `updateDoc(doc(db, 'activities', id), {...})`
- **الملف الجديد**: `src/components/ActivityEditDialog.tsx`

### 1.3 — حذف الأنشطة `[F-02]`
- **الإجراء**:
  - إضافة زر حذف مع تأكيد في `ActivityCard`
  - **مهم**: عرض تحذير إذا كان النشاط لديه حجوزات مرتبطة
  - Cascade: حذف الحجوزات والتكاليف المرتبطة أو منع الحذف

### 1.4 — تعديل الحجوزات `[BL-05, F-03]`
- **الإجراء**:
  - إنشاء `BookingEditDialog`
  - إضافة زر "تعديل" في جدول الحجوزات
  - تمكين تعديل: الاسم، العدد، حالة الدفع، المبلغ
- **إضافات**: تأكيد قبل حذف الحجز `[UX-01]`

### 1.5 — إدارة التكاليف الكاملة `[BL-06, F-04]`
- **الإجراء**:
  - إضافة أزرار حذف/تعديل في جدول التكاليف
  - إنشاء `CostEditDialog`

### 1.6 — إصلاح حذف التكاليف التأسيسية `[BL-03]`
- **الملف**: `Dashboard.tsx:1252`
- **الإجراء**: إضافة `onClick` handler للزر الموجود

### 1.7 — إصلاح تعارض العملات `[BL-02]`
- **الإجراء**: توحيد كل العملات لـ `د.أ` مع const `CURRENCY = 'د.أ'`
- **الملفات**: `Dashboard.tsx:1224,1245` ← تغيير `₪` لـ `د.أ`

### 1.8 — تصفية الأنشطة في نموذج الحجز `[BL-10]`
- **الملف**: `Dashboard.tsx:861`
- **الإجراء**: `activities.filter(a => a.status !== 'cancelled' && a.status !== 'completed')`

### 1.9 — إصلاح إعدادات الموظفين `[BL-08]`
- **الملف**: `Dashboard.tsx:203-216`
- **الإجراء**: استخدام `user?.uid || profile?.id` بدلاً من `user.uid`

### 1.10 — ترجمة حالات الأنشطة في Overview `[UX-04]`
- **الملف**: `Dashboard.tsx:322`
- **الإجراء**: استخدام map الترجمة الموجود بالفعل

---

## 🏗️ المرحلة 2: تحسين المعمارية والأداء (الأسبوع 4-5)

> **الهدف**: كود قابل للصيانة وأداء مقبول مع نمو البيانات

### 2.1 — تقسيم Dashboard.tsx `[ARCH-01]`
- **الهيكل الجديد**:
```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardHeader.tsx
│   │   └── DashboardShell.tsx
│   ├── tabs/
│   │   ├── OverviewTab.tsx
│   │   ├── ActivitiesTab.tsx
│   │   ├── BookingsTab.tsx
│   │   ├── FinancesTab.tsx
│   │   ├── FoundationalTab.tsx
│   │   ├── ProfileTab.tsx
│   │   └── UsersTab.tsx
│   ├── forms/
│   │   ├── ActivityForm.tsx
│   │   ├── BookingForm.tsx
│   │   ├── CostForm.tsx
│   │   └── FoundationalCostForm.tsx
│   ├── cards/
│   │   ├── KPICard.tsx
│   │   └── ActivityCard.tsx
│   └── NotificationCenter.tsx
├── hooks/
│   ├── useActivities.ts
│   ├── useBookings.ts
│   ├── useCosts.ts
│   ├── useNotifications.ts
│   └── useFinancialStats.ts
└── utils/
    ├── date.ts        ← safeDate
    ├── currency.ts    ← formatting
    └── constants.ts   ← statusLabels, colors
```

### 2.2 — إنشاء Custom Hooks للبيانات
- **الإجراء**: استخراج كل `onSnapshot` logic لـ hooks مستقلة
```typescript
// hooks/useActivities.ts
export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
      setLoading(false);
    });
    return unsub;
  }, []);
  
  return { activities, loading };
}
```

### 2.3 — تحسين الأداء بـ `useMemo` `[ARCH-03, PERF-02]`
```typescript
const activityStatsMap = useMemo(() => {
  const map = new Map<string, ActivityStats>();
  for (const activity of activities) {
    const actBookings = bookings.filter(b => b.activityId === activity.id);
    const actCosts = costs.filter(c => c.activityId === activity.id);
    map.set(activity.id, computeStats(actBookings, actCosts));
  }
  return map;
}, [activities, bookings, costs]);
```

### 2.4 — إضافة Express API Layer `[ARCH-02]`
- **الملف**: `server.ts`
- **Endpoints الجديدة**:
  - `POST /api/auth/staff-login` — تسجيل دخول الموظفين
  - `POST /api/staff` — إنشاء موظف (مع تشفير كلمة المرور)
  - `DELETE /api/staff/:id` — حذف موظف
  - `PUT /api/staff/:id` — تعديل موظف
  - `GET /api/reports/financial` — تقرير مالي (اختياري)

### 2.5 — إضافة Error Boundary `[ARCH-05]`
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}
```

### 2.6 — استخدام `writeBatch` للعمليات المجمّعة `[PERF-03]`
- **الملف**: `NotificationCenter` — markAllAsRead
- **الإجراء**: استبدال for loop بـ `writeBatch(db)` + batch.commit()

---

## 🚀 المرحلة 3: ميزات جديدة وتحسين التجربة (الأسبوع 6+)

> **الهدف**: نظام متكامل مُرضي للمستخدم

### 3.1 — البحث والفلترة `[F-06]`
- **الإجراء**:
  - إضافة شريط بحث في كل جدول
  - فلترة حسب: النشاط، الفترة الزمنية، حالة الدفع
  - استخدام `state` محلي للفلترة (client-side filtering)

### 3.2 — Pagination `[F-07]`
- **الإجراء**:
  - إضافة `limit(50)` للـ queries
  - أزرار "السابق/التالي" مع `startAfter/endBefore`
  - عدّاد الصفحات

### 3.3 — تقارير مالية `[F-08, F-11]`
- **الإجراء**:
  - صفحة تقارير جديدة مع:
    - تقرير ربح/خسارة لكل نشاط
    - مقارنة شهرية
    - نسبة المجاني vs المدفوع
  - تصدير PDF (عبر html2pdf.js) و Excel (عبر SheetJS)

### 3.4 — عرض حجوزات كل نشاط `[F-12]`
- **الإجراء**: 
  - إضافة "عرض الحجوزات" في بطاقة النشاط
  - Dialog/Sheet يعرض قائمة حجوزات النشاط المحدد
  - ملخص مالي للنشاط

### 3.5 — إشعارات اقتراب الموعد `[F-09]`
- **الإجراء**: 
  - Cloud Function أو cron job يفحص الأنشطة كل ساعة
  - إذا activity.date - now < 24h → createNotification

### 3.6 — تنفيذ `notifyAllAdmins` `[BL-09]`
```typescript
export const notifyAllAdmins = async (title, message, type) => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  usersSnapshot.forEach(doc => {
    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, { userId: doc.id, title, message, type, read: false, createdAt: Timestamp.now() });
  });
  await batch.commit();
};
```

### 3.7 — Audit Trail `[DI-02]`
- **الإجراء**:
  - إنشاء مجموعة `auditLog`
  - كل عملية CRUD تُسجَّل: من فعل ماذا ومتى
  - عرض السجل في تبويب جديد (Admin only)

### 3.8 — تحسين Dialog "تأكيد الدفع" `[BL-07]`
- **الإجراء**: 
  - بدلاً من تأكيد مباشر، إظهار Dialog يعرض:
    - المبلغ المحسوب (basePrice × count)
    - حقل لتعديل المبلغ الفعلي (خصم/إضافة)
    - حقل "المستلم"

### 3.9 — تحسين UX عام
- إضافة Empty States مع CTA واضح `[UX-05]`
- Reset forms عند إغلاق Dialog `[UX-06]`
- إزالة أو تفعيل زر الكاميرا `[UX-07]`
- حالة تحميل (Skeleton) بدلاً من "Loading..." `[UX improvement]`

---

## 📊 ملخص الجهد المقدّر

| المرحلة | المدة | الأولوية | النتيجة |
|---------|-------|---------|---------|
| **المرحلة 0** — أمان | 3-5 أيام | 🔴 فوري | حماية البيانات |
| **المرحلة 1** — CRUD | 5-7 أيام | 🟠 عاجل | نظام يعمل بالكامل |
| **المرحلة 2** — معمارية | 5-7 أيام | 🟡 مهم | كود مستدام |
| **المرحلة 3** — ميزات | 7-14 يوم | 🟢 تحسيني | تجربة مميزة |

---

## ✅ ترتيب التنفيذ المُوصى به

```
الأسبوع 1: SEC-01 → SEC-02/03 → SEC-04 → SEC-07 → BL-01
              ↓
الأسبوع 2: BL-02 → BL-03 → BL-04 → BL-05 → BL-06
              ↓
الأسبوع 3: BL-07 → BL-08 → BL-09 → BL-10 → UX fixes
              ↓
الأسبوع 4: ARCH-01 (تقسيم Dashboard)
              ↓
الأسبوع 5: ARCH-02 (API Layer) + ARCH-03 (useMemo)
              ↓
الأسبوع 6+: ميزات جديدة (تقارير، بحث، pagination)
```
