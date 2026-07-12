const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// ==============================================
// 1. البرمجيات الوسيطة الأساسية (Middlewares)
// ==============================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================
// 2. الاتصال بقاعدة البيانات السحابية PostgreSQL
// ==============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => console.log("🐘 [قاعدة البيانات] تم الاتصال بـ PostgreSQL بنجاح!"))
    .catch(err => console.error("❌ [قاعدة البيانات] خطأ في الاتصال:", err.message));

app.set('db', pool);

// ==============================================
// 3. تهيئة وبناء الجداول سحابياً
// ==============================================
const initializeDatabase = async () => {
    try {
        console.log("🧹 [قاعدة البيانات] جاري فحص وتحديث الجداول...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                phone VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                service_type VARCHAR(255) DEFAULT 'استشارة عامة',
                description TEXT NOT NULL,
                contact_method VARCHAR(100) DEFAULT 'واتساب',
                status VARCHAR(50) DEFAULT 'pending',
                initial_diagnosis TEXT,
                treatment_plan TEXT,
                additional_treatment_cost NUMERIC DEFAULT 0.00,
                treatment_duration_days INTEGER DEFAULT 0,
                treatment_expires_at TIMESTAMP,
                is_message_locked BOOLEAN DEFAULT FALSE,
                payment_method VARCHAR(100),
                payment_sender_name VARCHAR(255),
                payment_transfer_number VARCHAR(100),
                payment_submitted_at TIMESTAMP,
                payment_rejection_reason TEXT,
                initial_rejection_reason TEXT,
                total_paid_amount NUMERIC DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS request_messages (
                id SERIAL PRIMARY KEY,
                request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                sender_role VARCHAR(50) NOT NULL,
                message_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                summary TEXT,
                content TEXT,
                icon VARCHAR(100) DEFAULT 'bi bi-heart-fill',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
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
        console.log("✅ [قاعدة البيانات] جميع الجداول جاهزة ومحدثة.");
    } catch (err) {
        console.error("❌ [قاعدة البيانات] خطأ حرج أثناء التهيئة:", err.message);
    }
};
initializeDatabase();

// ==============================================
// 4. البرمجيات الوسيطة للتحقق من الصلاحيات (JWT)
// ==============================================
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, error: 'الرجاء تسجيل الدخول.' });
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (e) {
        res.status(401).json({ success: false, error: 'جلسة غير صالحة.' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'غير مصرح. هذه الصلاحية للإدارة فقط.' });
    }
    next();
};

// ==============================================
// 5. مسارات المصادقة (Auth)
// ==============================================
app.post('/api/auth/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'بيانات غير صالحة.', details: errors.array() });

    const { fullName, email, password, phone } = req.body;
    const finalName = fullName || "مستفيد جديد";

    try {
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(409).json({ success: false, error: 'البريد مسجل مسبقاً.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (full_name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role',
            [finalName, email, hashedPassword, 'user', phone || null]
        );

        const newUser = result.rows[0];
        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({
            success: true,
            token,
            user: { id: newUser.id, fullName: newUser.full_name, email: newUser.email, role: newUser.role }
        });
    } catch (err) {
        console.error('❌ [Auth] خطأ أثناء التسجيل:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ في النظام.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ success: false, error: 'البريد أو كلمة المرور غير صحيحة.' });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, error: 'البريد أو كلمة المرور غير صحيحة.' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            success: true,
            token,
            user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('❌ [Auth] خطأ أثناء تسجيل الدخول:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ في النظام.' });
    }
});

app.get('/api/auth/verify', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, full_name, email, role FROM users WHERE id = $1', [req.userId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'مستخدم غير موجود.' });
        res.json({ success: true, user: result.rows[0] });
    } catch (e) {
        res.status(500).json({ success: false, error: 'خطأ في التحقق.' });
    }
});

