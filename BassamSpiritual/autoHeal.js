// =================================================================
// autoHeal.js - الحارس الذاتي للمنصة (النور الأسود)
// =================================================================

const fs = require('fs');
const path = require('path');

// اسم ملف قاعدة البيانات
const DB_FILE = path.join(__dirname, 'database.sqlite');

// عداد لإعادة التشغيل الذاتي
let errorCount = 0;
const MAX_ERRORS_BEFORE_RESTART = 3;
const ERROR_RESET_INTERVAL = 30000; // 30 ثانية بدون أخطاء لإعادة تعيين العداد

// دالة المراقبة الذاتية للصحة (Self-Healing)
function startHealthMonitor() {
    // فحص قاعدة البيانات كل 10 ثوانٍ
    setInterval(() => {
        try {
            // محاولة قراءة الملف للتأكد من أنه غير تالف
            if (fs.existsSync(DB_FILE)) {
                fs.accessSync(DB_FILE, fs.constants.R_OK | fs.constants.W_OK);
                // إذا وصلنا إلى هنا، فالملف موجود وقابل للقراءة والكتابة
            } else {
                console.log('⚠️ [الحارس] ملف قاعدة البيانات غير موجود. سيتم إنشاؤه تلقائيًا عند الطلب الأول.');
            }
        } catch (err) {
            console.error(`❌ [الحارس] خطأ في قاعدة البيانات: ${err.message}. جاري إعادة التشغيل الذاتي...`);
            restartServer();
        }
    }, 10000);

    // إعادة تعيين عداد الأخطاء كل 30 ثانية
    setInterval(() => {
        errorCount = 0;
    }, ERROR_RESET_INTERVAL);
}

// دالة معالجة الأخطاء العامة (Global Error Handler)
function setupErrorHandling(app) {
    // التقاط الأخطاء التي تحدث أثناء الطلبات
    app.use((err, req, res, next) => {
        errorCount++;
        const errorMessage = `[${new Date().toISOString()}] خطأ عام: ${err.message}\nStack: ${err.stack}\n`;
        
        // تسجيل الخطأ في ملف خاص
        fs.appendFileSync(path.join(__dirname, 'error.log'), errorMessage);

        // إذا تكرر الخطأ أكثر من الحد المسموح، أعد تشغيل الخادم
        if (errorCount >= MAX_ERRORS_BEFORE_RESTART) {
            console.error('❌ [الحارس] تم اكتشاف أخطاء متكررة. جاري إعادة التشغيل الذاتي...');
            restartServer();
        }

        // إرسال رد خطأ للعميل
        res.status(500).json({ error: 'عذرًا، حدث خطأ فني. يعمل الحارس على إصلاحه.' });
    });

    // التقاط الأخطاء غير المتوقعة على مستوى العملية (Unhandled Rejections)
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ [الحارس] خطأ غير معالج:', reason);
        errorCount++;
        fs.appendFileSync(path.join(__dirname, 'error.log'), `[${new Date().toISOString()}] خطأ غير معالج: ${reason}\n`);
    });
}

// دالة إعادة التشغيل الذاتي
function restartServer() {
    console.log('🔄 [الحارس] جاري إعادة تشغيل الخادم...');
    // إرسال إشارة إلى الخادم لإعادة التشغيل بعد ثانية واحدة
    setTimeout(() => {
        process.exit(0); // الخروج من العملية، وسيقوم مدير العمليات (مثل Render) بإعادة تشغيلها تلقائيًا
    }, 1000);
}

// تصدير الدوال ليتم استخدامها في server.js
module.exports = { startHealthMonitor, setupErrorHandling };
