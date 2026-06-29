require('dotenv').config();
const express = require('express');
const compression = require('compression');
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

// ==============================================
// 1. إعداد الـ Proxy (لـ Render) - حل الخطأ
// ==============================================
app.set('trust proxy', 1); // هذا السطر يحل مشكلة X-Forwarded-For

// ==============================================
// 2. الإعدادات الأمنية والأداء الأساسية
// ==============================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "script-src-attr": ["'unsafe-inline'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "font-src": ["'self'", "https:", "data:"],
            "style-src": ["'self'", "'unsafe-inline'", "https:"],
            "img-src": ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors());
app.use(compression());

// ==============================================
// 3. تحديد معدل الطلبات (مع إصلاح الـ Proxy)
// ==============================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'تم تجاوز عدد الطلبات المسموح بها.' },
    trustProxy: true, // هذا السطر يحل المشكلة بشكل مباشر
});
app.use('/api/', limiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static('public', {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// ==============================================
// 4. إعداد البريد الإلكتروني
// ==============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ==============================================
// 5. قاعدة البيانات (JSON)
// ==============================================
const DATA_FILE = './data.json';
fs.ensureFileSync(DATA_FILE);
if (!fs.existsSync(DATA_FILE) || fs.readFileSync(DATA_FILE).length === 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        settings: {},
        paymentMethods: [],
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
// 6. وظيفة المصادقة
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
// 7. المسارات العامة
// ==============================================
app.get('/api/settings', (req, res) => res.json(readData().settings));
app.get('/api/testimonials', (req, res) => res.json(readData().testimonials));
app.get('/api/articles', (req, res) => res.json(readData().articles));

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

        try {
            await transporter.sendMail({
                from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `طلب جديد من ${req.body.fullName}`,
                html: `<h2>طلب استشارة جديد</h2>
                       <p><strong>الاسم:</strong> ${req.body.fullName}</p>
                       <p><strong>البريد:</strong> ${req.body.email}</p>
                       <p><strong>الهاتف:</strong> ${req.body.phone}</p>
                       <p><strong>الخدمة:</strong> ${req.body.serviceType}</p>
                       <p><strong>الوصف:</strong> ${req.body.description}</p>
                       <p><a href="https://bassam-spiritual-center.onrender.com/admin.html">اضغط هنا لإدارة الطلب</a></p>`
            });
        } catch (emailError) {
            console.error('فشل إرسال البريد للمسؤول:', emailError.message);
        }

        res.json({ success: true, id: newReq.id });
    }
);

// ==============================================
// 8. مسارات لوحة التحكم (محمية)
// ==============================================
app.get('/api/requests', authenticate, (req, res) => {
    const data = readData();
    res.json(data.requests.reverse());
});

app.get('/api/clients', authenticate, (req, res) => res.json(readData().clients));

app.patch('/api/request/:id', authenticate, async (req, res) => {
    let data = readData();
    const { id } = req.params;
    const { status, adminReply } = req.body;
    const index = data.requests.findIndex(r => r.id == id);
    
    if (index === -1) return res.status(404).json({ error: 'الطلب غير موجود' });

    data.requests[index].status = status;
    if (adminReply !== undefined) data.requests[index].adminReply = adminReply;
    writeData(data);

    const reqData = data.requests[index];
    const clientEmail = reqData.email;
    const clientName = reqData.fullName;

    if (clientEmail && adminReply) {
        try {
            const settings = data.settings || {};
            const freePrice = settings.prices?.free || 0;
            const standardPrice = settings.prices?.standard || 200;
            const premiumPrice = settings.prices?.premium || 500;
            const currencySymbol = settings.currencySymbol || 'ر.س';
            
            let price = standardPrice;
            if (reqData.serviceType && reqData.serviceType.includes('500')) {
                price = premiumPrice;
            } else if (reqData.serviceType && reqData.serviceType.includes('مجاناً')) {
                price = freePrice;
            }

            let emailHtml = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 12px; border-right: 8px solid #D4AF37;">
                    <h2 style="color: #0A1628; text-align: center;">مركز <span style="color: #D4AF37;">النور الرباني والنفس الرحماني</span></h2>
                    <p style="font-size: 1.1rem;">السلام عليكم ورحمة الله وبركاته <strong>${clientName}</strong>،</p>
                    <p>تم تحديث حالة طلبك إلى: <strong style="color: #D4AF37;">${status === 'completed' ? '✅ تمت الموافقة' : status === 'rejected' ? '❌ مرفوض' : '🔄 قيد المعالجة'}</strong></p>
                    <div style="background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #eee;">
                        <p><strong>✍️ رد الشيخ بسام:</strong></p>
                        <p style="background: #f4f0eb; padding: 15px; border-radius: 10px;">${adminReply}</p>
                    </div>
            `;

            if (status === 'completed' && price > 0) {
                const paymentMethods = data.paymentMethods || [];
                if (paymentMethods.length > 0) {
                    emailHtml += `
                        <hr style="border: 1px dashed #D4AF37; margin: 20px 0;">
                        <h3 style="color: #0A1628; text-align: center;">💳 اختر طريقة الدفع</h3>
                        <p style="text-align: center; color: #555;">المبلغ: <strong style="color: #D4AF37; font-size: 1.3rem;">${price} ${currencySymbol}</strong></p>
                        <div style="display: flex; flex-direction: column; gap: 12px; margin: 15px 0;">
                    `;
                    paymentMethods.forEach((method) => {
                        const detailsHtml = method.details ? method.details.replace(/\n/g, '<br>') : 'لم يتم إدخال التفاصيل';
                        emailHtml += `
                            <div style="background: #fff; border-right: 6px solid #D4AF37; padding: 15px 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                <strong style="color: #0A1628; font-size: 1.1rem;">${method.name}</strong>
                                <p style="margin: 8px 0; color: #333; line-height: 1.8; white-space: pre-wrap;">${detailsHtml}</p>
                                ${method.note ? `<p style="color: #888; font-size: 0.9rem; margin: 5px 0 0 0;">${method.note}</p>` : ''}
                            </div>
                        `;
                    });
                    emailHtml += `
                        </div>
                        <p style="text-align: center; color: #888; font-size: 0.9rem;">بعد التحويل، يرجى إرسال الإيصال عبر واتساب.</p>
                    `;
                }
            } else if (status === 'completed' && price === 0) {
                emailHtml += `
                    <hr style="border: 1px dashed #D4AF37; margin: 20px 0;">
                    <p style="text-align: center; color: #0A1628; font-weight: bold;">✅ خدمتك مجانية بالكامل.</p>
                `;
            } else if (status === 'rejected') {
                emailHtml += `
                    <hr style="border: 1px dashed #ccc; margin: 20px 0;">
                    <p style="color: #888; text-align: center;">نأسف لعدم تمكننا من قبول طلبك في هذا الوقت.</p>
                `;
            }

            emailHtml += `
                    <p style="margin-top: 20px; text-align: center; color: #555;">نسأل الله لكم الشفاء والعافية.</p>
                    <p style="text-align: center; color: #aaa; font-size: 0.8rem;">هذا البريد آلي، يرجى عدم الرد عليه.</p>
                </div>
            `;

            await transporter.sendMail({
                from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
                to: clientEmail,
                subject: `تحديث حالة طلبك - مركز النور الرباني والنفس الرحماني`,
                html: emailHtml
            });
        } catch (e) {
            console.error('فشل إرسال الرد للعميل:', e.message);
        }
    }

    res.json({ success: true });
});

app.delete('/api/request/:id', authenticate, (req, res) => {
    let data = readData();
    const { id } = req.params;
    data.requests = data.requests.filter(r => r.id != id);
    writeData(data);
    res.json({ success: true });
});

// ==============================================
// 9. تشغيل الخادم
// ==============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔒 مركز النور الرباني والنفس الرحماني يعمل على http://localhost:${PORT}`);
    console.log(`📊 لوحة التحكم: http://localhost:${PORT}/admin.html`);
});
