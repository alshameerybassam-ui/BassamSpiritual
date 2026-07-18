const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');

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

// تهيئة الجداول بدون اقتباسات لضمان التوافق مع Postgres
const initializeDatabase = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, phone VARCHAR(50), role VARCHAR(50) DEFAULT 'user')`);
        await pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, fullname VARCHAR(255), email VARCHAR(255), userphone VARCHAR(50), servicetype VARCHAR(255), description TEXT, status VARCHAR(50) DEFAULT 'pending', createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP, paymentmethod VARCHAR(100), payment_sender_name VARCHAR(255), payment_transfer_number VARCHAR(100), initial_diagnosis TEXT, treatment_plan TEXT, payment_rejection_reason TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, requestid INTEGER REFERENCES requests(id) ON DELETE CASCADE, senderid INTEGER REFERENCES users(id) ON DELETE CASCADE, sendername VARCHAR(255), senderrole VARCHAR(50), messagetext TEXT, createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, summary TEXT, content TEXT, icon VARCHAR(100) DEFAULT 'bi bi-heart-fill', createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, userid INTEGER REFERENCES users(id) ON DELETE CASCADE, fullname VARCHAR(255), comment TEXT, rating INTEGER DEFAULT 5, isapproved BOOLEAN DEFAULT FALSE, createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ai_config (id SERIAL PRIMARY KEY, instructions TEXT)`);
        
        const aiCount = await pool.query(`SELECT COUNT(*) FROM ai_config`);
        if (parseInt(aiCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO ai_config (instructions) VALUES ($1)`, ["أنت مستشار فقهي وروحاني معتمد في مركز النور الرباني التابع للشيخ بسام."]);
        }
        console.log("✅ تم التأكد من وجود جميع الجداول.");
    } catch (err) { console.error("❌ خطأ في تهيئة قاعدة البيانات:", err.message); }
};

// تشغيل السيرفر
const startServer = async () => {
    try {
        await pool.connect();
        console.log("🐘 تم الاتصال بـ PostgreSQL");
        await initializeDatabase();
        
        // إنشاء المدير
        const adminEmail = 'alshameerybassam@gmail.com';
        const adminCheck = await pool.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
        if (adminCheck.rows.length === 0) {
            await pool.query(`INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)`, ["الشيخ بسام", adminEmail, bcrypt.hashSync('bassam112358112358', 8), "admin"]);
        }
        app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على ${PORT}`));
    } catch (err) { console.error("❌ فشل بدء السيرفر:", err); }
};

startServer();

// Middlewares
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'جلسة منتهية.' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'للإدارة فقط.' });
    next();
};

// Routes
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        await pool.query(`INSERT INTO users (full_name, email, password, phone) VALUES ($1, $2, $3, $4)`, [fullName, email, bcrypt.hashSync(password, 8), phone || '']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ في التسجيل.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password)) return res.status(400).json({ error: 'بيانات خاطئة.' });
        const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role }, JWT_SECRET);
        res.json({ success: true, token, user: { full_name: result.rows[0].full_name, role: result.rows[0].role } });
    } catch (err) { res.status(500).json({ error: 'خطأ في تسجيل الدخول.' }); }
});

app.get('/api/dashboard/me', authenticateToken, async (req, res) => {
    try {
        const requests = await pool.query(`SELECT id, servicetype, description, status, createdat FROM requests WHERE user_id = $1 ORDER BY createdat DESC`, [req.user.id]);
        res.json({ success: true, requests: requests.rows });
    } catch (err) { res.status(500).json({ error: 'خطأ.' }); }
});

app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    try { const result = await pool.query(`SELECT * FROM requests ORDER BY createdat DESC`); res.json(result.rows); } catch (e) { res.status(500).json({ error: 'خطأ.' }); }
});

app.get('/test-db', async (req, res) => { try { await pool.query(`SELECT 1`); res.json({ message: '✅ قاعدة البيانات متصلة وتعمل.' }); } catch (e) { res.status(500).json({ error: '❌ فشل الاتصال.' }); } });

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
