require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = './data.json';

// ==============================================
// 1. الإعدادات الأمنية الأساسية
// ==============================================
app.use(helmet());
app.use(cors());
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'تم تجاوز عدد الطلبات المسموح بها.' }
});
app.use('/api/', limiter);
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ==============================================
// 2. إعداد البريد الإلكتروني (ناقل الإشعارات)
// ==============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ==============================================
// 3. قاعدة البيانات (JSON)
// ==============================================
fs.ensureFileSync(DATA_FILE);
if (!fs.existsSync(DATA_FILE) || fs.readFileSync(DATA_FILE).length === 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        settings: {},
        requests: [],
        clients: [],
        testimonials: [],
        articles: [],
        admin: { username: process.env.ADMIN_USER || 'admin', password: bcrypt.hashSync(process.env.ADMIN_PASS || 'Bassam@Noor2024', 10) }
    }));
}
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// ==============================================
// 4. وظيفة المصادقة (للوحة التحكم)
// ==============================================
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).json({ error: 'الرجاء إدخال بيانات الدخول' });
    }
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    const data = readData();
    const admin = data.admin || { username: process.env.ADMIN_USER || 'admin', password: bcrypt.hashSync(process.env.ADMIN_PASS || 'Bassam@Noor2024', 10) };
    
    if (username === admin.username && bcrypt.compareSync(password, admin.password)) {
        return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
};

// ==============================================
// 5. المسارات العامة
// ==============================================
app.get('/api/settings', (req, res) => res.json(readData().settings));
app.get('/api/testimonials', (req, res) => res.json(readData().testimonials));
app.get('/api/articles', (req, res) => res.json(readData().articles));

// مسار إرسال الطلب (مع البريد الإلكتروني)
app.post('/api/request',
    [
        body('fullName').notEmpty().trim().escape(),
        body('email').isEmail().normalizeEmail(),
        body('phone').notEmpty().trim().escape(),
        body('description').notEmpty().isLength({ min: 5 }).trim().escape(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'بيانات غير صالحة', details: errors.array() });
        }

        let data = readData();
        const newReq = {
            id: Date.now(),
            ...req.body,
            status: 'pending',
            createdAt: new Date().toISOString(),
            ip: req.ip
        };
        data.requests.push(newReq);
        let client = data.clients.find(c => c.email === req.body.email);
        if (!client) {
            client = { email: req.body.email, fullName: req.body.fullName, history: [] };
            data.clients.push(client);
        }
        client.history.push(newReq.id);
        writeData(data);

        // ===== إرسال بريد إلكتروني للمسؤول =====
        try {
            await transporter.sendMail({
                from: `"مركز النور الرباني" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `طلب جديد من ${req.body.fullName}`,
                html: `<h2>طلب استشارة جديد</h2>
                       <p><strong>الاسم:</strong> ${req.body.fullName}</p>
                       <p><strong>البريد:</strong> ${req.body.email}</p>
                       <p><strong>الهاتف:</strong> ${req.body.phone}</p>
                       <p><strong>الخدمة:</strong> ${req.body.serviceType}</p>
                       <p><strong>الوصف:</strong> ${req.body.description}</p>
                       <p><a href="http://localhost:${PORT}/admin.html">اضغط هنا لإدارة الطلب</a></p>`
            });
        } catch (emailError) {
            console.error('فشل إرسال البريد:', emailError.message);
        }

        res.json({ success: true, id: newReq.id });
    }
);

// ==============================================
// 6. مسارات لوحة التحكم (محمية)
// ==============================================
app.get('/api/requests', authenticate, (req, res) => {
    const data = readData();
    // إرسال جميع الطلبات مع الترتيب من الأحدث
    res.json(data.requests.reverse());
});

app.get('/api/clients', authenticate, (req, res) => res.json(readData().clients));

// تحديث حالة الطلب (مع إرسال بريد للعميل عند الرد)
app.patch('/api/request/:id', authenticate, async (req, res) => {
    let data = readData();
    const { id } = req.params;
    const { status, adminReply } = req.body;
    const index = data.requests.findIndex(r => r.id == id);
    
    if (index === -1) return res.status(404).json({ error: 'الطلب غير موجود' });

    data.requests[index].status = status;
    if (adminReply !== undefined) data.requests[index].adminReply = adminReply;
    writeData(data);

    // إرسال رد للعميل إذا كان الرد موجوداً
    if (adminReply && data.requests[index].email) {
        try {
            await transporter.sendMail({
                from: `"مركز النور الرباني" <${process.env.EMAIL_USER}>`,
                to: data.requests[index].email,
                subject: `تحديث حالة طلبك - مركز النور الرباني`,
                html: `<h2>السلام عليكم ${data.requests[index].fullName}</h2>
                       <p>تم تحديث حالة طلبك إلى: <strong>${status}</strong></p>
                       <p><strong>رد الشيخ بسام:</strong></p>
                       <p style="background:#f4f0eb; padding:15px; border-radius:10px;">${adminReply}</p>
                       <p>نسأل الله لكم الشفاء والعافية.</p>`
            });
        } catch (e) { console.error('فشل إرسال الرد للعميل'); }
    }

    res.json({ success: true });
});

// حذف طلب
app.delete('/api/request/:id', authenticate, (req, res) => {
    let data = readData();
    const { id } = req.params;
    data.requests = data.requests.filter(r => r.id != id);
    writeData(data);
    res.json({ success: true });
});

// ==============================================
// 7. تشغيل الخادم
// ==============================================
app.listen(PORT, () => {
    console.log(`🔒 مركز النور الرباني الاحترافي يعمل على http://localhost:${PORT}`);
    console.log(`📊 لوحة التحكم: http://localhost:${PORT}/admin.html`);
});