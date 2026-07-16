const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'BASSAM_SPIRITUAL_SECRET_KEY_2026';

// الاتصال بقاعدة بيانات PostgreSQL في Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect()
    .then(() => console.log("🐘 تم الاتصال بقاعدة بيانات PostgreSQL بنجاح!"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err.message));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// بناء الجداول تلقائياً
const initializeDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                role VARCHAR(50) DEFAULT 'user'
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                fullName VARCHAR(255),
                email VARCHAR(255),
                userPhone VARCHAR(50),
                serviceType VARCHAR(255),
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paymentMethod VARCHAR(100),
                payment_sender_name VARCHAR(255),
                payment_transfer_number VARCHAR(100),
                initial_diagnosis TEXT,
                treatment_plan TEXT,
                payment_rejection_reason TEXT
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                "requestId" INTEGER REFERENCES requests(id) ON DELETE CASCADE,
                "senderId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
                "senderName" VARCHAR(255),
                "senderRole" VARCHAR(50),
                "messageText" TEXT,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                summary TEXT,
                content TEXT,
                icon VARCHAR(100) DEFAULT 'bi bi-heart-fill',
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
                "fullName" VARCHAR(255),
                comment TEXT,
                rating INTEGER DEFAULT 5,
                "isApproved" BOOLEAN DEFAULT FALSE,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ai_config (
                id SERIAL PRIMARY KEY,
                instructions TEXT
            );
        `);
        const aiCount = await pool.query(`SELECT COUNT(*) FROM ai_config`);
        if (parseInt(aiCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO ai_config (instructions) VALUES ($1)`, [
                "أنت مستشار فقهي وروحاني معتمد في مركز النور الرباني التابع للشيخ بسام. أجب على استفسارات الزوار بلطف وأدب جم."
            ]);
        }
        console.log("✅ تم التأكد من وجود جميع الجداول.");
    } catch (err) {
        console.error("❌ خطأ في تهيئة قاعدة البيانات:", err.message);
    }
};
initializeDatabase();

// 🛡️ برمجيات التحقق والمصادقة (Middlewares)
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'جلسة منتهية.' });
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'للإدارة فقط.' });
    next();
}

// 📌 1. مسارات المصادقة
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        const userExists = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: 'البريد مسجل مسبقاً.' });
        const hashed = bcrypt.hashSync(password, 8);
        await pool.query(`INSERT INTO users (full_name, email, password, phone) VALUES ($1, $2, $3, $4)`, [fullName, email, hashed, phone]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ في التسجيل.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password))
            return res.status(400).json({ error: 'بيانات خاطئة.' });
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
    } catch (err) { res.status(500).json({ error: 'خطأ في تسجيل الدخول.' }); }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, full_name, email, role FROM users WHERE id = $1`, [req.user.id]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'جلسة غير صالحة.' });
        res.json({ success: true, user: result.rows[0] });
    } catch (e) { res.status(500).json({ error: 'خطأ في التحقق.' }); }
});

// 📌 2. مسارات لوحة المستفيد
app.get('/api/dashboard/me', authenticateToken, async (req, res) => {
    try {
        const requests = await pool.query(
            `SELECT id, serviceType, description, status, "createdAt", initial_diagnosis, treatment_plan 
             FROM requests WHERE user_id = $1 ORDER BY "createdAt" DESC`, [req.user.id]
        );
        const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
        res.json({ success: true, user: user.rows[0], requests: requests.rows });
    } catch (err) { res.status(500).json({ error: 'خطأ في تحميل البيانات.' }); }
});

app.post('/api/dashboard/request', authenticateToken, async (req, res) => {
    const { serviceType, description } = req.body;
    if (!description || description.trim().length < 10)
        return res.status(400).json({ error: 'الرجاء كتابة وصف دقيق للحالة (10 أحرف على الأقل).' });
    try {
        const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
        await pool.query(
            `INSERT INTO requests (user_id, fullName, email, userPhone, serviceType, description, status) 
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [req.user.id, user.rows[0].full_name, user.rows[0].email, user.rows[0].phone, serviceType, description]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ في تقديم الطلب.' }); }
});

