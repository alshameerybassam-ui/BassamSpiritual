const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'BASSAM_SPIRITUAL_SECRET_KEY_2026';

// الاتصال بقاعدة البيانات
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- تهيئة الجداول الشاملة (بأسمائك المبسطة + أعمدة المدفوعات) ---
const initializeDatabase = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, full_name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), phone VARCHAR(50), role VARCHAR(50) DEFAULT 'user')`);
        await pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), fullname VARCHAR(255), email VARCHAR(255), userphone VARCHAR(50), servicetype VARCHAR(255), description TEXT, status VARCHAR(50) DEFAULT 'pending', createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP, paymentmethod VARCHAR(100), payment_sender_name VARCHAR(255), payment_transfer_number VARCHAR(100), payment_rejection_reason TEXT, initial_diagnosis TEXT, treatment_plan TEXT)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, requestid INTEGER REFERENCES requests(id), senderid INTEGER, sendername VARCHAR(255), senderrole VARCHAR(50), messagetext TEXT, createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, title VARCHAR(255), summary TEXT, content TEXT, icon VARCHAR(100), createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, userid INTEGER REFERENCES users(id), fullname VARCHAR(255), comment TEXT, rating INTEGER DEFAULT 5, isapproved BOOLEAN DEFAULT FALSE, createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ai_config (id SERIAL PRIMARY KEY, instructions TEXT)`);
        const aiCount = await pool.query(`SELECT COUNT(*) FROM ai_config`);
        if (parseInt(aiCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO ai_config (instructions) VALUES ($1)`, ['أنت مستشار فقهي وروحاني معتمد في مركز النور الرباني التابع للشيخ بسام.']);
        }
        console.log("✅ تم بناء جميع الجداول بنجاح.");
    } catch (err) { console.error("❌ خطأ التهيئة:", err.message); }
};

// إنشاء المدير تلقائياً
(async function initAdmin() {
    try {
        const adminEmail = 'alshameerybassam@gmail.com';
        const adminCheck = await pool.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
        if (adminCheck.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync('bassam112358112358', 8);
            await pool.query(`INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)`, ['الشيخ بسام', adminEmail, hashedPassword, 'admin']);
            console.log("💎 تم إنشاء حساب الإدارة التلقائي!");
        }
    } catch (err) { console.error("❌ خطأ في إنشاء المدير:", err.message); }
})();

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

// --- المصادقة ---
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
    try {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password))
            return res.status(400).json({ error: 'بيانات خاطئة.' });
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
    } catch (e) { res.status(500).json({ error: 'خطأ في تسجيل الدخول' }); }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, full_name, email, role FROM users WHERE id = $1`, [req.user.id]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'جلسة غير صالحة.' });
        res.json({ success: true, user: result.rows[0] });
    } catch (e) { res.status(500).json({ error: 'خطأ في التحقق.' }); }
});

// --- لوحة المستفيد (تمت إضافتها) ---
app.get('/api/dashboard/me', authenticateToken, async (req, res) => {
    try {
        const requests = await pool.query(`SELECT * FROM requests WHERE user_id = $1 ORDER BY createdat DESC`, [req.user.id]);
        const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
        res.json({ success: true, user: user.rows[0], requests: requests.rows });
    } catch (err) { res.status(500).json({ error: 'خطأ في تحميل البيانات.' }); }
});

