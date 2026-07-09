const express = require('express');
const cors = require('cors');
const path = require('path');
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
// 2. استدعاء وربط المسارات (Routes)
// ==============================================
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');

// تفعيل المسارات وضخها خلف بادئة واجهة برمجة التطبيقات (/api)
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);

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

// أي مسار آخر غير معرف يتم تحويله لصفحة الرئيسية أو صفحة الدخول تلقائياً
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
    console.log(`📅 توقيت النظام الحلي: ${new Date().toLocaleString('ar-SA')}`);
    console.log(`====================================================`);
});