app.get('/api/dashboard/request/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM requests WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'غير موجود.' });
        if (parseInt(result.rows[0].user_id) !== parseInt(req.user.id) && req.user.role !== 'admin')
            return res.status(403).json({ error: 'غير مصرح.' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'خطأ في جلب الطلب.' }); }
});

app.put('/api/dashboard/request/:id/submit-payment', authenticateToken, async (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    try {
        await pool.query(
            `UPDATE requests SET paymentMethod=$1, payment_sender_name=$2, payment_transfer_number=$3, status='payment_submitted' WHERE id=$4 AND user_id=$5`,
            [paymentMethod, paymentSenderName, paymentTransferNumber, req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ في حفظ الدفع.' }); }
});

app.post('/api/dashboard/reviews', authenticateToken, async (req, res) => {
    const { comment, rating } = req.body;
    try {
        const user = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [req.user.id]);
        await pool.query(
            `INSERT INTO reviews ("userId", "fullName", comment, rating) VALUES ($1, $2, $3, $4)`,
            [req.user.id, user.rows[0].full_name, comment, rating]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ في إرسال التقييم.' }); }
});

// 📌 3. مسارات لوحة المدير
app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM requests ORDER BY "createdAt" DESC`);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: 'خطأ في جلب الطلبات.' }); }
});

app.put('/api/admin/requests/:id/accept-initial', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE requests SET status = 'accepted_waiting_payment' WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.put('/api/admin/requests/:id/reject-initial', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE requests SET status = 'rejected', payment_rejection_reason = $1 WHERE id = $2`, [req.body.reason || 'بدون سبب', req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.put('/api/admin/requests/:id/approve-payment', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE requests SET status = 'processing' WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.put('/api/admin/requests/:id/reject-payment', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE requests SET status = 'payment_rejected', payment_rejection_reason = $1 WHERE id = $2`, [req.body.reason || 'بدون سبب', req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.put('/api/admin/requests/:id/diagnose', authenticateToken, requireAdmin, async (req, res) => {
    const { initialDiagnosis, treatmentPlan } = req.body;
    try {
        await pool.query(`UPDATE requests SET initial_diagnosis = $1, treatment_plan = $2, status = 'diagnosed' WHERE id = $3`, [initialDiagnosis, treatmentPlan, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

// 📌 4. المراسلات
app.get('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    try {
        const messages = await pool.query(`SELECT * FROM messages WHERE "requestId" = $1 ORDER BY "createdAt" ASC`, [req.params.id]);
        res.json({ success: true, messages: messages.rows });
    } catch (e) { res.status(500).json({ error: 'خطأ في جلب المراسلات.' }); }
});

app.post('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const { messageText } = req.body;
    try {
        await pool.query(
            `INSERT INTO messages ("requestId", "senderId", "senderName", "senderRole", "messageText") VALUES ($1, $2, $3, $4, $5)`,
            [req.params.id, req.user.id, req.user.full_name, req.user.role, messageText]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ في إرسال الرسالة.' }); }
});

// 📌 5. المقالات والتقييمات والذكاء الاصطناعي
app.get('/api/articles', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM articles ORDER BY "createdAt" DESC`);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: 'خطأ في تحميل المقالات.' }); }
});

app.post('/api/admin/articles', authenticateToken, requireAdmin, async (req, res) => {
    const { title, summary, content } = req.body;
    try {
        await pool.query(`INSERT INTO articles (title, summary, content) VALUES ($1, $2, $3)`, [title, summary, content]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ في حفظ المقال.' }); }
});

app.put('/api/admin/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { title, summary, content } = req.body;
    try {
        await pool.query(`UPDATE articles SET title=$1, summary=$2, content=$3 WHERE id=$4`, [title, summary, content, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ في تحديث المقال.' }); }
});

app.delete('/api/admin/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM articles WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ في حذف المقال.' }); }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM reviews WHERE "isApproved" = TRUE ORDER BY "createdAt" DESC`);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: 'خطأ في تحميل التقييمات.' }); }
});

app.get('/api/admin/reviews', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM reviews ORDER BY "createdAt" DESC`);
        res.json({ success: true, reviews: result.rows });
    } catch (e) { res.status(500).json({ error: 'خطأ في تحميل المراجعات.' }); }
});