app.post('/api/dashboard/request', authenticateToken, async (req, res) => {
    const { serviceType, description } = req.body;
    if (!description || description.trim().length < 10) return res.status(400).json({ error: 'الرجاء كتابة وصف دقيق.' });
    try {
        const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
        await pool.query(`INSERT INTO requests (user_id, fullname, email, userphone, servicetype, description) VALUES ($1, $2, $3, $4, $5, $6)`, [req.user.id, user.rows[0].full_name, user.rows[0].email, user.rows[0].phone, serviceType, description]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ في تقديم الطلب.' }); }
});

app.put('/api/dashboard/request/:id/submit-payment', authenticateToken, async (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    try {
        await pool.query(`UPDATE requests SET paymentmethod=$1, payment_sender_name=$2, payment_transfer_number=$3, status='payment_submitted' WHERE id=$4`, [paymentMethod, paymentSenderName, paymentTransferNumber, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ في حفظ الدفع.' }); }
});

// --- لوحة المدير ---
app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT * FROM requests ORDER BY createdat DESC`);
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

// --- المراسلات ---
app.get('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const result = await pool.query(`SELECT * FROM messages WHERE requestid = $1 ORDER BY createdat ASC`, [req.params.id]);
    res.json({ success: true, messages: result.rows });
});

app.post('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const { messageText } = req.body;
    await pool.query(`INSERT INTO messages (requestid, senderid, sendername, senderrole, messagetext) VALUES ($1, $2, $3, $4, $5)`, [req.params.id, req.user.id, req.user.full_name, req.user.role, messageText]);
    res.json({ success: true });
});

// --- المقالات ---
app.get('/api/articles', async (req, res) => {
    const result = await pool.query(`SELECT * FROM articles ORDER BY createdat DESC`);
    res.json(result.rows);
});

app.post('/api/admin/articles', authenticateToken, requireAdmin, async (req, res) => {
    const { title, summary, content } = req.body;
    await pool.query(`INSERT INTO articles (title, summary, content) VALUES ($1, $2, $3)`, [title, summary, content]);
    res.json({ success: true });
});

app.put('/api/admin/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { title, summary, content } = req.body;
    await pool.query(`UPDATE articles SET title=$1, summary=$2, content=$3 WHERE id=$4`, [title, summary, content, req.params.id]);
    res.json({ success: true });
});

app.delete('/api/admin/articles/:id', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`DELETE FROM articles WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
});

// --- التقييمات (تمت إضافتها) ---
app.get('/api/reviews', async (req, res) => {
    const result = await pool.query(`SELECT * FROM reviews WHERE isapproved = TRUE ORDER BY createdat DESC`);
    res.json(result.rows);
});

app.get('/api/admin/reviews', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT * FROM reviews ORDER BY createdat DESC`);
    res.json({ success: true, reviews: result.rows });
});

app.put('/api/admin/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`UPDATE reviews SET isapproved = $1 WHERE id = $2`, [req.body.isApproved, req.params.id]);
    res.json({ success: true });
});

app.delete('/api/admin/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`DELETE FROM reviews WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
});

// --- الذكاء الاصطناعي ---
app.get('/api/admin/ai-instructions', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT instructions FROM ai_config ORDER BY id DESC LIMIT 1`);
    res.json({ success: true, instructions: result.rows[0]?.instructions || '' });
});

app.put('/api/admin/ai-instructions', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`UPDATE ai_config SET instructions = $1`, [req.body.instructions]);
    res.json({ success: true });
});

// --- المهندس الداخلي (تمت إضافته) ---
const engineer = require('./engineer');
const db = {
    updatePassword: async (email, newPassword) => { const hashed = bcrypt.hashSync(newPassword, 8); await pool.query(`UPDATE users SET password = $1 WHERE email = $2`, [hashed, email]); },
    getDailyRequests: async (todayDate) => { const result = await pool.query(`SELECT fullname, servicetype, status FROM requests WHERE DATE(createdat) = $1 ORDER BY createdat DESC`, [todayDate]); return result.rows; },
    getWeeklyRequests: async () => { const result = await pool.query(`SELECT fullname, servicetype, status FROM requests WHERE createdat >= CURRENT_DATE - INTERVAL '7 days' ORDER BY createdat DESC`); return result.rows; },
    getQuickStats: async () => {
        const total = await pool.query(`SELECT COUNT(*) FROM requests`);
        const pending = await pool.query(`SELECT COUNT(*) FROM requests WHERE status = 'pending'`);
        const processing = await pool.query(`SELECT COUNT(*) FROM requests WHERE status = 'processing' OR status = 'accepted_waiting_payment' OR status = 'payment_submitted'`);
        const completed = await pool.query(`SELECT COUNT(*) FROM requests WHERE status = 'diagnosed' OR status = 'completed'`);
        const rejected = await pool.query(`SELECT COUNT(*) FROM requests WHERE status = 'rejected'`);
        return { total: parseInt(total.rows[0].count), pending: parseInt(pending.rows[0].count), processing: parseInt(processing.rows[0].count), completed: parseInt(completed.rows[0].count), rejected: parseInt(rejected.rows[0].count) };
    },
    deleteRejectedRequests: async () => { const result = await pool.query(`DELETE FROM requests WHERE status = 'rejected'`); return result.rowCount; },
    createBackup: async () => { const fs = require('fs'); const backupDir = path.join(__dirname, 'backups'); if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir); const backupFile = path.join(backupDir, `backup_${Date.now()}.json`); const users = await pool.query(`SELECT * FROM users`); const requests = await pool.query(`SELECT * FROM requests`); const backup = { users: users.rows, requests: requests.rows, timestamp: new Date().toISOString() }; fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2)); return backupFile; }
};

app.post('/api/admin/engineer-command', authenticateToken, requireAdmin, async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'يرجى إرسال أمر.' });
    try {
        const agent = engineer.getAgent(command);
        const reply = await agent.execute(command, db);
        res.json({ success: true, reply, agent: agent.name });
    } catch (e) { res.status(500).json({ error: 'فشل تنفيذ الأمر: ' + e.message }); }
});

// --- استعادة كلمة المرور (تمت إضافتها) ---
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني.' });
    try {
        const user = await pool.query(`SELECT id, full_name FROM users WHERE email = $1`, [email]);
        if (user.rows.length === 0) return res.json({ success: true, message: 'إذا كان البريد مسجلاً، فسيتم إرسال رابط إعادة التعيين.' });
        const resetToken = jwt.sign({ id: user.rows[0].id, email: email, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `https://bassam-spiritual-center.onrender.com/reset-password?token=${resetToken}`;
        console.log(`🔗 رابط إعادة التعيين لـ ${email}: ${resetLink}`);
        res.json({ success: true, message: 'تم إرسال رابط إعادة التعيين.', resetLink: resetLink });
    } catch (e) { res.status(500).json({ error: 'خطأ في معالجة الطلب.' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'يرجى إدخال جميع البيانات.' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'password_reset') return res.status(400).json({ error: 'رمز غير صالح.' });
        const hashed = bcrypt.hashSync(newPassword, 8);
        await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, decoded.id]);
        res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح.' });
    } catch (e) { res.status(400).json({ error: 'رمز غير صالح.' }); }
});

