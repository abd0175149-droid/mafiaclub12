# 🛤️ واجهات API والمسارات — Routes & API

## 📡 الخادم (Server-side API)

الخادم في `server.ts` بسيط جداً ويعتمد أساساً على Vite middleware للتقديم.

### نقاط النهاية (Endpoints)

| Method | Route | الوظيفة | الحالة |
|--------|-------|---------|--------|
| `GET` | `/api/health` | فحص صحة الخادم | ✅ يعمل |
| `GET` | `*` (catch-all) | تقديم ملفات SPA الثابتة (Production) | ✅ |

### إعداد الخادم
```typescript
// server.ts - Express + Vite
const PORT = 3000;

// Development Mode
app.use(vite.middlewares);  // Vite HMR & SPA

// Production Mode
app.use(express.static('dist'));
app.get('*', (req, res) => res.sendFile('dist/index.html'));
```

> **ملاحظة هامة**: لا يوجد API باك إند مخصص لعمليات CRUD. جميع العمليات تتم مباشرة من الفرونت إند إلى Firebase Firestore عبر Client SDK.

---

## 🔥 Firestore Client Operations (Frontend → Firebase)

### عمليات الأنشطة (Activities)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة الكل | `onSnapshot(query('activities', orderBy('date', 'desc')))` | `/activities` | Dashboard mount |
| إنشاء | `addDoc(collection(db, 'activities'), {...})` | `/activities` | ActivityForm |
| تعديل | `updateDoc(doc(db, 'activities', id), {...})` | `/activities/{id}` | — (غير مُنفَّذ في UI) |
| حذف | `deleteDoc(doc(db, 'activities', id))` | `/activities/{id}` | — (غير مُنفَّذ في UI) |

### عمليات الحجوزات (Bookings)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة الكل | `onSnapshot(query('bookings', orderBy('createdAt', 'desc')))` | `/bookings` | Dashboard mount |
| إنشاء | `addDoc(collection(db, 'bookings'), {...})` | `/bookings` | BookingForm |
| تأكيد الدفع | `updateDoc(doc(db, 'bookings', id), { isPaid: true, paidAmount: ... })` | `/bookings/{id}` | Inline button |
| حذف | `deleteDoc(doc(db, 'bookings', id))` | `/bookings/{id}` | Inline button |

### عمليات التكاليف (Costs)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة الكل | `onSnapshot(query('costs', orderBy('date', 'desc')))` | `/costs` | Dashboard mount |
| إنشاء | `addDoc(collection(db, 'costs'), {...})` | `/costs` | CostForm |

### عمليات التكاليف التأسيسية (Foundational Costs)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة الكل | `onSnapshot(query('foundationalCosts', orderBy('date', 'desc')))` | `/foundationalCosts` | Dashboard mount |
| إنشاء | `addDoc(collection(db, 'foundationalCosts'), {...})` | `/foundationalCosts` | FoundationalCostForm |

### عمليات الموظفين (Staff)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة الكل | `onSnapshot(query('staff', orderBy('createdAt', 'desc')))` | `/staff` | Dashboard (Admin) |
| استعلام الدخول | `getDocs(query('staff', where('username', '==', X), where('password', '==', Y)))` | `/staff` | staffLogin |
| إنشاء | `addDoc(collection(db, 'staff'), {...})` | `/staff` | UserManagementTab |
| حذف | `deleteDoc(doc(db, 'staff', id))` | `/staff/{id}` | UserManagementTab |
| إنشاء افتراضي | `setDoc(doc(db, 'staff', 'default_admin'), {...})` | `/staff/default_admin` | App seed |

### عمليات الإشعارات (Notifications)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة (مستخدم) | `onSnapshot(query('notifications', where('userId', '==', uid), orderBy(...)))` | `/notifications` | Dashboard mount |
| إنشاء | `addDoc(collection(db, 'notifications'), {...})` | `/notifications` | notificationService |
| تحديث (قراءة) | `updateDoc(doc(db, 'notifications', id), { read: true })` | `/notifications/{id}` | NotificationCenter |

### عمليات إعدادات المستخدم (User Settings)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة | `onSnapshot(doc(db, 'userSettings', userId))` | `/userSettings/{userId}` | Dashboard mount |
| إنشاء/تعديل | `setDoc(doc(db, 'userSettings', userId), defaults)` | `/userSettings/{userId}` | Dashboard (auto-create) |
| تعديل إشعارات | `updateDoc(doc(db, 'userSettings', uid), { notifications.X: value })` | `/userSettings/{userId}` | ProfileTab |
| تعديل تخطيط | `updateDoc(doc(db, 'userSettings', uid), { dashboardLayout: [...] })` | `/userSettings/{userId}` | ProfileTab |

### عمليات المستخدمين (Users)

| العملية | الدالة | المسار | المُنفِّذ |
|---------|--------|--------|---------|
| قراءة | `getDoc(doc(db, 'users', uid))` | `/users/{uid}` | AuthContext |
| إنشاء/تعديل | `setDoc(doc(db, 'users', uid), profile)` | `/users/{uid}` | AuthContext / ProfileTab |
| تعديل الملف الشخصي | `setDoc(doc(db, 'users', uid), { displayName, photoURL }, { merge: true })` | `/users/{uid}` | ProfileTab |

---

## 🔄 Payloads (بيانات الإرسال)

### إنشاء نشاط
```json
{
  "name": "string (required)",
  "date": "Timestamp (required)",
  "description": "string",
  "basePrice": "number (required)",
  "status": "planned",
  "createdAt": "Timestamp.now()"
}
```

### إنشاء حجز
```json
{
  "activityId": "string (required)",
  "name": "string (required)",
  "phone": "string",
  "count": "number (required, > 0)",
  "isFree": "boolean",
  "isPaid": "boolean (true if isFree)",
  "paidAmount": "number (0 if isFree, else user input)",
  "receivedBy": "string",
  "notes": "string",
  "createdAt": "Timestamp.now()"
}
```

### إنشاء تكلفة
```json
{
  "item": "string (required)",
  "amount": "number (required)",
  "date": "Timestamp (required)",
  "paidBy": "string (required)",
  "type": "'activity' | 'general' (required)",
  "activityId": "string | null",
  "createdAt": "Timestamp.now()"
}
```

### إنشاء تكلفة تأسيسية
```json
{
  "item": "string (required)",
  "amount": "number (required)",
  "paidBy": "string (required)",
  "source": "string (required)",
  "date": "Timestamp (required)",
  "createdAt": "Timestamp.now()"
}
```

### إنشاء موظف
```json
{
  "username": "string (required)",
  "password": "string (required, plaintext ⚠️)",
  "displayName": "string (required)",
  "role": "'admin' | 'manager' (required)",
  "createdAt": "Timestamp.now()"
}
```

---

## 🔑 Firebase Authentication Operations

| العملية | الدالة | المُنفِّذ |
|---------|--------|---------|
| دخول Google | `signInWithPopup(auth, GoogleAuthProvider)` | Login (Admin mode) |
| دخول مجهول | `signInAnonymously(auth)` | staffLogin |
| تحديث الملف | `updateProfile(user, { displayName, photoURL })` | ProfileTab |
| تغيير كلمة المرور | `updatePassword(user, newPassword)` | ProfileTab |
| تسجيل الخروج | `signOut(auth) + localStorage.removeItem('staff_session')` | Logout button |
| مراقبة الحالة | `onAuthStateChanged(auth, callback)` | AuthContext |
