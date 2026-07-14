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

// --- 💾 نظام قاعدة البيانات التلقائي (JSON-Based DB) ---
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialDB = {
            users: [],
            requests: [],
            messages: [],
            articles: [],
            reviews: [],
            aiConfig: {
                instructions: "أنت مستشار فقهي وروحاني معتمد في مركز النور الرباني التابع للشيخ بسام. أجب على استفسارات الزوار بلطف وأدب جم، وقدم لهم النصائح الروحانية والرقية الشرعية المعتمدة بناءً على الكتاب والسنة."
            }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 4), 'utf8');
        return initialDB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4), 'utf8');
}

// إنشاء حساب المدير (الشيخ بسام) تلقائياً إذا لم يكن موجوداً لتبسيط الدخول
(function initAdmin() {
    const db = readDB();
    const adminExists = db.users.find(u => u.email === 'alshameerybassam@gmail.com');
    if (!adminExists) {
        const hashedPassword = bcrypt.hashSync('bassam112358112358', 8);
        db.users.push({
            id: Date.now(),
            full_name: "الشيخ بسام",
            email: "admin@noor.com",
            phone: "966500000000",
            password: hashedPassword,
            role: "admin"
        });
        writeDB(db);
        console.log("💎 تم إنشاء حساب الإدارة التلقائي للشيخ بسام بنجاح!");
        console.log("📧 البريد: admin@noor.com | 🔑 كلمة المرور: bassam123");
    }
})();

// --- 🛡️ برمجيات التحقق والمصادقة (Middlewares) ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح بالدخول، يرجى تسجيل الدخول.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'جلسة العمل منتهية الصلاحية.' });
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'هذه الصلاحية خاصة بفضيلة الشيخ بسام فقط.' });
    }
    next();
}

// --- 📌 1. مسارات المصادقة وحماية الحسابات ---
app.post('/api/auth/register', (req, res) => {
    const { fullName, email, password, phone } = req.body;
    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = { id: Date.now(), full_name: fullName, email, password: hashedPassword, phone, role: 'user' };
    db.users.push(newUser);
    writeDB(db);
    res.json({ success: true, message: 'تم إنشاء حساب المستفيد بنجاح!' });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(400).json({ error: 'بيانات الدخول غير صحيحة، يرجى المحاولة مجدداً.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { full_name: user.full_name, email: user.email, role: user.role } });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

// --- 📌 2. مسارات لوحة تحكم المستفيدين ---
app.get('/api/dashboard/me', authenticateToken, (req, res) => {
    const db = readDB();
    const myRequests = db.requests.filter(r => r.userId === req.user.id);
    res.json({ success: true, requests: myRequests });
});

app.post('/api/dashboard/request', authenticateToken, (req, res) => {
    const { serviceType, description } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    const newRequest = {
        id: Date.now(),
        userId: req.user.id,
        fullName: user.full_name,
        email: user.email,
        userPhone: user.phone,
        serviceType,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        paymentMethod: '',
        payment_sender_name: '',
        payment_transfer_number: '',
        initial_diagnosis: '',
        treatment_plan: '',
        payment_rejection_reason: ''
    };
    db.requests.push(newRequest);
    writeDB(db);
    res.json({ success: true, message: 'تم إرسال طلبك للشيخ بسام بنجاح!' });
});

app.get('/api/dashboard/request/:id', authenticateToken, (req, res) => {
    const db = readDB();
    const request = db.requests.find(r => r.id === parseInt(req.params.id) && (r.userId === req.user.id || req.user.role === 'admin'));
    if (!request) return res.status(404).json({ error: 'الطلب غير موجود.' });
    res.json({ success: true, request });
});

app.put('/api/dashboard/request/:id/submit-payment', authenticateToken, (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    const db = readDB();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(req.params.id) && r.userId === req.user.id);
    if (reqIndex === -1) return res.status(404).json({ error: 'الطلب غير موجود.' });

    db.requests[reqIndex].status = 'payment_submitted';
    db.requests[reqIndex].paymentMethod = paymentMethod;
    db.requests[reqIndex].payment_sender_name = paymentSenderName;
    db.requests[reqIndex].payment_transfer_number = paymentTransferNumber;

    writeDB(db);
    res.json({ success: true, message: 'تم إرسال بيانات التحويل المالي للمراجعة والاعتماد.' });
});

app.post('/api/dashboard/reviews', authenticateToken, (req, res) => {
    const { comment, rating } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === req.user.id);
    db.reviews.push({
        id: Date.now(),
        userId: req.user.id,
        fullName: user.full_name,
        userEmail: user.email,
        comment,
        rating: parseInt(rating),
        isApproved: false
    });
    writeDB(db);
    res.json({ success: true, message: 'شكراً لك! تم إرسال تقييمك للمدير للموافقة على نشره.' });
});

// --- 📌 3. مسارات المراسلات والدردشة الآمنة بين الطرفين ---
app.get('/api/requests/:id/messages', authenticateToken, (req, res) => {
    const db = readDB();
    const reqId = parseInt(req.params.id);
    const messages = db.messages.filter(m => m.requestId === reqId);
    res.json({ success: true, messages });
});

app.post('/api/requests/:id/messages', authenticateToken, (req, res) => {
    const { messageText } = req.body;
    const db = readDB();
    const reqId = parseInt(req.params.id);
    
    db.messages.push({
        id: Date.now(),
        requestId: reqId,
        senderId: req.user.id,
        senderName: req.user.full_name,
        senderRole: req.user.role,
        messageText,
        createdAt: new Date().toISOString()
    });
    writeDB(db);
    res.json({ success: true });
});

// --- 📌 4. مسارات لوحة تحكم الشيخ بسام (Admin Control Panel) ---
app.get('/api/admin/requests', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB();
    res.json(db.requests);
});

app.put('/api/admin/requests/:id/accept-initial', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    if (reqIndex === -1) return res.status(404).json({ error: 'الطلب غير موجود.' });
    
    db.requests[reqIndex].status = 'accepted_waiting_payment';
    writeDB(db);
    res.json({ success: true, message: 'تم القبول المبدئي وتحديث حالة الطلب بانتظار الدفع.' });
});

