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
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('❌ خطأ تجمع الاتصال:', err.message));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ====================== إعداد الجداول (إذا لم تكن موجودة) ======================
const initializeDatabase = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            phone VARCHAR(50),
            role VARCHAR(50) DEFAULT 'user'
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            fullname VARCHAR(255),
            email VARCHAR(255),
            userphone VARCHAR(50),
            servicetype VARCHAR(255),
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paymentmethod VARCHAR(100),
            payment_sender_name VARCHAR(255),
            payment_transfer_number VARCHAR(100),
            payment_rejection_reason TEXT,
            initial_diagnosis TEXT,
            treatment_plan TEXT
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            requestid INTEGER REFERENCES requests(id),
            senderid INTEGER,
            sendername VARCHAR(255),
            senderrole VARCHAR(50),
            messagetext TEXT,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS articles (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            summary TEXT,
            content TEXT,
            icon VARCHAR(100),
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            userid INTEGER REFERENCES users(id),
            fullname VARCHAR(255),
            comment TEXT,
            rating INTEGER DEFAULT 5,
            isapproved BOOLEAN DEFAULT FALSE,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS ai_config (
            id SERIAL PRIMARY KEY,
            instructions TEXT
        )`);
        const aiCount = await pool.query(`SELECT COUNT(*) FROM ai_config`);
        if (parseInt(aiCount.rows[0].count) === 0) {
            await pool.query(`INSERT INTO ai_config (instructions) VALUES ($1)`, ['أنت مستشار فقهي وروحاني معتمد في مركز النور الرباني التابع للشيخ بسام.']);
        }
        console.log("✅ تم فحص الجداول.");
    } catch (err) { console.error("❌ خطأ تهيئة الجداول:", err.message); }
};
initializeDatabase();

// ====================== إنشاء المدير تلقائياً ======================
(async function initAdmin() {
    try {
        const adminEmail = 'alshameerybassam@gmail.com';
        const adminCheck = await pool.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
        if (adminCheck.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync('bassam112358112358', 8);
            await pool.query(`INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)`, ['الشيخ بسام', adminEmail, hashedPassword, 'admin']);
            console.log('✅ تم إنشاء حساب المدير.');
        }
    } catch (err) { console.error('❌ خطأ إنشاء المدير:', err.message); }
})();

// ====================== Middleware ======================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'غير مصرح' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) { return res.status(403).json({ error: 'جلسة منتهية' }); }
};
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'للإدارة فقط' });
    next();
};

// ====================== المصادقة ======================
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ error: 'جميع الحقول مطلوبة.' });
    try {
        const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (exists.rows.length > 0) return res.status(400).json({ error: 'البريد مسجل مسبقاً.' });
        await pool.query(`INSERT INTO users (full_name, email, password, phone) VALUES ($1, $2, $3, $4)`, [fullName, email, bcrypt.hashSync(password, 8), phone]);
        res.json({ success: true });
    } catch (e) { console.error('❌ تسجيل:', e.message); res.status(500).json({ error: 'حدث خطأ أثناء التسجيل.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان.' });
    try {
        const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'بيانات خاطئة.' });
        const user = result.rows[0];
        if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'بيانات خاطئة.' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
    } catch (e) { console.error('❌ دخول:', e.message); res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول.' }); }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, full_name, email, role FROM users WHERE id = $1`, [req.user.id]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'جلسة غير صالحة.' });
        res.json({ success: true, user: result.rows[0] });
    } catch (e) { res.status(500).json({ error: 'خطأ في التحقق.' }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني.' });
    const user = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (user.rows.length === 0) return res.json({ success: true, message: 'إذا كان البريد مسجلاً، سيرسل رابط.' });
    const resetToken = jwt.sign({ id: user.rows[0].id, email, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`🔗 رابط التعيين: https://bassam-spiritual-center.onrender.com/reset-password?token=${resetToken}`);
    res.json({ success: true, message: 'تم إرسال الرابط.', resetLink: `https://bassam-spiritual-center.onrender.com/reset-password?token=${resetToken}` });
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'بيانات ناقصة.' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'password_reset') return res.status(400).json({ error: 'رمز غير صالح.' });
        await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [bcrypt.hashSync(newPassword, 8), decoded.id]);
        res.json({ success: true, message: 'تم التغيير.' });
    } catch (e) { res.status(400).json({ error: 'رمز غير صالح.' }); }
});