// ==============================================
// 6. مسارات لوحة تحكم المستفيد (Dashboard)
// ==============================================
app.get('/api/dashboard/me', verifyToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, full_name, email, role, phone, created_at FROM users WHERE id = $1', [req.userId]);
        if (user.rows.length === 0) return res.status(404).json({ success: false, error: 'مستخدم غير موجود.' });

        const requests = await pool.query(
            `SELECT id, service_type, status, description, initial_diagnosis, treatment_plan, created_at
             FROM requests WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.userId]
        );

        res.json({
            success: true,
            user: user.rows[0],
            requests: requests.rows
        });
    } catch (err) {
        console.error('❌ [Dashboard] خطأ في /me:', err.message);
        res.status(500).json({ success: false, error: 'خطأ في تحميل البيانات.' });
    }
});

app.post('/api/dashboard/request', verifyToken, async (req, res) => {
    const { serviceType, description, contactMethod } = req.body;
    if (!description || description.trim().length < 10) {
        return res.status(400).json({ success: false, error: 'الرجاء كتابة وصف دقيق للحالة (10 أحرف على الأقل).' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO requests (user_id, service_type, description, contact_method, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [req.userId, serviceType || 'استشارة عامة', description, contactMethod || 'واتساب', 'pending']
        );
        res.json({ success: true, requestId: result.rows[0].id, message: '✅ تم تقديم طلبك بنجاح.' });
    } catch (err) {
        console.error('❌ [Dashboard] خطأ في تقديم الطلب:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ في حفظ الطلب.' });
    }
});

app.get('/api/dashboard/request/:id', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM requests WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
        if (parseInt(result.rows[0].user_id) !== parseInt(req.userId)) return res.status(403).json({ success: false, error: 'غير مصرح.' });
        res.json({ success: true, request: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'خطأ في جلب الطلب.' });
    }
});

app.put('/api/dashboard/request/:id/submit-payment', verifyToken, async (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    if (!paymentMethod || !paymentSenderName || !paymentTransferNumber) {
        return res.status(400).json({ success: false, error: 'يرجى ملء جميع بيانات التحويل.' });
    }
    try {
        const result = await pool.query(
            `UPDATE requests SET payment_method = $1, payment_sender_name = $2, payment_transfer_number = $3,
             status = 'payment_submitted', payment_submitted_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND user_id = $5 RETURNING id`,
            [paymentMethod, paymentSenderName, paymentTransferNumber, req.params.id, req.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
        res.json({ success: true, message: '✅ تم إرسال إيصال التحويل.' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'خطأ في حفظ بيانات الدفع.' });
    }
});

// ==============================================
// 7. مسارات لوحة تحكم الشيخ (Admin)
// ==============================================
app.get('/api/admin/requests', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, u.full_name, u.email FROM requests r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC`
        );
        res.json(result.rows);
    } catch (e) {
        console.error('❌ [Admin] خطأ في جلب الطلبات:', e.message);
        res.status(500).json({ success: false, error: 'خطأ في جلب الطلبات.' });
    }
});

app.put('/api/admin/requests/:id/accept-initial', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`UPDATE requests SET status = 'accepted_waiting_payment' WHERE id = $1 RETURNING id`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
        res.json({ success: true, message: '✅ تم قبول الطلب.' });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ.' }); }
});

app.put('/api/admin/requests/:id/reject-initial', verifyToken, verifyAdmin, async (req, res) => {
    const { reason } = req.body;
    try {
        await pool.query(`UPDATE requests SET status = 'rejected_by_admin', initial_rejection_reason = $1 WHERE id = $2`, [reason || 'بدون سبب', req.params.id]);
        res.json({ success: true, message: '🔴 تم رفض الطلب.' });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ.' }); }
});

app.put('/api/admin/requests/:id/approve-payment', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE requests SET status = 'processing' WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: '✅ تم اعتماد الدفع.' });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ.' }); }
});

app.put('/api/admin/requests/:id/reject-payment', verifyToken, verifyAdmin, async (req, res) => {
    const { reason } = req.body;
    try {
        await pool.query(`UPDATE requests SET status = 'payment_rejected', payment_rejection_reason = $1 WHERE id = $2`, [reason || 'بدون سبب', req.params.id]);
        res.json({ success: true, message: '🔴 تم رفض الدفع.' });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ.' }); }
});

app.delete('/api/admin/requests/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: '🗑️ تم حذف الطلب.' });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ في الحذف.' }); }
});

// ==============================================
// 8. مسارات المقالات والمراجعات
// ==============================================
app.get('/api/articles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: 'خطأ في تحميل المقالات.' }); }
});

app.get('/api/admin/reviews', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
        res.json({ success: true, reviews: result.rows });
    } catch (e) { res.status(500).json({ success: false, error: 'خطأ في تحميل المراجعات.' }); }
});

// ==============================================
// 9. توجيه الصفحات (SPA Routing)
// ==============================================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'المسار غير موجود.' });
    }
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ==============================================
// 10. إطلاق الخادم
// ==============================================
app.listen(PORT, () => {
    console.log(`🚀 [النور الرباني] السيرفر يعمل على المنفذ ${PORT}`);
});
