const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // استدعاء وحدة نظام الملفات الأساسية
const jwt = require('jsonwebtoken'); // استدعاء جي دبليو تي للتحقق من المدير
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================
// 1. البرمجيات الوسيطة الأساسية (Middlewares)
// ==============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تشغيل الملفات الساكنة (الواجهات الأمامية HTML, CSS, JS) من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================
// 2. استدعاء وربط المسارات الأساسية (Routes)
// ==============================================
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');

// تفعيل المسارات وضخها خلف بادئة واجهة برمجة التطبيقات (/api)
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);

// ==============================================
// 2.5 مسارات ديناميكية للمقالات، الآراء، ورصيد الشات
// ==============================================
const ARTICLES_FILE = path.join(__dirname, 'data/articles.json');
const TESTIMONIALS_FILE = path.join(__dirname, 'data/testimonials.json');
const USERS_FILE = path.join(__dirname, 'data/users.json');

// التأكد الذاتي من وجود مجلد data وملفات الـ JSON حتى لا يتوقف السيرفر عند التشغيل الأول
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(ARTICLES_FILE)) fs.writeFileSync(ARTICLES_FILE, JSON.stringify([]));
if (!fs.existsSync(TESTIMONIALS_FILE)) fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify([]));

// أ. مسار تحديث رصيد رسائل المستشار الذكي
app.get('/api/chat/credits', (req, res) => {
    res.json({ success: true, remaining: 50 });
});

// ب. مسار جلب المقالات الثلاثة من ملف الـ JSON
app.get('/api/articles', (req, res) => {
    try {
        const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8'));
        res.json(articles);
    } catch (error) {
        console.error('خطأ في قراءة ملف المقالات:', error);
        res.status(500).json({ error: "حدث خطأ أثناء تحميل المقالات" });
    }
});

// ج. مسار جلب شهادات وآراء المستفيدين الثلاثة من ملف الـ JSON
app.get('/api/testimonials', (req, res) => {
    try {
        const testimonials = JSON.parse(fs.readFileSync(TESTIMONIALS_FILE, 'utf8'));
        res.json(testimonials);
    } catch (error) {
        console.error('خطأ في قراءة ملف الشهادات:', error);
        res.status(500).json({ error: "حدث خطأ أثناء تحميل الآراء" });
    }
}); // 💡 تم إصلاح القوس المغلق هنا بنجاح

// ==============================================
// 📊 مسار خاص بـ لوحة المدير لجلب كل طلبات المستفيدين بأمان لإنهاء خطأ الاتصال
// ==============================================
app.get('/api/admin/requests', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'غير مصرح بالدخول' });

        const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        if (fs.existsSync(USERS_FILE)) {
            const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            const user = users.find(u => u.id === decoded.id);
            
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'بيانات خاصة بالإدارة فقط' });
            }

            let allRequests = [];
            users.forEach(u => {
                if (u.requests && Array.isArray(u.requests)) {
                    u.requests.forEach(reqst => {
                        allRequests.push({
                            id: reqst.id,
                            userId: u.id,
                            fullName: u.fullName,
                            email: u.email,
                            serviceType: reqst.serviceType || 'استشارة عامة',
                            status: reqst.status || 'pending',
                            createdAt: reqst.createdAt || u.createdAt
                        });
                    });
                }
            });
            return res.json(allRequests);
        }
        res.json([]);
    } catch (e) {
        res.status(401).json({ error: 'انتهت الجلسة أو الرمز غير صالح' });
    }
});

// ==============================================
// 🔐 نظام الترقية المستمرة والمؤتمتة لحساب الشيخ بسام
// ==============================================
setInterval(() => {
    try {
        if (fs.existsSync(USERS_FILE)) {
            let fileContent = fs.readFileSync(USERS_FILE, 'utf8');
            if (fileContent.trim().length > 0) {
                let users = JSON.parse(fileContent);
                let myAccount = users.find(u => u.email === "alshameerybassam@gmail.com");
                
                if (myAccount && myAccount.role !== "admin") {
                    myAccount.role = "admin";
                    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
                    console.log("✅ [نظام النور] تم تأكيد رتبة الإدارة لحساب الشيخ بسام.");
                }
            }
        }
    } catch (e) {
        console.log("❌ خطأ أثناء فحص رتبة المدير:", e.message);
    }
}, 5000);

// ==============================================
// 3. التوجيه الذكي للواجهات (SPA Routing)
// ==============================================
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// ⚠️ منع مسار النجمة من اعتراض طلبات الـ API غير الموجودة وإعادة HTML بدلاً منها
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'مسار الـ API المطلوب غير موجود في السيرفر' });
    }
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ==============================================
// 4. معالجة الأخطاء العامة بالسيرفر
// ==============================================
app.use((err, req, res, next) => {
    console.error('❌ خطأ غير متوقع في النظام:', err.stack);
    res.status(500).json({
        success: false,
        error: 'حدث خطأ داخلي في الخادم، جاري العمل على صيانته.'
    });
});

// ==============================================
// 5. إطلاق السيرفر وتدشين العمل الميداني
// ==============================================
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 السيرفر يعمل بنجاح وكفاءة تامة على المنفذ: ${PORT}`);
    console.log(`🔒 مفتاح التشفير النشط: ${process.env.JWT_SECRET ? 'مؤمن عبر الـ Environment' : 'مفتاح افتراضي مؤقت'}`);
    console.log(`📅 توقيت النظام الحالي: ${new Date().toLocaleString('ar-SA')}`);
    console.log(`====================================================`);
});