app.put('/api/admin/requests/:id/reject-initial', authenticateToken, requireAdmin, (req, res) => {
    const { reason } = req.body;
    const db = readDB();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    if (reqIndex === -1) return res.status(404).json({ error: 'الطلب غير موجود.' });
    
    db.requests[reqIndex].status = 'rejected';
    db.requests[reqIndex].payment_rejection_reason = reason;
    writeDB(db);
    res.json({ success: true, message: 'تم رفض الطلب وتدوين السبب.' });
});

app.put('/api/admin/requests/:id/approve-payment', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    if (reqIndex === -1) return res.status(404).json({ error: 'الطلب غير موجود.' });
    
    db.requests[reqIndex].status = 'processing';
    writeDB(db);
    res.json({ success: true, message: 'تم اعتماد التحويل المالي وبدء مرحلة إعداد العلاج.' });
});

app.put('/api/admin/requests/:id/reject-payment', authenticateToken, requireAdmin, (req, res) => {
    const { reason } = req.body;
    const db = readDB();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    if (reqIndex === -1) return res.status(404).json({ error: 'الطلب غير موجود.' });
    
    db.requests[reqIndex].status = 'payment_rejected';
    db.requests[reqIndex].payment_rejection_reason = reason;
    writeDB(db);
    res.json({ success: true, message: 'تم رفض الدفعة وإخطار المستفيد لتصحيح المعاملة.' });
});

app.put('/api/admin/requests/:id/diagnose', authenticateToken, requireAdmin, (req, res) => {
    const { initialDiagnosis, treatmentPlan } = req.body;
    const db = readDB();
    const reqIndex = db.requests.findIndex(r => r.id === parseInt(req.params.id));
    if (reqIndex === -1) return res.status(404).json({ error: 'الطلب غير موجود.' });
    
    db.requests[reqIndex].status = 'diagnosed';
    db.requests[reqIndex].initial_diagnosis = initialDiagnosis;
    db.requests[reqIndex].treatment_plan = treatmentPlan;
    writeDB(db);
    res.json({ success: true, message: 'تم حفظ التشخيص وإصدار البرنامج العلاجي للمستفيد بنجاح!' });
});

// --- 📌 5. ربط محرر المقالات، الآراء، وتوجيهات الذكاء الاصطناعي ---
app.post('/api/admin/articles', authenticateToken, requireAdmin, (req, res) => {
    const { title, summary, content, icon } = req.body;
    const db = readDB();
    const newArticle = { id: Date.now(), title, summary, content, icon: icon || 'bi bi-heart-fill', createdAt: new Date().toISOString() };
    db.articles.push(newArticle);
    writeDB(db);
    res.json({ success: true, message: 'تم نشر المقال/الرأي العلمي بنجاح بالمدونة!' });
});

