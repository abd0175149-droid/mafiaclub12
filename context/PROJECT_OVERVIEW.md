# 📋 نظرة عامة على المشروع — Mafia Club Management System

## 🎯 الهدف العام
نظام إدارة شامل لنادي ألعاب المافيا (Mafia Club)، يتيح للفريق الإداري إدارة الأنشطة (جلسات الألعاب)، الحجوزات، المالية، التكاليف التأسيسية، والموظفين عبر لوحة تحكم واحدة.

## 🌐 نوع التطبيق
- **SPA** (Single Page Application) — تطبيق صفحة واحدة
- **واجهة RTL** عربية بالكامل
- **مستضاف عبر**: Google AI Studio (Firebase-backed)
- **رابط AI Studio**: `https://ai.studio/apps/f72bac6b-7d71-412a-a5b5-0941f6e7e276`

## 🛠️ التقنيات المستخدمة

### Frontend
| التقنية | الإصدار | الغرض |
|---------|---------|-------|
| React | 19.0.0 | إطار العمل الأساسي للواجهة |
| TypeScript | ~5.8.2 | كتابة الأنماط الثابتة |
| Vite | ^6.2.0 | أداة البناء والتطوير المحلي |
| TailwindCSS | ^4.1.14 | إطار تنسيق CSS Utility-first |
| Shadcn UI | ^4.2.0 (base-nova style) | مكونات UI مبنية على Base UI |
| Recharts | ^3.8.1 | الرسوم البيانية والمخططات |
| Lucide React | ^0.546.0 | الأيقونات |
| Motion (Framer) | ^12.23.24 | الرسوم المتحركة |
| date-fns | ^4.1.0 | معالجة التواريخ |
| Sonner | ^2.0.7 | إشعارات Toast |
| React Hook Form + Zod | ^7.72.1 / ^4.3.6 | معالجة النماذج والتحقق |

### Backend
| التقنية | الإصدار | الغرض |
|---------|---------|-------|
| Express.js | ^4.21.2 | خادم HTTP |
| Firebase Admin SDK | ^13.8.0 | الوصول الإداري لقاعدة البيانات والمصادقة |
| tsx | ^4.21.0 | تشغيل TypeScript مباشرة في Node.js |

### قاعدة البيانات والخدمات
| التقنية | الغرض |
|---------|-------|
| Firebase Firestore | قاعدة بيانات NoSQL (Cloud) |
| Firebase Authentication | المصادقة (Google + Anonymous) |
| Gemini API (اختياري) | ذكاء اصطناعي عبر `@google/genai` |

## 📁 بنية المشروع (هيكل الملفات)

```
mafiaclub/
├── index.html                     # نقطة دخول HTML
├── server.ts                      # خادم Express + Vite middleware
├── package.json                   # الحزم والسكريبتات
├── vite.config.ts                 # إعدادات Vite (React + TailwindCSS)
├── tsconfig.json                  # إعدادات TypeScript
├── components.json                # إعدادات Shadcn UI
├── firebase-applet-config.json    # إعدادات Firebase (client-side)
├── firebase-blueprint.json        # مخططات البيانات (Entities)
├── firestore.rules                # قواعد أمان Firestore
├── metadata.json                  # بيانات وصفية للتطبيق
├── .env.example                   # متغيرات البيئة
├── .gitignore                     # ملفات مستثناة من Git
│
├── src/
│   ├── main.tsx                   # نقطة دخول React
│   ├── App.tsx                    # المكوّن الجذر (Login + Dashboard routing)
│   ├── AuthContext.tsx            # سياق المصادقة (Context Provider)
│   ├── Dashboard.tsx              # لوحة التحكم الرئيسية (كل التبويبات)
│   ├── types.ts                   # أنماط TypeScript (Interfaces)
│   ├── index.css                  # أنماط TailwindCSS + Shadcn theme
│   │
│   ├── lib/
│   │   ├── firebase.ts            # تهيئة Firebase Client SDK
│   │   └── utils.ts               # دالة cn() للـ class merging
│   │
│   ├── services/
│   │   └── notificationService.ts # خدمة الإشعارات
│   │
│   └── components/
│       └── ui/
│           ├── dropdown-menu.tsx   # مكوّن القائمة المنسدلة (Base UI)
│           ├── sonner.tsx          # مكوّن Toast (Sonner)
│           └── switch.tsx          # مكوّن التبديل (Switch)
│
└── context/                       # ملفات التوثيق (أنت هنا)
```

## 🔐 متغيرات البيئة

| المتغير | الوصف | مطلوب |
|---------|-------|-------|
| `GEMINI_API_KEY` | مفتاح API لخدمة Gemini AI | نعم |
| `APP_URL` | رابط التطبيق المستضاف | نعم (يُحقن تلقائياً) |

## 🚀 أوامر التشغيل

```bash
# تثبيت الحزم
npm install

# تشغيل التطوير المحلي (Express + Vite)
npm run dev

# بناء النسخة الإنتاجية
npm run build

# معاينة النسخة الإنتاجية
npm run preview

# فحص TypeScript
npm run lint

# تنظيف مجلد الإنتاج
npm run clean
```

## 🎨 نظام التصميم
- **الخط**: Geist Variable (Google Font)
- **أسلوب المكونات**: Shadcn `base-nova` style
- **لوحة الألوان**: Neutral-based مع oklch
- **البادئة**: بدون بادئة (prefix: "")
- **إعدادات TailwindCSS v4**: عبر `@tailwindcss/vite` plugin
- **اتجاه الواجهة**: RTL (عربي)
- **دعم الوضع المظلم**: متاح (CSS variables dark mode)

## 👥 أدوار المستخدمين
| الدور | الصلاحيات |
|-------|----------|
| **Admin (مسؤول)** | كل الصلاحيات: إنشاء/حذف أنشطة، إدارة موظفين، تكاليف تأسيسية، حذف حجوزات |
| **Manager (مدير)** | قراءة كل البيانات، إنشاء/تعديل حجوزات وتكاليف |

## 🔑 آليات الدخول
1. **دخول المسؤولين**: عبر Google Sign-In (Firebase Auth)
2. **دخول الموظفين**: اسم مستخدم + كلمة مرور (مخزنة في مجموعة `staff` في Firestore)
   - يتم تسجيل دخول مجهول (Anonymous Auth) لضمان عمل قواعد الأمان
   - Fallback إلى جلسة محلية (localStorage) إذا فشل Anonymous Auth

## ⚠️ ملاحظات أمان مهمة
- قواعد Firestore حالياً تستخدم `isLocalOrAuthenticated()` التي تُرجع `true` دائماً (وضع تطوير)
- كلمات مرور الموظفين مخزنة كنص عادي (plaintext) في Firestore
- حساب مسؤول افتراضي يُنشأ تلقائياً: `admin` / `password123`
- إيميلات المسؤولين مشفرة (hardcoded): `aboodafaneh13@gmail.com`, `abd0175149@gmail.com`
