const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// ==============================================
// استيراد مكتبة SQLite3 (قاعدة بيانات احترافية في ملف واحد)
// ==============================================
const sqlite3 = require('sqlite3').verbose();
const dbFile = path.join(__dirname, 'database.sqlite');

// فتح قاعدة البيانات (سيتم إنشاؤها تلقائياً إن لم تكن موجودة)
const db = new sqlite3.Database(dbFile);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'BASSAM_SPIRITUAL_SECRET_KEY_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================
// بناء الجداول تلقائياً عند التشغيل
// ==============================================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, phone TEXT, role TEXT DEFAULT 'user')`);
    db.run(`CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, fullName TEXT, email TEXT, userPhone TEXT, serviceType TEXT, description TEXT, status TEXT DEFAULT 'pending', createdAt TEXT, paymentMethod TEXT, payment_sender_name TEXT, payment_transfer_number TEXT, initial_diagnosis TEXT, treatment_plan TEXT, payment_rejection_reason TEXT, FOREIGN KEY (user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, requestId INTEGER, senderId INTEGER, senderName TEXT, senderRole TEXT, messageText TEXT, createdAt TEXT, FOREIGN KEY (requestId) REFERENCES requests(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, summary TEXT, content TEXT, icon TEXT DEFAULT 'bi bi-heart-fill', createdAt TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, fullName TEXT, comment TEXT, rating INTEGER, isApproved INTEGER DEFAULT 0, FOREIGN KEY (userId) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS ai_config (id INTEGER PRIMARY KEY AUTOINCREMENT, instructions TEXT)`);

    db.get(`SELECT COUNT(*) as count FROM ai_config`, (err, row) => {
        if (row.count === 0) {
            db.run(`INSERT INTO ai_config (instructions) VALUES (?)`, ["أنت مستشار فقهي وروحاني معتمد في مركز النور الرباني التابع للشيخ بسام. أجب على استفسارات الزوار بلطف وأدب جم."]);
        }
    });
});

// ==============================================
// إنشاء حساب المدير (الشيخ بسام) تلقائياً
// ==============================================
(function initAdmin() {
    db.get(`SELECT id FROM users WHERE email = ?`, ['alshameerybassam@gmail.com'], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync('bassam112358112358', 8);
            db.run(`INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`, [
                "الشيخ بسام", "alshameerybassam@gmail.com", hashedPassword, "777941366", "admin"
            ]);
            console.log("💎 تم إنشاء حساب الإدارة التلقائي للشيخ بسام بنجاح!");
        }
    });
})();

// ==============================================
// 🛡️ برمجيات التحقق والمصادقة (Middlewares)
// ==============================================
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

// ==============================================
// 📌 1. مسارات المصادقة
// ==============================================
app.post('/api/auth/register', (req, res) => {
    const { fullName, email, password, phone } = req.body;
    db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
        if (row) return res.status(400).json({ error: 'البريد مسجل مسبقاً.' });
        const hashed = bcrypt.hashSync(password, 8);
        db.run(`INSERT INTO users (full_name, email, password, phone) VALUES (?, ?, ?, ?)`, [fullName, email, hashed, phone], function() {
            res.json({ success: true });
        });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'بيانات خاطئة.' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
    });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => res.json({ success: true, user: req.user }));

// ==============================================
// 📌 2. مسارات لوحة المستفيد
// ==============================================
app.get('/api/dashboard/me', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM requests WHERE user_id = ? ORDER BY id DESC`, [req.user.id], (err, requests) => {
        db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, user) => {
            res.json({ success: true, user, requests: requests || [] });
        });
    });
});

app.post('/api/dashboard/request', authenticateToken, (req, res) => {
    const { serviceType, description } = req.body;
    db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        db.run(`INSERT INTO requests (user_id, fullName, email, userPhone, serviceType, description, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [req.user.id, user.full_name, user.email, user.phone, serviceType, description, new Date().toISOString()],
            function() { res.json({ success: true }); });
    });
});

app.get('/api/dashboard/request/:id', authenticateToken, (req, res) => {
    db.get(`SELECT * FROM requests WHERE id = ? AND (user_id = ? OR ?)`, [req.params.id, req.user.id, req.user.role === 'admin'], (err, row) => {
        if (!row) return res.status(404).json({ error: 'غير موجود.' });
        res.json(row);
    });
});

app.put('/api/dashboard/request/:id/submit-payment', authenticateToken, (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    db.run(`UPDATE requests SET paymentMethod = ?, payment_sender_name = ?, payment_transfer_number = ?, status = 'payment_submitted' WHERE id = ? AND user_id = ?`,
        [paymentMethod, paymentSenderName, paymentTransferNumber, req.params.id, req.user.id],
        function() { res.json({ success: true }); });
});

app.post('/api/dashboard/reviews', authenticateToken, (req, res) => {
    const { comment, rating } = req.body;
    db.run(`INSERT INTO reviews (userId, fullName, comment, rating) VALUES (?, ?, ?, ?)`, [req.user.id, req.user.full_name, comment, rating]);
    res.json({ success: true });
});