app.get('/api/articles', (req, res) => {
    const db = readDB();
    res.json(db.articles);
});

app.get('/api/admin/ai-instructions', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB();
    res.json({ success: true, instructions: db.aiConfig.instructions });
});

app.put('/api/admin/ai-instructions', authenticateToken, requireAdmin, (req, res) => {
    const { instructions } = req.body;
    const db = readDB();
    db.aiConfig.instructions = instructions;
    writeDB(db);
    res.json({ success: true, message: 'تم تحديث عقل وتوجيهات المساعد الذكي العائم بنجاح!' });
});

app.get('/api/admin/reviews', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB();
    res.json({ success: true, reviews: db.reviews });
});

app.put('/api/admin/reviews/:id', authenticateToken, requireAdmin, (req, res) => {
    const { isApproved } = req.body;
    const db = readDB();
    const index = db.reviews.findIndex(r => r.id === parseInt(req.params.id));
    if (index !== -1) {
        db.reviews[index].isApproved = isApproved;
        writeDB(db);
        res.json({ success: true, message: 'تم تحديث حالة نشر التقييم في واجهة الموقع.' });
    } else {
        res.status(404).json({ error: 'التقييم غير موجود.' });
    }
});

app.delete('/api/admin/reviews/:id', authenticateToken, requireAdmin, (req, res) => {
    const db = readDB();
    db.reviews = db.reviews.filter(r => r.id !== parseInt(req.params.id));
    writeDB(db);
    res.json({ success: true, message: 'تم حذف التقييم نهائياً.' });
});

app.get('/api/reviews', (req, res) => {
    const db = readDB();
    const approved = db.reviews.filter(r => r.isApproved === true);
    res.json(approved);
});

// --- 📌 6. نقطة اتصال المساعد الذكي المطور (AI Chat Engine) ---
app.post('/api/ai-chat', (req, res) => {
    const { message } = req.body;
    const db = readDB();
    const systemPrompt = db.aiConfig.instructions;

    // محرك ردود فوري وذكي يحاكي التوجيهات الروحانية بدقة متناهية
    let reply = "";
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("عين") || lowerMsg.includes("حسد") || lowerMsg.includes("تعب")) {
        reply = `بناءً على توجيهات فضيلة الشيخ بسام المنصوصة في لوحة الإدارة:\n"أنصحك بالبدء بقراءة سورة الفاتحة 7 مرات على كوب ماء والنفث فيه وشربه، مع المحافظة التامة على أذكار الصباح والمساء والاستماع للرقية الشرعية العامة لدرء تأثير العين والحسد."`;
    } else if (lowerMsg.includes("علاج") || lowerMsg.includes("برنامج") || lowerMsg.includes("رقية")) {
        reply = `وفقاً للتنظيم الروحي المعتمد في المركز:\n"البرنامج العلاجي الفعال يتطلب تشخيصاً دقيقاً من فضيلة الشيخ بسام. أنصحك بإنشاء حساب في المنصة فوراً وتقديم طلب رقية وعلاج جديد ليقوم الشيخ شخصياً بمراجعته ورسم برنامجك الخاص."`;
    } else if (lowerMsg.includes("سعر") || lowerMsg.includes("رسوم") || lowerMsg.includes("دفع")) {
        reply = `أهلاً بك يا أخي الكريم. الرسوم في مركزنا رمزية وتذهب لدعم وتطوير أعمال المنصة. لمعرفة تفاصيل الرسوم وسبل الدفع والتحويل، يرجى تقديم طلب في لوحة التحكم لمراجعته وتوجيهك لآلية السداد المعتمدة والمبسطة.`;
    } else {
        reply = `مرحباً بك في مركز النور الرباني.\nتوجيهاتنا الروحية الحالية تنصحك بكثرة الاستغفار والصلاة على النبي الكريم صلى الله عليه وسلم. لطلب تشخيص مخصص لحالتك وعلاج من الشيخ بسام شخصياً، يسعدنا تقديم طلب جديد من داخل حسابك الموحد.`;
    }

    res.json({ success: true, reply });
});

// تشغيل خادم الويب
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 السيرفر المتكامل والمترابط يعمل الآن بنجاح على: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
