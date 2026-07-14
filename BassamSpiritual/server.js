const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'BASSAM_SUPER_SECRET_KEY_2026';
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialDB = { users: [], requests: [], messages: [], articles: [], reviews: [], aiConfig: { instructions: "أنت مستشار فقهي وروحاني معتمد..." } };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 4), 'utf8');
        return initialDB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4), 'utf8'); }

// إنشاء حساب المدير تلقائياً
(function initAdmin() {
    const db = readDB();
    if (!db.users.find(u => u.email === 'alshameerybassam@gmail.com')) {
        db.users.push({ id: Date.now(), full_name: "الشيخ بسام", email: "alshameerybassam@gmail.com", phone: "777941366", password: bcrypt.hashSync('bassam112358112358', 8), role: "admin" });
        writeDB(db);
    }
})();

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول.' });
    jwt.verify(token, JWT_SECRET, (err, user) => { if (err) return res.status(403).json({ error: 'جلسة منتهية.' }); req.user = user; next(); });
}

function requireAdmin(req, res, next) { if (req.user.role !== 'admin') return res.status(403).json({ error: 'للإدارة فقط.' }); next(); }

// ========== المصادقة ==========
app.post('/api/auth/register', (req, res) => {
    const { fullName, email, password, phone } = req.body;
    const db = readDB();
    if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'البريد مسجل مسبقاً.' });
    const hashed = bcrypt.hashSync(password, 8);
    const newUser = { id: Date.now(), full_name: fullName, email, password: hashed, phone, role: 'user' };
    db.users.push(newUser); writeDB(db);
    res.json({ success: true });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'بيانات خاطئة.' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => res.json({ success: true, user: req.user }));

// ========== لوحة المستفيد ==========
app.get('/api/dashboard/me', authenticateToken, (req, res) => {
    const db = readDB();
    const myRequests = db.requests.filter(r => r.userId === req.user.id);
    const user = db.users.find(u => u.id === req.user.id);
    res.json({ success: true, user, requests: myRequests });
});

app.post('/api/dashboard/request', authenticateToken, (req, res) => {
    const { serviceType, description } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    const newReq = { id: Date.now(), userId: req.user.id, fullName: user.full_name, email: user.email, serviceType, description, status: 'pending', createdAt: new Date().toISOString() };
    db.requests.push(newReq); writeDB(db);
    res.json({ success: true });
});

app.get('/api/dashboard/request/:id', authenticateToken, (req, res) => {
    const db = readDB();
    const r = db.requests.find(r => r.id === parseInt(req.params.id) && (r.userId === req.user.id || req.user.role === 'admin'));
    if(!r) return res.status(404).json({ error: 'غير موجود.' });
    res.json(r);
});

app.put('/api/dashboard/request/:id/submit-payment', authenticateToken, (req, res) => {
    const db = readDB();
    const idx = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    if(idx===-1) return res.status(404).json({ error: 'غير موجود.' });
    db.requests[idx].status = 'payment_submitted';
    db.requests[idx].paymentMethod = req.body.paymentMethod;
    db.requests[idx].payment_sender_name = req.body.paymentSenderName;
    db.requests[idx].payment_transfer_number = req.body.paymentTransferNumber;
    writeDB(db); res.json({ success: true });
});

app.post('/api/dashboard/reviews', authenticateToken, (req, res) => {
    const db = readDB();
    db.reviews.push({ id: Date.now(), userId: req.user.id, fullName: req.user.full_name, comment: req.body.comment, rating: req.body.rating, isApproved: false });
    writeDB(db); res.json({ success: true });
});

