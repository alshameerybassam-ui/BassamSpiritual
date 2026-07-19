const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'BASSAM_SPIRITUAL_SECRET_KEY_2026';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// تهيئة الجداول بالأسماء المتوافقة
const initializeDatabase = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), phone VARCHAR(50), role VARCHAR(50) DEFAULT 'user')`);
        await pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), fullName VARCHAR(255), email VARCHAR(255), userPhone VARCHAR(50), serviceType VARCHAR(255), description TEXT, status VARCHAR(50) DEFAULT 'pending', "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, paymentMethod VARCHAR(100), payment_sender_name VARCHAR(255), payment_transfer_number VARCHAR(100), payment_rejection_reason TEXT, initial_diagnosis TEXT, treatment_plan TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, requestId INTEGER REFERENCES requests(id), senderId INTEGER, senderName VARCHAR(255), senderRole VARCHAR(50), messageText TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, title VARCHAR(255), summary TEXT, content TEXT, icon VARCHAR(100), "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, userId INTEGER REFERENCES users(id), fullName VARCHAR(255), comment TEXT, rating INTEGER DEFAULT 5, isApproved BOOLEAN DEFAULT FALSE, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ai_config (id SERIAL PRIMARY KEY, instructions TEXT)`);
        const aiCount = await pool.query(`SELECT COUNT(*) FROM ai_config`);
        if (parseInt(aiCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO ai_config (instructions) VALUES ($1)`, ['أنت مستشار فقهي وروحاني معتمد في مركز النور الرباني.']);
        }
        console.log("✅ تم بناء جميع الجداول.");
    } catch (err) { console.error("❌ خطأ التهيئة:", err.message); }
};
initializeDatabase();

// إنشاء المدير تلقائياً
(async function initAdmin() {
    try {
        const adminEmail = 'alshameerybassam@gmail.com';
        const adminCheck = await pool.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
        if (adminCheck.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync('bassam112358112358', 8);
            await pool.query(`INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)`, ['الشيخ بسام', adminEmail, hashedPassword, 'admin']);
        }
    } catch (err) { console.error("❌ خطأ في إنشاء المدير:", err.message); }
})();

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'جلسة منتهية' });
        req.user = user; next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'للإدارة فقط' });
    next();
};

// المصادقة
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        const userExists = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: 'البريد مسجل مسبقاً.' });
        await pool.query(`INSERT INTO users (full_name, email, password, phone) VALUES ($1, $2, $3, $4)`, [fullName, email, bcrypt.hashSync(password, 8), phone]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ في التسجيل' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password))
        return res.status(400).json({ error: 'بيانات خاطئة.' });
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    const result = await pool.query(`SELECT id, full_name, email, role FROM users WHERE id = $1`, [req.user.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'جلسة غير صالحة.' });
    res.json({ success: true, user: result.rows[0] });
});

// لوحة المستفيد
app.get('/api/dashboard/me', authenticateToken, async (req, res) => {
    const requests = await pool.query(`SELECT * FROM requests WHERE user_id = $1 ORDER BY "createdAt" DESC`, [req.user.id]);
    const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
    res.json({ success: true, user: user.rows[0], requests: requests.rows });
});

app.post('/api/dashboard/request', authenticateToken, async (req, res) => {
    const { serviceType, description } = req.body;
    if (!description || description.trim().length < 10) return res.status(400).json({ error: 'الرجاء كتابة وصف دقيق للحالة (10 أحرف على الأقل).' });
    const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
    await pool.query(`INSERT INTO requests (user_id, fullName, email, userPhone, serviceType, description) VALUES ($1, $2, $3, $4, $5, $6)`, [req.user.id, user.rows[0].full_name, user.rows[0].email, user.rows[0].phone, serviceType, description]);
    res.json({ success: true });
});

app.get('/api/dashboard/request/:id', authenticateToken, async (req, res) => {
    const result = await pool.query(`SELECT * FROM requests WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'غير موجود.' });
    res.json(result.rows[0]);
});

app.put('/api/dashboard/request/:id/submit-payment', authenticateToken, async (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    await pool.query(`UPDATE requests SET paymentMethod=$1, payment_sender_name=$2, payment_transfer_number=$3, status='payment_submitted' WHERE id=$4`, [paymentMethod, paymentSenderName, paymentTransferNumber, req.params.id]);
    res.json({ success: true });
});

// لوحة المدير
app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT * FROM requests ORDER BY "createdAt" DESC`);
    res.json(result.rows);
});

app.put('/api/admin/requests/:id/accept-initial', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`UPDATE requests SET status = 'accepted_waiting_payment' WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/reject-initial', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`UPDATE requests SET status = 'rejected', payment_rejection_reason = $1 WHERE id = $2`, [req.body.reason || 'بدون سبب', req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/approve-payment', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`UPDATE requests SET status = 'processing' WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/reject-payment', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`UPDATE requests SET status = 'payment_rejected', payment_rejection_reason = $1 WHERE id = $2`, [req.body.reason || 'بدون سبب', req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/diagnose', authenticateToken, requireAdmin, async (req, res) => {
    const { initial_diagnosis, treatment_plan } = req.body;
    await pool.query(`UPDATE requests SET initial_diagnosis = $1, treatment_plan = $2, status = 'diagnosed' WHERE id = $3`, [initial_diagnosis, treatment_plan, req.params.id]);
    res.json({ success: true });
});

// المراسلات
app.get('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const result = await pool.query(`SELECT * FROM messages WHERE requestId = $1 ORDER BY "createdAt" ASC`, [req.params.id]);
    res.json({ success: true, messages: result.rows });
});

app.post('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const { messageText } = req.body;
    await pool.query(`INSERT INTO messages (requestId, senderId, senderName, senderRole, messageText) VALUES ($1, $2, $3, $4, $5)`, [req.params.id, req.user.id, req.user.full_name, req.user.role, messageText]);
    res.json({ success: true });
});

// المقالات والتقييمات والذكاء الاصطناعي والمهندس واستعادة كلمة المرور (كما هي تماماً)
// ... (هنا تأتي باقي المسارات التي أضفناها سابقاً، وهي موجودة في الملف الكامل الذي أرسلته لك)

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('*', (req, res) => { if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'المسار غير موجود.' }); res.sendFile(path.join(__dirname, 'public/index.html')); });

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على ${PORT}`));
