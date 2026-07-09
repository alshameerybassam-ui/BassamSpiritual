const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // استدعاء وحدة نظام الملفات الأساسية
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
});

// ==============================================
// 3. التوجيه الذكي للواجهات (SPA Routing)
// ==============================================
// لضمان عمل الصفحات الفرعية وتحديث المتصفح دون ظهور أخطاء 404
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// أي مسار آخر غير معرف يتم تحويله لصفحة الرئيسية تلقائياً
app.get('*', (req, res) => {
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