app.put('/api/admin/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE reviews SET "isApproved" = $1 WHERE id = $2`, [req.body.isApproved, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.delete('/api/admin/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM reviews WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.get('/api/admin/ai-instructions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT instructions FROM ai_config ORDER BY id DESC LIMIT 1`);
        res.json({ success: true, instructions: result.rows[0]?.instructions || '' });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.put('/api/admin/ai-instructions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE ai_config SET instructions = $1`, [req.body.instructions]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.post('/api/ai-chat', async (req, res) => {
    try {
        const config = await pool.query(`SELECT instructions FROM ai_config LIMIT 1`);
        const msg = req.body.message?.toLowerCase() || '';
        let reply = '';
        if (msg.includes('عين') || msg.includes('حسد')) reply = 'أنصحك بقراءة الفاتحة 7 مرات على ماء وشربه.';
        else if (msg.includes('سحر')) reply = 'عليك بالرقية الشرعية.';
        else reply = 'يرجى تقديم طلب للتشخيص الدقيق.';
        res.json({ success: true, reply });
    } catch (e) { res.json({ success: true, reply: 'يرجى تقديم طلب للتشخيص.' }); }
});

// 🤖 6. مهندس المنصة الداخلي (النور الأسود)
const engineer = require('./engineer');
app.post('/api/admin/engineer-command', authenticateToken, requireAdmin, async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'يرجى إرسال أمر.' });
    try {
        const reply = await engineer.executeCommand(command);
        res.json({ success: true, reply });
    } catch (e) {
        res.status(500).json({ error: 'فشل تنفيذ الأمر: ' + e.message });
    }
});

// 🔐 صفحة إعادة ضبط المدير (تُستخدم لمرة واحدة – احذفها بعد الاستخدام)
app.get('/force-reset-admin', async (req, res) => {
    const email = 'alshameerybassam@gmail.com';
    const newPassword = 'bassam112358112358';
    const hashed = bcrypt.hashSync(newPassword, 8);

    try {
        await pool.query(`DELETE FROM users WHERE email = $1`, [email]);
        await pool.query(
            `INSERT INTO users (full_name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5)`,
            ['الشيخ بسام', email, hashed, '777941366', 'admin']
        );
        const token = jwt.sign(
            { id: 0, email: email, role: 'admin', full_name: 'الشيخ بسام' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.send(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head><meta charset="UTF-8"><title>تم بنجاح</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>✅ تم ضبط حساب المدير بنجاح</h1>
                <p>يتم الآن توجيهك إلى لوحة التحكم...</p>
                <script>
                    localStorage.setItem('bassam_auth_token', '${token}');
                    localStorage.setItem('bassam_user', JSON.stringify({ full_name: 'الشيخ بسام', email: '${email}', role: 'admin' }));
                    setTimeout(function() {
                        window.location.href = '/admin.html';
                    }, 2000);
                </script>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send('❌ فشلت العملية: ' + e.message);
    }
});

// 7. توجيه الصفحات (SPA)
app.get('/test-db', async (req, res) => {
    try {
        await pool.query(`SELECT 1`);
        res.json({ message: '✅ قاعدة البيانات متصلة وتعمل.' });
    } catch (e) {
        res.status(500).json({ error: '❌ فشل الاتصال بقاعدة البيانات: ' + e.message });
    }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'المسار غير موجود.' });
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// 8. إطلاق الخادم
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على ${PORT}`);
});