// --- صفحة إعادة تعيين كلمة المرور ---
app.get('/reset-password', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>إعادة تعيين كلمة المرور | مركز النور الرباني</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><style>body{font-family:'Cairo',sans-serif;background:#F4F6F9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;margin:0}.reset-box{background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(10,22,40,0.15);max-width:440px;width:100%;padding:40px 30px;border-top:6px solid #F5B041;text-align:center}.reset-box input{width:100%;padding:12px;border:2px solid #E2E8F0;border-radius:12px;font-family:'Cairo',sans-serif;font-size:1rem;margin-bottom:15px}.reset-box button{width:100%;padding:14px;background:linear-gradient(135deg,#F5B041,#E67E22);color:#0A1628;border:none;border-radius:12px;font-weight:800;font-size:1.1rem;cursor:pointer}.notification{background:#27ae60;color:#fff;padding:15px;border-radius:12px;margin-bottom:15px;display:none}</style></head><body><div class="reset-box"><h2 style="color:#0A1628;">إعادة تعيين كلمة المرور</h2><div class="notification" id="msg"></div><form id="resetForm"><input type="password" id="newPassword" placeholder="كلمة المرور الجديدة" required minlength="6"><button type="submit">تغيير كلمة المرور</button></form></div><script>const urlParams=new URLSearchParams(window.location.search);const token=urlParams.get('token');if(!token){document.getElementById('msg').style.display='block';document.getElementById('msg').style.background='#e74c3c';document.getElementById('msg').textContent='رابط غير صالح.';document.getElementById('resetForm').style.display='none';}document.getElementById('resetForm').addEventListener('submit',async(e)=>{e.preventDefault();const newPassword=document.getElementById('newPassword').value;try{const res=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,newPassword})});const data=await res.json();const msg=document.getElementById('msg');msg.style.display='block';if(data.success){msg.style.background='#27ae60';msg.textContent='✅ تم تغيير كلمة المرور بنجاح. جاري التوجيه...';setTimeout(()=>{window.location.href='/login.html';},2000);}else{msg.style.background='#e74c3c';msg.textContent='❌ '+(data.error||'خطأ');}}catch(err){alert('خطأ في الاتصال.');}});</script></body></html>`);
});

// --- توجيه الصفحات ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('*', (req, res) => { if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'المسار غير موجود.' }); res.sendFile(path.join(__dirname, 'public/index.html')); });

// --- إطلاق الخادم ---
const startServer = async () => {
    await pool.connect();
    await initializeDatabase();
    app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على ${PORT}`));
};
startServer();
