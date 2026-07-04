require('dotenv').config();
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد الـ Proxy (لـ Render)
app.set('trust proxy', 1);

// ==============================================
// الإعدادات الأمنية والأداء
// ==============================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "script-src-attr": ["'unsafe-inline'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "font-src": ["'self'", "https:", "data:"],
            "style-src": ["'self'", "'unsafe-inline'", "https:"],
            "img-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'", "https://generativelanguage.googleapis.com"],
        },
    },
}));

app.use(cors());
app.use(compression());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'تم تجاوز عدد الطلبات المسموح بها.' },
    trustProxy: true,
});
app.use('/api/', limiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================
// إنشاء مجلدات البيانات
// ==============================================
const DATA_DIR = path.join(__dirname, 'data');
fs.ensureDirSync(DATA_DIR);

// ==============================================
// استيراد المسارات
// ==============================================
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat');

// ==============================================
// المسارات العامة
// ==============================================
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);

// ==============================================
// مسارات المقالات والشهادات (للواجهة الرئيسية)
// ==============================================
app.get('/api/articles', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));
        res.json(data.articles || []);
    } catch (e) {
        res.json([]);
    }
});

app.get('/api/testimonials', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));
        res.json(data.testimonials || []);
    } catch (e) {
        res.json([]);
    }
});

// ==============================================
// تقديم الملفات الثابتة
// ==============================================
app.use(express.static('public', {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// صفحة النسب الشريف
app.get('/about-sheikh.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about-sheikh.html'));
});

// ==============================================
// تشغيل الخادم
// ==============================================
app.listen(PORT, () => {
    console.log(`🔒 مركز النور الرباني والنفس الرحماني يعمل على http://localhost:${PORT}`);
    console.log(`📊 لوحة التحكم: http://localhost:${PORT}/admin.html`);
});
