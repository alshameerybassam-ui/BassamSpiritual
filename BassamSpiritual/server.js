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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إنشاء الجداول إذا لم تكن موجودة
pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), phone VARCHAR(50), role VARCHAR(50) DEFAULT 'user')`);
pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, user_id INTEGER, fullName VARCHAR(255), email VARCHAR(255), userPhone VARCHAR(50), serviceType VARCHAR(255), description TEXT, status VARCHAR(50) DEFAULT 'pending', "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, paymentMethod VARCHAR(100), payment_sender_name VARCHAR(255), payment_transfer_number VARCHAR(100), initial_diagnosis TEXT, treatment_plan TEXT)`);
pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, requestId INTEGER, senderId INTEGER, senderName VARCHAR(255), senderRole VARCHAR(50), messageText TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
pool.query(`CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, title VARCHAR(255), summary TEXT, content TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
pool.query(`CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, userId INTEGER, fullName VARCHAR(255), comment TEXT, rating INTEGER, isApproved BOOLEAN DEFAULT FALSE, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

// إنشاء المدير
(async () => {
    const r = await pool.query(`SELECT id FROM users WHERE email='alshameerybassam@gmail.com'`);
    if (r.rows.length === 0) {
        await pool.query(`INSERT INTO users (full_name, email, password, role) VALUES ($1,$2,$3,$4)`, ['الشيخ بسام', 'alshameerybassam@gmail.com', bcrypt.hashSync('bassam112358112358', 8), 'admin']);
    }
})();

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'جلسة منتهية' });
        req.user = user; next();
    });
}

// تسجيل الدخول والخروج
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    const exists = await pool.query(`SELECT id FROM users WHERE email=$1`, [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'البريد مسجل' });
    await pool.query(`INSERT INTO users (full_name, email, password, phone) VALUES ($1,$2,$3,$4)`, [fullName, email, bcrypt.hashSync(password, 8), phone]);
    res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const r = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
    if (r.rows.length === 0 || !bcrypt.compareSync(password, r.rows[0].password)) return res.status(400).json({ error: 'بيانات خاطئة' });
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET);
    res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
});

app.get('/api/auth/verify', auth, async (req, res) => {
    const r = await pool.query(`SELECT id, full_name, email, role FROM users WHERE id=$1`, [req.user.id]);
    if (r.rows.length === 0) return res.status(401).json({ error: 'غير موجود' });
    res.json({ success: true, user: r.rows[0] });
});

// لوحة المستفيد
app.get('/api/dashboard/me', auth, async (req, res) => {
    const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id=$1`, [req.user.id]);
    const requests = await pool.query(`SELECT * FROM requests WHERE user_id=$1 ORDER BY "createdAt" DESC`, [req.user.id]);
    res.json({ success: true, user: user.rows[0], requests: requests.rows });
});

app.post('/api/dashboard/request', auth, async (req, res) => {
    const { serviceType, description } = req.body;
    const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id=$1`, [req.user.id]);
    await pool.query(`INSERT INTO requests (user_id, fullName, email, userPhone, serviceType, description) VALUES ($1,$2,$3,$4,$5,$6)`, [req.user.id, user.rows[0].full_name, user.rows[0].email, user.rows[0].phone, serviceType, description]);
    res.json({ success: true });
});

app.get('/api/dashboard/request/:id', auth, async (req, res) => {
    const r = await pool.query(`SELECT * FROM requests WHERE id=$1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json(r.rows[0]);
});

// لوحة المدير
app.get('/api/admin/requests', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const r = await pool.query(`SELECT * FROM requests ORDER BY "createdAt" DESC`);
    res.json(r.rows);
});

app.put('/api/admin/requests/:id/accept-initial', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    await pool.query(`UPDATE requests SET status='accepted_waiting_payment' WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/diagnose', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const { initial_diagnosis, treatment_plan } = req.body;
    await pool.query(`UPDATE requests SET initial_diagnosis=$1, treatment_plan=$2, status='diagnosed' WHERE id=$3`, [initial_diagnosis, treatment_plan, req.params.id]);
    res.json({ success: true });
});

app.post('/api/requests/:id/messages', auth, async (req, res) => {
    const { messageText } = req.body;
    await pool.query(`INSERT INTO messages (requestId, senderId, senderName, senderRole, messageText) VALUES ($1,$2,$3,$4,$5)`, [req.params.id, req.user.id, req.user.full_name, req.user.role, messageText]);
    res.json({ success: true });
});

app.get('/api/requests/:id/messages', auth, async (req, res) => {
    const r = await pool.query(`SELECT * FROM messages WHERE requestId=$1 ORDER BY "createdAt" ASC`, [req.params.id]);
    res.json({ success: true, messages: r.rows });
});

// مقالات
app.get('/api/articles', async (req, res) => {
    const r = await pool.query(`SELECT * FROM articles ORDER BY "createdAt" DESC`);
    res.json(r.rows);
});

app.post('/api/admin/articles', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const { title, summary, content } = req.body;
    await pool.query(`INSERT INTO articles (title, summary, content) VALUES ($1,$2,$3)`, [title, summary, content]);
    res.json({ success: true });
});

app.delete('/api/admin/articles/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    await pool.query(`DELETE FROM articles WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
});

// تقييمات
app.get('/api/reviews', async (req, res) => {
    const r = await pool.query(`SELECT * FROM reviews WHERE isApproved=TRUE ORDER BY "createdAt" DESC`);
    res.json(r.rows);
});

app.post('/api/dashboard/reviews', auth, async (req, res) => {
    const { comment, rating } = req.body;
    const user = await pool.query(`SELECT full_name FROM users WHERE id=$1`, [req.user.id]);
    await pool.query(`INSERT INTO reviews (userId, fullName, comment, rating) VALUES ($1,$2,$3,$4)`, [req.user.id, user.rows[0].full_name, comment, rating]);
    res.json({ success: true });
});

app.get('/api/admin/reviews', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    const r = await pool.query(`SELECT * FROM reviews ORDER BY "createdAt" DESC`);
    res.json({ success: true, reviews: r.rows });
});

app.put('/api/admin/reviews/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
    await pool.query(`UPDATE reviews SET isApproved=$1 WHERE id=$2`, [req.body.isApproved, req.params.id]);
    res.json({ success: true });
});

// الصفحات
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('*', (req, res) => { if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'المسار غير موجود' }); res.sendFile(path.join(__dirname, 'public/index.html')); });

app.listen(PORT, () => console.log(`🚀 ${PORT}`));
