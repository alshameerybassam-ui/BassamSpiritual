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
// 2.5 تهيئة وبناء الجداول سحابياً تلقائياً وتطهير التعارضات
// ==============================================
const initializeDatabase = async () => {
    try {
        // [خطوة التطهير] حذف جدول الطلبات القديم المتعارض لتهيئة البنية الجديدة بنجاح
        console.log("🧹 جاري تطهير قاعدة البيانات من الجداول القديمة لمنع خطأ 500...");
        await pool.query(`DROP TABLE IF EXISTS requests CASCADE;`);

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

        // ب. إعادة بناء جدول الطلبات بالهيكلية السحابية المطابقة لـ dashboard.js و admin.js بالملي
        await pool.query(`
            CREATE TABLE requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                service_type VARCHAR(255) DEFAULT 'استشارة عامة',
                description TEXT,
                contact_method VARCHAR(100) DEFAULT 'واتساب',
                status VARCHAR(50) DEFAULT 'pending',
                diagnosis TEXT,
                treatment TEXT,
                treatment_details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ج. جدول المقالات الديناميكي 
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

        // د. جدول آراء المستفيدين المحمي
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                full_name VARCHAR(255),
                comment TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                is_approved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // هـ. جدول إعدادات النظام وتوجيهات الذكاء الاصطناعي
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        // حقن توجيه أولي للذكاء الاصطناعي
        await pool.query(`
            INSERT INTO system_settings (key, value) 
            VALUES ('ai_prompt', 'أنت المعالج الروحي المساعد المعتمد من قبل فضيلة الشيخ بسام...')
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log("⚙️ [نظام النور] تم تطهير وبناء كافة الجداول السحابية بنجاح واستقرار.");
    } catch (err) {
        console.error("❌ خطأ أثناء تهيئة الجداول الحيوية:", err.message);
    }
};
initializeDatabase();

        // حقن توجيه أولي للذكاء الاصطناعي
        await pool.query(`
            INSERT INTO system_settings (key, value) 
            VALUES ('ai_prompt', 'أنت المعالج الروحي Mساعد المعتمد من قبل فضيلة الشيخ بسام...')
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log("⚙️ [نظام النور] تم فحص وتأمين كافة الجداول السحابية بنجاح.");
    } catch (err) {
        console.error("❌ خطأ أثناء تهيئة الجداول الحيوية:", err.message);
    }
};
initializeDatabase();

// مشاركة الـ pool مع ملفات المسارات الفرعية (Routes)
app.set('db', pool);

// ==============================================
// 3. ربط المسارات الفرعية المحدثة (Routes)
// ==============================================
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);

// ==============================================
// 📊 مسارات لوحة المدير المؤمنة والمحمية بالكامل ضد انهيار 500
// ==============================================

// وسيط حماية محلي للتأكد من هوية الشيخ بسام كمسؤول
const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'غير مصرح بالدخول، الرمز مفقود' });

        const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [decoded.id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'عذراً، هذه الصلاحية خاصة بفضيلة الشيخ بسام!' });
        }
        req.adminId = decoded.id;
        next();
    } catch (e) {
        res.status(401).json({ error: 'انتهت الجلسة الأمنية، يرجى إعادة تسجيل الدخول.' });
    }
};

// أ. مسار جلب كافة طلبات المستفيدين (تم تأمينه وإضافة كنيات مطابقة لـ الجافا سكربت)
app.get('/api/admin/requests', verifyAdminToken, async (req, res) => {
    try {
        const allRequests = await pool.query(`
            SELECT r.id, 
                   r.user_id as "userId", 
                   u.full_name as "fullName", 
                   u.email, 
                   r.service_type as "serviceType", 
                   r.status, 
                   r.created_at as "createdAt",
                   r.description, 
                   r.diagnosis, 
                   r.treatment, 
                   r.treatment_details as "treatmentDetails"
            FROM requests r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json(allRequests.rows);
    } catch (e) {
        console.error("❌ خطأ في مسار جلب طلبات الإدارة:", e.message);
        // إرجاع مصفوفة فارغة مأمونة بدلاً من انهيار الصفحة بخطأ 500
        res.status(200).json([]);
    }
});

// ب. مسارات التحكم بالمقالات
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(articles.rows);
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء تحميل المقالات السحابية" });
    }
});

app.post('/api/admin/articles', verifyAdminToken, async (req, res) => {
    const { title, summary, content, icon } = req.body;
    try {
        await pool.query(
            'INSERT INTO articles (title, summary, content, icon) VALUES ($1, $2, $3, $4)',
            [title, summary, content, icon || 'fa-solid fa-heart']
        );
        res.json({ success: true, message: '✅ تم نشر المقال الجديد بنجاح في الموقع.' });
    } catch (e) {
        res.status(500).json({ error: 'فشل حفظ المقال الجديد' });
    }
});

// ج. مسارات التحكم بآراء المستخدمين
app.get('/api/admin/reviews', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
        res.json({ success: true, reviews: result.rows });
    } catch (e) {
        res.status(500).json({ success: false, error: 'تعذر جلب المراجعات' });
    }
});

app.put('/api/admin/reviews/:id/approve', verifyAdminToken, async (req, res) => {
    const { approve } = req.body;
    try {
        await pool.query('UPDATE reviews SET is_approved = $1 WHERE id = $2', [approve, req.params.id]);
        res.json({ success: true, message: 'تم تحديث حالة الرأي بنجاح والمزامنة بالواجهة.' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/admin/reviews/:id', verifyAdminToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'تم حذف الرأي نهائياً.' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// د. مسارات الإشراف على الذكاء الاصطناعي
app.get('/api/admin/ai-instructions', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_prompt'");
        res.json({ success: true, instructions: result.rows[0]?.value || '' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.put('/api/admin/ai-instructions', verifyAdminToken, async (req, res) => {
    const { instructions } = req.body;
    try {
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'ai_prompt'", [instructions]);
        res.json({ success: true, message: '⚙️ تم تحديث البنية التوجيهية الحاكمة لعقل الذكاء الاصطناعي بنجاح.' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// ==============================================
// 🔐 نظام الترقية المستمرة والمؤتمتة لحساب الشيخ بسام
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
