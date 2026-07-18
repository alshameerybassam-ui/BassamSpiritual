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

// --- تهيئة الجداول الشاملة ---
const initializeDatabase = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), phone VARCHAR(50), role VARCHAR(50) DEFAULT 'user')`);
        await pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), fullname VARCHAR(255), email VARCHAR(255), userphone VARCHAR(50), servicetype VARCHAR(255), description TEXT, status VARCHAR(50) DEFAULT 'pending', createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP, payment_status VARCHAR(50) DEFAULT 'pending', is_service_enabled BOOLEAN DEFAULT FALSE, initial_diagnosis TEXT, treatment_plan TEXT, priority VARCHAR(50) DEFAULT 'normal', supervisor_notes TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, requestid INTEGER REFERENCES requests(id), senderid INTEGER, sendername VARCHAR(255), senderrole VARCHAR(50), messagetext TEXT, is_private BOOLEAN DEFAULT FALSE, createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, title VARCHAR(255), summary TEXT, content TEXT, icon VARCHAR(100), createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, userid INTEGER REFERENCES users(id), fullname VARCHAR(255), comment TEXT, rating INTEGER DEFAULT 5, isapproved BOOLEAN DEFAULT FALSE, createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        console.log("✅ تم بناء جميع الجداول بنجاح.");
    } catch (err) { console.error("❌ خطأ التهيئة:", err); }
};

// --- Middleware ---
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

// --- المسارات (Routes) ---
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        await pool.query(`INSERT INTO users (full_name, email, password, phone) VALUES ($1, $2, $3, $4)`, [fullName, email, bcrypt.hashSync(password, 8), phone]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'خطأ في التسجيل' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password)) return res.status(400).json({ error: 'خطأ بيانات' });
    const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role, full_name: result.rows[0].full_name }, JWT_SECRET);
    res.json({ success: true, token, user: { full_name: result.rows[0].full_name, role: result.rows[0].role } });
});

// إدارة الطلبات
app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT * FROM requests ORDER BY createdat DESC`);
    res.json(result.rows);
});

app.get('/api/dashboard/request/:id', authenticateToken, async (req, res) => {
    const result = await pool.query(`SELECT * FROM requests WHERE id = $1`, [req.params.id]);
    res.json(result.rows[0]);
});

app.put('/api/admin/requests/:id/financial-status', authenticateToken, requireAdmin, async (req, res) => {
    const { status } = req.body;
    const isEnabled = (status === 'paid');
    await pool.query(`UPDATE requests SET payment_status = $1, is_service_enabled = $2 WHERE id = $3`, [status, isEnabled, req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/diagnose', authenticateToken, requireAdmin, async (req, res) => {
    const { initial_diagnosis, treatment_plan } = req.body;
    await pool.query(`UPDATE requests SET initial_diagnosis = $1, treatment_plan = $2, status = 'completed' WHERE id = $3`, [initial_diagnosis, treatment_plan, req.params.id]);
    res.json({ success: true });
});

app.post('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const { messageText, isPrivate } = req.body;
    await pool.query(`INSERT INTO messages (requestid, senderid, sendername, senderrole, messagetext, is_private) VALUES ($1, $2, $3, $4, $5, $6)`, 
    [req.params.id, req.user.id, req.user.full_name, req.user.role, messageText, isPrivate || false]);
    res.json({ success: true });
});

// المقالات
app.post('/api/admin/articles', authenticateToken, requireAdmin, async (req, res) => {
    const { title, summary, content } = req.body;
    await pool.query(`INSERT INTO articles (title, summary, content) VALUES ($1, $2, $3)`, [title, summary, content]);
    res.json({ success: true });
});

app.get('/api/articles', async (req, res) => {
    const result = await pool.query(`SELECT * FROM articles`);
    res.json(result.rows);
});

app.delete('/api/admin/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`DELETE FROM articles WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

const startServer = async () => {
    await pool.connect();
    await initializeDatabase();
    app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على ${PORT}`));
};
startServer();