app.get('/reset-password', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="ar"><head><meta charset="UTF-8"><title>إعادة تعيين</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Cairo';background:#F4F6F9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,0.1);max-width:440px;width:100%;padding:40px 30px;border-top:6px solid #F5B041;text-align:center}.box input{width:100%;padding:12px;border:2px solid #E2E8F0;border-radius:12px;margin-bottom:15px;font-family:'Cairo'}.box button{width:100%;padding:14px;background:linear-gradient(135deg,#F5B041,#E67E22);color:#0A1628;border:none;border-radius:12px;font-weight:800;cursor:pointer}.msg{background:#27ae60;color:#fff;padding:15px;border-radius:12px;margin-bottom:15px;display:none}</style></head><body><div class="box"><h2 style="color:#0A1628">إعادة تعيين كلمة المرور</h2><div class="msg" id="msg"></div><form id="f"><input type="password" id="p" placeholder="كلمة المرور الجديدة" required minlength="6"><button type="submit">تغيير</button></form></div><script>const t=new URLSearchParams(location.search).get('token');if(!t){document.getElementById('msg').style.display='block';document.getElementById('msg').style.background='#e74c3c';document.getElementById('msg').textContent='رابط غير صالح.';document.getElementById('f').style.display='none'}document.getElementById('f').addEventListener('submit',async e=>{e.preventDefault();const r=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t,newPassword:document.getElementById('p').value})});const d=await r.json();const m=document.getElementById('msg');m.style.display='block';if(d.success){m.style.background='#27ae60';m.textContent='✅ تم التغيير.';setTimeout(()=>location.href='/login.html',2000)}else{m.style.background='#e74c3c';m.textContent='❌ '+(d.error||'خطأ')}})</script></body></html>`);
});

