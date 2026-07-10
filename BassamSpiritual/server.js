const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg'); // استدعاء محرك PostgreSQL
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================
// 1. البرمجيات الوسيطة الأساسية (Middlewares)
// ==============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تشغيل الملفات الساكنة
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================
// 2. الاتصال بقاعدة البيانات السحابية PostgreSQL
// ==============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // مطلوب لتأمين الاتصال مع سيرفرات Render
    }
});

pool.connect()
    .then(() => console.log("🐘 [نظام النور] تم الاتصال بقاعدة بيانات PostgreSQL السحابية بنجاح!"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err.message));

// ==============================================
// 2.5 تهيئة وبناء الجداول سحابياً تلقائياً (Tables Schema)
// ==============================================
const initializeDatabase = async () => {
    try {
        // أ. جدول المستخدمين (المستفيدين والإدارة)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ب. جدول طلبات المستفيدين (مرتبط بجدول المستخدمين)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                service_type VARCHAR(255) DEFAULT 'استشارة عامة',
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ج. جدول المقالات الديناميكي (الذي طلبته لقراءتها وتعديلها من لوحة التحكم)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                summary TEXT,
                content TEXT,
                icon VARCHAR(100) DEFAULT 'fa-solid fa-heart',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("⚙️ [نظام النور] تم فحص وتأمين كافة الجداول السحابية بنجاح.");
    } catch (err) {
        console.error("❌ خطأ أثناء تهيئة الجداول الحيوية:", err.message);
    }
};
initializeDatabase();

// مشاركة الـ pool مع ملفات المسارات الفرعية (Routes) لتقرأ من نفس القاعدة
app.set('db', pool);

// ==============================================
// 3. ربط المسارات الفرعية المحدثة (Routes)
// ==============================================
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);

// ==============================================
// 📊 مسارات لوحة المدير والمقالات المحدثة لـ PostgreSQL
// ==============================================

// أ. مسار جلب كافة طلبات المستفيدين وعرضها في لوحة المدير
app.get('/api/admin/requests', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'غير مصرح بالدخول' });

        const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        // التحقق من صلاحية المدير من القاعدة
        const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [decoded.id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'عذراً، هذه البيانات خاصة بفضيلة الشيخ بسام!' });
        }

        // جلب الطلبات مع أسماء أصحابها عبر دمج الجداول (JOIN)
        const allRequests = await pool.query(`
            SELECT r.id, r.user_id as "userId", u.full_name as "fullName", u.email, 
                   r.service_type as "serviceType", r.status, r.created_at as "createdAt"
            FROM requests r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);

        res.json(allRequests.rows);
    } catch (e) {
        res.status(401).json({ error: 'انتهت الجلسة أو الرمز غير صالح' });
    }
});

// ب. مسار جلب المقالات السحابي للواجهة الأمامية
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(articles.rows);
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء تحميل المقالات السحابية" });
    }
});

// ==============================================
// 🔐 نظام الترقية المستمرة والمؤتمتة لحساب الشيخ بسام سحابياً
// ==============================================
setInterval(async () => {
    try {
        const checkAdmin = await pool.query('SELECT role FROM users WHERE email = $1', ["alshameerybassam@gmail.com"]);
        if (checkAdmin.rows.length > 0 && checkAdmin.rows[0].role !== 'admin') {
            await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', "alshameerybassam@gmail.com"]);
            console.log("✅ [نظام النور] تم تأكيد رتبة الإدارة لحساب الشيخ بسام سحابياً في PostgreSQL.");
        }
    } catch (e) {
        console.log("❌ خطأ في الترقية التلقائية السحابية:", e.message);
    }
}, 10000);

// ==============================================
// 4. التوجيه الذكي للواجهات (SPA Routing)
// ==============================================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'مسار الـ API غير موجود' });
    }
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// إطلاق العمل
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 سيرفر النور السحابي يعمل بنجاح وثبات على المنفذ: ${PORT}`);
    console.log(`====================================================`);
});