// ========== لوحة المدير ==========
app.get('/api/admin/requests', authenticateToken, requireAdmin, (req, res) => { res.json(readDB().requests); });
app.put('/api/admin/requests/:id/accept-initial', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); const idx = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    db.requests[idx].status = 'accepted_waiting_payment'; writeDB(db); res.json({ success: true });
});
app.put('/api/admin/requests/:id/reject-initial', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); const idx = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    db.requests[idx].status = 'rejected'; writeDB(db); res.json({ success: true });
});
app.put('/api/admin/requests/:id/approve-payment', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); const idx = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    db.requests[idx].status = 'processing'; writeDB(db); res.json({ success: true });
});
app.put('/api/admin/requests/:id/reject-payment', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); const idx = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    db.requests[idx].status = 'payment_rejected'; writeDB(db); res.json({ success: true });
});
app.put('/api/admin/requests/:id/diagnose', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); const idx = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    db.requests[idx].initial_diagnosis = req.body.initialDiagnosis;
    db.requests[idx].treatment_plan = req.body.treatmentPlan;
    db.requests[idx].status = 'diagnosed'; writeDB(db); res.json({ success: true });
});

// ========== المراسلات ==========
app.get('/api/requests/:id/messages', authenticateToken, (req, res) => {
    const db = readDB();
    const msgs = db.messages.filter(m => m.requestId === parseInt(req.params.id));
    res.json({ success: true, messages: msgs });
});
app.post('/api/requests/:id/messages', authenticateToken, (req, res) => {
    const db = readDB();
    db.messages.push({ id: Date.now(), requestId: parseInt(req.params.id), senderId: req.user.id, senderName: req.user.full_name, senderRole: req.user.role, messageText: req.body.messageText, createdAt: new Date().toISOString() });
    writeDB(db); res.json({ success: true });
});

// ========== المقالات ==========
app.get('/api/articles', (req, res) => res.json(readDB().articles));
app.post('/api/admin/articles', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB();
    db.articles.push({ id: Date.now(), title: req.body.title, summary: req.body.summary, content: req.body.content, createdAt: new Date().toISOString() });
    writeDB(db); res.json({ success: true });
});
app.put('/api/admin/articles/:id', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); const idx = db.articles.findIndex(a => a.id === parseInt(req.params.id));
    db.articles[idx].title = req.body.title; db.articles[idx].summary = req.body.summary; db.articles[idx].content = req.body.content;
    writeDB(db); res.json({ success: true });
});
app.delete('/api/admin/articles/:id', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); db.articles = db.articles.filter(a => a.id !== parseInt(req.params.id));
    writeDB(db); res.json({ success: true });
});

// ========== التقييمات ==========
app.get('/api/reviews', (req, res) => { res.json(readDB().reviews.filter(r => r.isApproved)); });
app.get('/api/admin/reviews', authenticateToken, requireAdmin, (req, res) => { res.json({ success: true, reviews: readDB().reviews }); });
app.put('/api/admin/reviews/:id', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); const idx = db.reviews.findIndex(r => r.id === parseInt(req.params.id));
    db.reviews[idx].isApproved = req.body.isApproved; writeDB(db); res.json({ success: true });
});
app.delete('/api/admin/reviews/:id', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); db.reviews = db.reviews.filter(r => r.id !== parseInt(req.params.id));
    writeDB(db); res.json({ success: true });
});

// ========== الذكاء الاصطناعي ==========
app.get('/api/admin/ai-instructions', authenticateToken, requireAdmin, (req, res) => { res.json({ success: true, instructions: readDB().aiConfig.instructions }); });
app.put('/api/admin/ai-instructions', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB(); db.aiConfig.instructions = req.body.instructions; writeDB(db); res.json({ success: true });
});
app.post('/api/ai-chat', (req, res) => {
    const msg = req.body.message.toLowerCase();
    let reply = '';
    if(msg.includes('عين')||msg.includes('حسد')) reply = 'أنصحك بقراءة الفاتحة 7 مرات على ماء وشربه.';
    else if(msg.includes('سحر')) reply = 'عليك بالرقية الشرعية.';
    else reply = 'يرجى تقديم طلب للتشخيص الدقيق.';
    res.json({ success: true, reply });
});

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على ${PORT}`));