// ====================== المساعد الذكي المطور ======================
const aiKnowledge = [
    { keywords: ['عين', 'حسد', 'نظرة', 'حاسد', 'عاين', 'معيون'], replies: [
        '🕌 **العين حق** كما قال النبي ﷺ. أنصحك بقراءة **الفاتحة والمعوذتين وآية الكرسي** صباحاً ومساءً، مع الرقية الشرعية على ماء وشربه يومياً. 📿',
        '🌿 للوقاية من العين: حافظ على أذكار الصباح والمساء، وقل دائماً "ما شاء الله لا قوة إلا بالله" عند رؤية ما يعجبك. يمكنك طلب جلسة علاجية من الشيخ.',
        '💧 اغتسل بماء مقروء عليه آيات الرقية، واجعل في بيتك جوًا روحانيًا بقراءة سورة البقرة باستمرار. نحن هنا لمساعدتك في أي وقت.'
    ]},
    { keywords: ['سحر', 'مسحور', 'ساحر', 'عمل'], replies: [
        '📖 **السحر مذكور في القرآن** وعلاجه يكون بالرقية الشرعية وتتبع الأثر. أنصحك بقراءة **آيات إبطال السحر** (الأعراف 117-122، يونس 79-82، طه 69-70) على ماء وزيت زيتون.',
        '🛡️ لا تخف؛ السحر لا يضر إلا بإذن الله. استعن بالله، وحافظ على الصلاة في وقتها، واقرأ سورة البقرة ثلاث ليالٍ متتالية. يمكنك حجز استشارة خاصة مع الشيخ.',
        '🌙 تذكر أن الله هو الحافظ. اشرب ماء زمزم المقروء عليه، وتناول سبع تمرات كل صباح، وداوم على الاستغفار. فريقنا مستعد لدعمك.'
    ]},
    { keywords: ['مس', 'شيطان', 'جني', 'صرع', 'تلبس', 'وسواس'], replies: [
        '🤲 **المس** يُعالج بالرقية الشرعية الثابتة عن النبي ﷺ. اقرأ آية الكرسي والمعوذات، واجعل في أذنيك أذكار النوم والاستيقاظ. لا تتردد في طلب المساعدة.',
        '🕋 استمع إلى الرقية الشرعية يومياً بصوت مسموع، وابتعد عن المعاصي والغناء، واجعل القرآن رفيقك. بإذن الله ستشعر بالتحسن.',
        '📿 لا تيأس! كثير من الحالات تم علاجها بالكامل عبر جلساتنا. سجل طلباً وسنوجهك خطوة بخطوة.'
    ]},
    { keywords: ['ضيق', 'حزن', 'اكتئاب', 'هم', 'غم', 'قلق', 'خوف'], replies: [
        '💙 **الضيق** يزول بذكر الله. ﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾. أنصحك بالإكثار من الصلاة على النبي ﷺ، فهي تفرج الهموم.',
        '🌅 جرب أن تصلي ركعتين بخشوع في جوف الليل، وادعُ الله بصدق. نحن هنا لنستمع إليك ونوجهك للعلاج الروحي المناسب.',
        '🍃 لا تحمل هم الدنيا وحدك. تحدث مع الشيخ في جلسة صوتية خاصة، فالكلمة الطيبة دواء. نحن نضمن لك السرية التامة.'
    ]},
    { keywords: ['رؤيا', 'حلم', 'منام', 'تفسير'], replies: [
        '🌙 الرؤى الصالحة من الله. أخبرني بتفاصيل رؤياك وسأعطيك توجيهاً عاماً، لكن التفسير الدقيق يحتاج لجلسة خاصة مع الشيخ بسام.',
        '📖 قال النبي ﷺ: "الرؤيا الصالحة جزء من ستة وأربعين جزءاً من النبوة". احمد الله إن رأيت خيراً، واستعذ بالله من شر إن كان غير ذلك.',
        '🕌 بإمكانك تسجيل طلب تفسير رؤيا وسيتواصل معك الشيخ مباشرة. نحن هنا لخدمتك.'
    ]},
    { keywords: ['زواج', 'عانس', 'عنوسة', 'تأخر زواج', 'زوج', 'زوجة'], replies: [
        '💍 الزواج رزق من الله. داوم على الاستغفار وصلاة الحاجة، وتصدق بنية تيسير الزواج. بإذن الله سترى الفرج قريباً.',
        '🌸 لا تستعجل؛ كل شيء بقدر. نقدم استشارات أسرية متخصصة لحل مشاكل الزواج والعزوبية. تواصل معنا.',
        '🕌 أرسل طلبك وسنتواصل معك بخصوص رقية خاصة لتيسير الزواج، فهي مجربة ونافعة بإذن الله.'
    ]},
    { keywords: ['مرض', 'وجع', 'ألم', 'سرطان', 'سقم', 'عله'], replies: [
        '🩺 **الشفاء بيد الله**. مع العلاج الطبي، لا تنس الرقية الشرعية. اقرأ على نفسك الفاتحة سبع مرات، وتصدق بنية الشفاء.',
        '💊 نحن نكمل العلاج الطبي بالعلاج الروحي. تواصل مع الشيخ ليصف لك برنامجاً علاجياً متكاملاً.',
        '🌿 قال الله: ﴿وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ﴾. ثق بالله، واستعن بالرقية، ونحن معك خطوة بخطوة.'
    ]}
];
const fallbackReplies = [
    '🌙 السلام عليكم ورحمة الله. أنا مستشارك الروحي. هل يمكنك أن تخبرني أكثر عن حالتك؟',
    '🕌 أهلاً بك في مركز النور الرباني. صف لي ما تشعر به بالضبط، وسأوجهك إلى الخدمة المناسبة.',
    '📿 أنا هنا لخدمتك. تحدث معي بكل راحة، فكل ما تقوله في أمان تام. هل تعاني من أعراض معينة؟',
    '💡 يمكنني مساعدتك في أمور العين والحسد والسحر والمس والضيق. فقط ابدأ بكتابة ما تشعر به.'
];

app.post('/api/ai-chat', async (req, res) => {
    const msg = req.body.message?.trim() || '';
    if (!msg) return res.json({ success: true, reply: 'تفضل، أنا بانتظار استفسارك.' });
    const lowerMsg = msg.toLowerCase();
    for (let item of aiKnowledge) {
        for (let kw of item.keywords) {
            if (lowerMsg.includes(kw)) {
                const reply = item.replies[Math.floor(Math.random() * item.replies.length)];
                return res.json({ success: true, reply });
            }
        }
    }
    if (lowerMsg.length < 15) return res.json({ success: true, reply: 'أرجو أن تعطيني تفاصيل أكثر عن حالتك حتى أستطيع مساعدتك بدقة.' });
    const reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    res.json({ success: true, reply });
});

