# 🚀 النشر والتشغيل — Deployment & Operations

## 🖥️ التشغيل المحلي (Development)

### المتطلبات الأساسية
- **Node.js** — أي إصدار حديث (v18+)
- **npm** — يأتي مع Node.js

### خطوات التشغيل
```bash
# 1. تثبيت الحزم
npm install

# 2. إعداد متغيرات البيئة
# أنشئ ملف .env.local وأضف:
GEMINI_API_KEY="your-api-key-here"

# 3. تشغيل الخادم
npm run dev
# → يعمل على: http://localhost:3000
```

### كيف يعمل الخادم محلياً
```
npm run dev
  ↓
tsx server.ts
  ↓
Express.js يستمع على Port 3000
  ├── Vite Middleware (HMR + SPA)
  ├── Firebase Admin SDK (Firestore + Auth)
  └── /api/health endpoint
```

## ☁️ النشر (Production Deployment)

### المنصة الأساسية
- **Google AI Studio** — يستضيف التطبيق عبر Cloud Run
- **الرابط**: `https://ai.studio/apps/f72bac6b-7d71-412a-a5b5-0941f6e7e276`

### بناء النسخة الإنتاجية
```bash
# بناء الفرونت إند (Vite bundle)
npm run build
# → الملفات في مجلد dist/

# معاينة البناء
npm run preview
```

### سلوك الخادم في الإنتاج
```typescript
// server.ts
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));        // ملفات ثابتة
  app.get('*', (req, res) => {
    res.sendFile('dist/index.html');       // SPA fallback
  });
}
```

## 🔥 Firebase Configuration

### مشروع Firebase
| الإعداد | القيمة |
|---------|--------|
| Project ID | `gen-lang-client-0525125246` |
| App ID | `1:1095396663379:web:57855be960b4b1193c66a6` |
| Auth Domain | `gen-lang-client-0525125246.firebaseapp.com` |
| Firestore DB ID | `ai-studio-f72bac6b-7d71-412a-a5b5-0941f6e7e276` |
| Storage Bucket | `gen-lang-client-0525125246.firebasestorage.app` |

### إعداد Firebase Admin (Server-side)
```typescript
// server.ts
const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

// تعيين متغيرات البيئة للمشروع
process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
process.env.FIREBASE_PROJECT_ID = firebaseConfig.projectId;

const adminApp = initializeApp({
  projectId: firebaseConfig.projectId,
  databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
});
```

### إعداد Firebase Client (Frontend)
```typescript
// src/lib/firebase.ts
import firebaseConfig from '../../firebase-applet-config.json';
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
```

## 📋 الأوامر المتاحة

| الأمر | الوصف | الاستخدام |
|-------|-------|-----------|
| `npm run dev` | تشغيل خادم التطوير | يومي |
| `npm run build` | بناء النسخة الإنتاجية | قبل النشر |
| `npm run preview` | معاينة الإنتاج محلياً | اختبار |
| `npm run lint` | فحص TypeScript | قبل الدفع |
| `npm run clean` | حذف مجلد dist | عند الحاجة |

## 🔐 خدمات Firebase المطلوبة

| الخدمة | الحالة | ملاحظات |
|--------|--------|---------|
| Firestore | ✅ مطلوب | قاعدة البيانات الرئيسية |
| Authentication | ✅ مطلوب | Google + Anonymous providers |
| Hosting | ❌ غير مستخدم | التطبيق مستضاف على AI Studio |
| Storage | ❌ غير مستخدم | لا يوجد رفع ملفات |
| Functions | ❌ غير مستخدم | كل المنطق في الكلاينت |

### إعدادات Auth المطلوبة في Firebase Console
1. ✅ تفعيل **Google Sign-In** provider
2. ✅ تفعيل **Anonymous Authentication** provider
3. ✅ إضافة نطاق التطبيق في **Authorized Domains**

## ⚙️ إعدادات Vite

```typescript
// vite.config.ts
{
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // Path alias
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',  // AI Studio يعطل HMR
  },
}
```

## 📊 مراقبة الصحة

### Health Check
```bash
# التحقق من عمل الخادم
curl http://localhost:3000/api/health
# → { "status": "ok" }
```

### سجلات الخادم (Logs)
```
Firebase Admin initialized for project: gen-lang-client-0525125246
Using Firestore database: ai-studio-f72bac6b-7d71-412a-a5b5-0941f6e7e276
Server running on http://localhost:3000
```

## ⚠️ مشاكل معروفة والحلول

| المشكلة | السبب | الحل |
|---------|-------|------|
| `auth/operation-not-allowed` | Google Sign-In غير مفعل | تفعيله من Firebase Console |
| `auth/admin-restricted-operation` | Anonymous Auth غير مفعل | تفعيله من Firebase Console |
| `auth/requires-recent-login` | تغيير كلمة المرور بعد مدة طويلة | إعادة تسجيل الدخول |
| Firestore permission denied | قواعد أمان صارمة + لا auth | التحقق من `isLocalOrAuthenticated()` |
| `DISABLE_HMR` يعطل التحديث الحي | إعداد AI Studio | عادي في بيئة AI Studio |

## 🔄 دورة التطوير (Development Workflow)

```
1. npm run dev          → بدء التطوير
2. تعديل الكود         → Vite HMR يحدث تلقائياً
3. npm run lint         → فحص TypeScript
4. npm run build        → بناء الإنتاج
5. Git commit + push    → النشر عبر AI Studio
```

## 📁 الملفات المستثناة من Git

```gitignore
node_modules/     # حزم npm
build/            # مخرجات البناء القديمة
dist/             # مخرجات Vite
coverage/         # تقارير الاختبار
.DS_Store         # ملفات macOS
*.log             # سجلات
.env*             # متغيرات بيئة (حساسة)
!.env.example     # مثال متغيرات البيئة (مسموح)
```