// ==============================================
// 📌 3. مسارات لوحة المدير
// ==============================================
app.get('/api/admin/requests', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT * FROM requests ORDER BY id DESC`, (err, rows) => res.json(rows));
});

app.put('/api/admin/requests/:id/accept-initial', authenticateToken, requireAdmin, (req, res) => {
    db.run(`UPDATE requests SET status = 'accepted_waiting_payment' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/reject-initial', authenticateToken, requireAdmin, (req, res) => {
    db.run(`UPDATE requests SET status = 'rejected', payment_rejection_reason = ? WHERE id = ?`, [req.body.reason, req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/approve-payment', authenticateToken, requireAdmin, (req, res) => {
    db.run(`UPDATE requests SET status = 'processing' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/reject-payment', authenticateToken, requireAdmin, (req, res) => {
    db.run(`UPDATE requests SET status = 'payment_rejected', payment_rejection_reason = ? WHERE id = ?`, [req.body.reason, req.params.id]);
    res.json({ success: true });
});

app.put('/api/admin/requests/:id/diagnose', authenticateToken, requireAdmin, (req, res) => {
    const { initialDiagnosis, treatmentPlan } = req.body;
    db.run(`UPDATE requests SET initial_diagnosis = ?, treatment_plan = ?, status = 'diagnosed' WHERE id = ?`, [initialDiagnosis, treatmentPlan, req.params.id]);
    res.json({ success: true });
});

// ==============================================
// 📌 4. المراسلات
// ==============================================
app.get('/api/requests/:id/messages', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM messages WHERE requestId = ? ORDER BY id ASC`, [req.params.id], (err, rows) => res.json({ success: true, messages: rows }));
});

app.post('/api/requests/:id/messages', authenticateToken, (req, res) => {
    const { messageText } = req.body;
    db.run(`INSERT INTO messages (requestId, senderId, senderName, senderRole, messageText, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.params.id, req.user.id, req.user.full_name, req.user.role, messageText, new Date().toISOString()],
        function() { res.json({ success: true }); });
});

// ==============================================
// 📌 5. المقالات والتقييمات والذكاء الاصطناعي
// ==============================================
app.get('/api/articles', (req, res) => {
    db.all(`SELECT * FROM articles ORDER BY id DESC`, (err, rows) => res.json(rows));
});

app.post('/api/admin/articles', authenticateToken, requireAdmin, (req, res) => {
    const { title, summary, content } = req.body;
    db.run(`INSERT INTO articles (title, summary, content, createdAt) VALUES (?, ?, ?, ?)`, [title, summary, content, new Date().toISOString()]);
    res.json({ success: true });
});

app.put('/api/admin/articles/:id', authenticateToken, requireAdmin, (req, res) => {
    const { title, summary, content } = req.body;
    db.run(`UPDATE articles SET title = ?, summary = ?, content = ? WHERE id = ?`, [title, summary, content, req.params.id]);
    res.json({ success: true });
});

app.delete('/api/admin/articles/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run(`DELETE FROM articles WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

app.get('/api/reviews', (req, res) => {
    db.all(`SELECT * FROM reviews WHERE isApproved = 1 ORDER BY id DESC`, (err, rows) => res.json(rows));
});

app.get('/api/admin/reviews', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT * FROM reviews ORDER BY id DESC`, (err, rows) => res.json({ success: true, reviews: rows }));
});

app.put('/api/admin/reviews/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run(`UPDATE reviews SET isApproved = ? WHERE id = ?`, [req.body.isApproved ? 1 : 0, req.params.id]);
    res.json({ success: true });
});

app.delete('/api/admin/reviews/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run(`DELETE FROM reviews WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

app.get('/api/admin/ai-instructions', authenticateToken, requireAdmin, (req, res) => {
    db.get(`SELECT * FROM ai_config ORDER BY id DESC LIMIT 1`, (err, row) => res.json({ success: true, instructions: row?.instructions || '' }));
});

app.put('/api/admin/ai-instructions', authenticateToken, requireAdmin, (req, res) => {
    db.run(`UPDATE ai_config SET instructions = ?`, [req.body.instructions]);
    res.json({ success: true });
});

app.post('/api/ai-chat', (req, res) => {
    db.get(`SELECT * FROM ai_config ORDER BY id DESC LIMIT 1`, (err, row) => {
        const msg = req.body.message.toLowerCase();
        let reply = '';
        if (msg.includes('عين') || msg.includes('حسد')) reply = 'أنصحك بقراءة الفاتحة 7 مرات على ماء وشربه.';
        else if (msg.includes('سحر')) reply = 'عليك بالرقية الشرعية.';
        else reply = 'يرجى تقديم طلب للتشخيص الدقيق.';
        res.json({ success: true, reply });
    });
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على ${PORT}`));