// ====================== لوحة المستفيد ======================
app.get('/api/dashboard/me', authenticateToken, async (req, res) => {
    try {
        const requests = await pool.query(`SELECT id, user_id, fullname AS "fullName", email, userphone AS "userPhone", servicetype AS "serviceType", description, status, createdat AS "createdAt", paymentmethod AS "paymentMethod", payment_sender_name, payment_transfer_number, payment_rejection_reason, initial_diagnosis, treatment_plan FROM requests WHERE user_id = $1 ORDER BY createdat DESC`, [req.user.id]);
        const user = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
        res.json({ success: true, user: user.rows[0], requests: requests.rows });
    } catch (e) { console.error('❌ لوحة المستفيد:', e.message); res.status(500).json({ error: 'حدث خطأ في تحميل البيانات.' }); }
});

app.post('/api/dashboard/request', authenticateToken, async (req, res) => {
    try {
        const { serviceType, description } = req.body;
        if (!description || description.trim().length < 10) return res.status(400).json({ success: false, error: 'وصف قصير جداً.' });
        const userResult = await pool.query(`SELECT full_name, email, phone FROM users WHERE id = $1`, [req.user.id]);
        if (userResult.rows.length === 0) return res.status(404).json({ success: false, error: 'المستخدم غير موجود.' });
        const user = userResult.rows[0];
        const insertResult = await pool.query(
            `INSERT INTO requests (user_id, fullname, email, userphone, servicetype, description)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [req.user.id, user.full_name, user.email, user.phone, serviceType, description]
        );
        res.json({ success: true, requestId: insertResult.rows[0].id, message: 'تم استلام طلبك بنجاح.' });
    } catch (error) { console.error('❌ تقديم طلب:', error.message); res.status(500).json({ success: false, error: 'حدث خطأ داخلي.' }); }
});

app.get('/api/dashboard/request/:id', authenticateToken, async (req, res) => {
    const result = await pool.query(`SELECT id, user_id, fullname AS "fullName", email, userphone AS "userPhone", servicetype AS "serviceType", description, status, createdat AS "createdAt", paymentmethod AS "paymentMethod", payment_sender_name, payment_transfer_number, payment_rejection_reason, initial_diagnosis, treatment_plan FROM requests WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'غير موجود.' });
    res.json(result.rows[0]);
});

app.put('/api/dashboard/request/:id/submit-payment', authenticateToken, async (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    await pool.query(`UPDATE requests SET paymentmethod=$1, payment_sender_name=$2, payment_transfer_number=$3, status='payment_submitted' WHERE id=$4`, [paymentMethod, paymentSenderName, paymentTransferNumber, req.params.id]);
    res.json({ success: true });
});

app.post('/api/dashboard/reviews', authenticateToken, async (req, res) => {
    const { comment, rating } = req.body;
    const user = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [req.user.id]);
    await pool.query(`INSERT INTO reviews (userid, fullname, comment, rating) VALUES ($1, $2, $3, $4)`, [req.user.id, user.rows[0].full_name, comment, rating]);
    res.json({ success: true });
});

// ====================== لوحة المدير ======================
app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT id, user_id, fullname AS "fullName", email, userphone AS "userPhone", servicetype AS "serviceType", description, status, createdat AS "createdAt", paymentmethod AS "paymentMethod", payment_sender_name, payment_transfer_number, payment_rejection_reason, initial_diagnosis, treatment_plan FROM requests ORDER BY createdat DESC`);
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
    try {
        const { initial_diagnosis, treatment_plan } = req.body;
        const requestId = req.params.id;
        await pool.query(`UPDATE requests SET initial_diagnosis = $1, treatment_plan = $2, status = 'diagnosed' WHERE id = $3`, [initial_diagnosis, treatment_plan, requestId]);
        const reqData = await pool.query(`SELECT fullname FROM requests WHERE id = $1`, [requestId]);
        if (reqData.rows.length > 0) {
            const messageText = `📋 **تم تشخيص حالتك**\n\n🩺 التشخيص:\n${initial_diagnosis || 'لا يوجد'}\n\n📝 الخطة العلاجية:\n${treatment_plan || 'لا توجد'}`;
            await pool.query(`INSERT INTO messages (requestid, senderid, sendername, senderrole, messagetext) VALUES ($1, $2, $3, $4, $5)`, [requestId, req.user.id, req.user.full_name, 'admin', messageText]);
        }
        res.json({ success: true, message: 'تم التشخيص.' });
    } catch (error) { console.error('❌ تشخيص:', error.message); res.status(500).json({ success: false, error: 'خطأ في التشخيص.' }); }
});

// ====================== المراسلات ======================
app.get('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const result = await pool.query(`SELECT id, requestid AS "requestId", senderid AS "senderId", sendername AS "senderName", senderrole AS "senderRole", messagetext AS "messageText", createdat AS "createdAt" FROM messages WHERE requestid = $1 ORDER BY createdat ASC`, [req.params.id]);
    res.json({ success: true, messages: result.rows });
});

app.post('/api/requests/:id/messages', authenticateToken, async (req, res) => {
    const { messageText } = req.body;
    await pool.query(`INSERT INTO messages (requestid, senderid, sendername, senderrole, messagetext) VALUES ($1, $2, $3, $4, $5)`, [req.params.id, req.user.id, req.user.full_name, req.user.role, messageText]);
    res.json({ success: true });
});

// ====================== المقالات ======================
app.get('/api/articles', async (req, res) => {
    const result = await pool.query(`SELECT id, title, summary, content, icon, createdat AS "createdAt" FROM articles ORDER BY createdat DESC`);
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

// ====================== التقييمات ======================
app.get('/api/reviews', async (req, res) => {
    const result = await pool.query(`SELECT id, userid AS "userId", fullname AS "fullName", comment, rating, isapproved AS "isApproved", createdat AS "createdAt" FROM reviews WHERE isapproved = TRUE ORDER BY createdat DESC`);
    res.json(result.rows);
});

app.get('/api/admin/reviews', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT id, userid AS "userId", fullname AS "fullName", comment, rating, isapproved AS "isApproved", createdat AS "createdAt" FROM reviews ORDER BY createdat DESC`);
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

// ====================== AI config ======================
app.get('/api/admin/ai-instructions', authenticateToken, requireAdmin, async (req, res) => {
    const result = await pool.query(`SELECT instructions FROM ai_config ORDER BY id DESC LIMIT 1`);
    res.json({ success: true, instructions: result.rows[0]?.instructions || '' });
});

app.put('/api/admin/ai-instructions', authenticateToken, requireAdmin, async (req, res) => {
    await pool.query(`UPDATE ai_config SET instructions = $1`, [req.body.instructions]);
    res.json({ success: true });
});

// ====================== المهندس ======================
let engineer;
try { engineer = require('./engineer'); } catch (err) {
    engineer = { getAgent: () => ({ name: 'غير متوفر', execute: () => Promise.resolve('⚠️ وحدة المهندس غير متوفرة.') }) };
}
const db = {
    updatePassword: async (email, newPassword) => {
        await pool.query(`UPDATE users SET password = $1 WHERE email = $2`, [bcrypt.hashSync(newPassword, 8), email]);
    },
    getDailyRequests: async (date) => {
        const r = await pool.query(`SELECT fullname AS "fullName", servicetype AS "serviceType", status FROM requests WHERE DATE(createdat) = $1`, [date]);
        return r.rows;
    },
    getWeeklyRequests: async () => {
        const r = await pool.query(`SELECT fullname AS "fullName", servicetype AS "serviceType", status FROM requests WHERE createdat >= CURRENT_DATE - INTERVAL '7 days'`);
        return r.rows;
    },
    getQuickStats: async () => {
        const t = await pool.query(`SELECT COUNT(*) FROM requests`);
        const p = await pool.query(`SELECT COUNT(*) FROM requests WHERE status='pending'`);
        const pr = await pool.query(`SELECT COUNT(*) FROM requests WHERE status IN ('processing','accepted_waiting_payment','payment_submitted')`);
        const c = await pool.query(`SELECT COUNT(*) FROM requests WHERE status IN ('diagnosed','completed')`);
        const rj = await pool.query(`SELECT COUNT(*) FROM requests WHERE status='rejected'`);
        return { total: +t.rows[0].count, pending: +p.rows[0].count, processing: +pr.rows[0].count, completed: +c.rows[0].count, rejected: +rj.rows[0].count };
    },
    deleteRejectedRequests: async () => { const r = await pool.query(`DELETE FROM requests WHERE status='rejected'`); return r.rowCount; },
    createBackup: async () => {
        const dir = path.join(__dirname, 'backups'); if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const file = path.join(dir, `backup_${Date.now()}.json`);
        const u = await pool.query(`SELECT * FROM users`); const rq = await pool.query(`SELECT * FROM requests`);
        fs.writeFileSync(file, JSON.stringify({ users: u.rows, requests: rq.rows })); return file;
    }
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

// ====================== توجيه الصفحات ======================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'المسار غير موجود.' });
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ====================== تشغيل الخادم ======================
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على ${PORT}`)).on('error', (err) => {
    console.error('❌ فشل تشغيل الخادم:', err.message);
    process.exit(1);
});
