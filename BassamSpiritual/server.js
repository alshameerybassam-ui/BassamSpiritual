require('dotenv').config();
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();

// إعداد الـ Proxy (لـ Render)
app.set('trust proxy', 1);

// ==============================================
// الإعدادات الأمنية والأداء
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

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'تم تجاوز عدد الطلبات المسموح بها.' },
    trustProxy: true,
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
// إعداد البريد الإلكتروني
// ==============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ==============================================
// قاعدة البيانات
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
// وظيفة المصادقة
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
// المسارات العامة
// ==============================================
app.get('/api/settings', (req, res) => res.json(readData().settings));
app.get('/api/testimonials', (req, res) => res.json(readData().testimonials));
app.get('/api/articles', (req, res) => res.json(readData().articles));

// إرسال الطلب
app.post('/api/request',
    [
        body('fullName').notEmpty().trim().escape(),
        body('email').isEmail().normalizeEmail(),
        body('phone').optional().trim().escape(),
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
            paymentStatus: 'pending',
            transferCode: null,
            paymentDate: null,
            appointmentTime: null,
            meetingLink: null,
            createdAt: new Date().toISOString(),
            ip: req.ip,
            paymentToken: null
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
                       <p><strong>الهاتف:</strong> ${req.body.phone || 'لم يقدم'}</p>
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
// تأكيد الدفع من العميل (إرسال رقم الحوالة)
// ==============================================
app.post('/api/confirm-payment', async (req, res) => {
    const { token, transferCode } = req.body;
    if (!token || !transferCode) {
        return res.status(400).json({ error: 'بيانات غير مكتملة' });
    }

    const data = readData();
    const requestIndex = data.requests.findIndex(r => r.paymentToken === token);
    if (requestIndex === -1) {
        return res.status(404).json({ error: 'طلب غير موجود' });
    }

    data.requests[requestIndex].transferCode = transferCode;
    data.requests[requestIndex].paymentStatus = 'paid';
    data.requests[requestIndex].paymentDate = new Date().toISOString();
    writeData(data);

    const reqData = data.requests[requestIndex];
    try {
        await transporter.sendMail({
            from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `💰 حوالة جديدة من ${reqData.fullName}`,
            html: `<h2>تم إرسال حوالة جديدة</h2>
                   <p><strong>الاسم:</strong> ${reqData.fullName}</p>
                   <p><strong>البريد:</strong> ${reqData.email}</p>
                   <p><strong>رقم الحوالة:</strong> ${transferCode}</p>
                   <p><strong>الخدمة:</strong> ${reqData.serviceType}</p>
                   <p><a href="https://bassam-spiritual-center.onrender.com/admin.html">اضغط هنا للتحقق من الحوالة</a></p>`
        });
    } catch (e) {
        console.error('فشل إرسال إشعار الحوالة:', e.message);
    }

    res.json({ success: true });
});

// ==============================================
// تأكيد الدفع من المسؤول وإرسال الرد
// ==============================================
app.post('/api/verify-payment/:id', authenticate, async (req, res) => {
    const data = readData();
    const { id } = req.params;
    const { appointmentTime, meetingLink } = req.body;
    const index = data.requests.findIndex(r => r.id == id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    data.requests[index].paymentStatus = 'verified';
    data.requests[index].appointmentTime = appointmentTime || null;
    data.requests[index].meetingLink = meetingLink || null;
    writeData(data);

    const reqData = data.requests[index];
    const clientEmail = reqData.email;
    const clientName = reqData.fullName;
    const clientPhone = reqData.phone || '';
    const contactMethod = reqData.contactMethod || 'email';
    const adminReply = reqData.adminReply || 'تم تأكيد الدفع، سيتم التواصل معك قريباً.';
    const serviceType = reqData.serviceType || '';
    const isVoiceSession = serviceType.includes('صوتي') || serviceType.includes('جلسة');

    // بناء الرسالة النهائية
    let finalMessage = `السلام عليكم ورحمة الله وبركاته ${clientName}،\n\n✅ تم تأكيد دفعك بنجاح.\n\n✍️ رد الشيخ بسام:\n${adminReply}`;

    if (isVoiceSession && appointmentTime) {
        finalMessage += `\n\n🎧 تفاصيل الجلسة الصوتية:\n📅 الموعد: ${appointmentTime}\n🔗 رابط الانضمام: ${meetingLink || 'سيتم إرسال الرابط قريباً'}\n\nيرجى التأكد من تواجدك في الموعد المحدد، وضمان اتصال إنترنت جيد وبيئة هادئة.`;
    } else if (isVoiceSession && !appointmentTime) {
        finalMessage += `\n\n🎧 سيتم تحديد موعد الجلسة الصوتية قريباً وسيتم إشعارك به.`;
    }

    finalMessage += `\n\nنسأل الله لكم الشفاء والعافية.\nمركز النور الرباني والنفس الرحماني`;

    // إرسال عبر البريد الإلكتروني
    let sentSuccess = false;
    if (clientEmail) {
        try {
            const htmlMessage = finalMessage.replace(/\n/g, '<br>');
            await transporter.sendMail({
                from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
                to: clientEmail,
                subject: `✅ تم تأكيد دفعك - مركز النور الرباني والنفس الرحماني`,
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 12px; border-right: 8px solid #D4AF37;">
                        <h2 style="color: #0A1628; text-align: center;">مركز <span style="color: #D4AF37;">النور الرباني والنفس الرحماني</span></h2>
                        <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #eee; line-height: 2;">
                            ${htmlMessage}
                        </div>
                        <p style="text-align: center; color: #aaa; font-size: 0.8rem;">هذا البريد آلي، يرجى عدم الرد عليه.</p>
                    </div>
                `
            });
            sentSuccess = true;
        } catch (e) {
            console.error('فشل إرسال البريد الإلكتروني:', e.message);
        }
    }

    // إرسال عبر واتساب إذا اختارها
    if (contactMethod === 'whatsapp' && clientPhone) {
        try {
            const cleanPhone = clientPhone.replace(/[^0-9+]/g, '');
            const encodedText = encodeURIComponent(finalMessage);
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
            
            await transporter.sendMail({
                from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `📱 رابط واتساب للعميل ${clientName}`,
                html: `
                    <h2>رابط واتساب للعميل</h2>
                    <p><strong>العميل:</strong> ${clientName}</p>
                    <p><strong>الرقم:</strong> ${cleanPhone}</p>
                    <p><a href="${waUrl}" target="_blank">اضغط هنا لفتح محادثة واتساب</a></p>
                    <hr>
                    <p><strong>الرسالة المرسلة:</strong></p>
                    <p style="white-space:pre-wrap; background:#f4f0eb; padding:15px; border-radius:10px;">${finalMessage}</p>
                `
            });
            sentSuccess = true;
        } catch (e) {
            console.error('فشل إعداد رابط واتساب:', e.message);
        }
    }

    if (!sentSuccess) {
        try {
            await transporter.sendMail({
                from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `⚠️ فشل إرسال الرد إلى ${clientName}`,
                html: `
                    <h2>⚠️ فشل إرسال الرد</h2>
                    <p>لم يتم إرسال الرد إلى العميل بسبب:</p>
                    <ul>
                        <li>البريد الإلكتروني: ${clientEmail || 'غير موجود'}</li>
                        <li>واتساب: ${clientPhone || 'غير موجود'}</li>
                    </ul>
                    <p><strong>الرد المطلوب إرساله:</strong></p>
                    <p style="white-space:pre-wrap; background:#f4f0eb; padding:15px; border-radius:10px;">${finalMessage}</p>
                `
            });
        } catch (e) {
            console.error('فشل إرسال تنبيه للمسؤول:', e.message);
        }
    }

    res.json({ success: true, sent: sentSuccess });
});

// ==============================================
// صفحة الدفع
// ==============================================
app.get('/payment/:token', (req, res) => {
    const { token } = req.params;
    const data = readData();
    const request = data.requests.find(r => r.paymentToken === token);
    
    if (!request) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head><meta charset="UTF-8"><title>رابط غير صالح</title>
            <style>body{font-family:'Cairo',sans-serif;text-align:center;padding:50px;}h1{color:#e74c3c;}</style>
            </head>
            <body>
                <h1>⚠️ رابط الدفع غير صالح أو منتهي الصلاحية</h1>
                <p>يرجى التواصل مع الشيخ بسام للحصول على رابط جديد.</p>
            </body>
            </html>
        `);
    }

    const settings = data.settings || {};
    const standardPrice = settings.prices?.standard || 200;
    const premiumPrice = settings.prices?.premium || 500;
    const currencySymbol = settings.currencySymbol || 'ر.س';
    let price = standardPrice;
    if (request.serviceType && request.serviceType.includes('500')) {
        price = premiumPrice;
    } else if (request.serviceType && request.serviceType.includes('مجاناً')) {
        price = 0;
    }

    const paymentMethods = data.paymentMethods || [];
    const isVerified = request.paymentStatus === 'verified';
    const isPaid = request.paymentStatus === 'paid';

    let methodsHtml = '';
    if (paymentMethods.length > 0 && price > 0) {
        methodsHtml = paymentMethods.map(method => {
            const detailsHtml = method.details ? method.details.replace(/\n/g, '<br>') : 'لم يتم إدخال التفاصيل';
            return `
                <div style="background:#fff;border-right:6px solid #D4AF37;padding:15px 20px;border-radius:10px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <strong style="color:#0A1628;font-size:1.1rem;">${method.name}</strong>
                    <p style="margin:8px 0;color:#333;line-height:1.8;white-space:pre-wrap;">${detailsHtml}</p>
                    ${method.note ? `<p style="color:#888;font-size:0.9rem;margin:5px 0 0 0;">${method.note}</p>` : ''}
                </div>
            `;
        }).join('');
    } else if (price === 0) {
        methodsHtml = `<p style="color:#0A1628;font-weight:bold;">✅ خدمتك مجانية بالكامل. سيتم التواصل معك قريباً.</p>`;
    } else {
        methodsHtml = `<p style="color:#e74c3c;">⚠️ لم يتم إعداد طرق الدفع بعد. يرجى التواصل مع الشيخ بسام.</p>`;
    }

    let paymentForm = '';
    if (price > 0 && !isVerified) {
        paymentForm = `
            <div style="margin-top:20px;border-top:2px dashed #D4AF37;padding-top:20px;">
                <h3 style="color:#0A1628;text-align:center;">📝 تأكيد التحويل</h3>
                <p style="text-align:center;color:#555;">بعد إتمام التحويل، أدخل رقم الحوالة أدناه لتأكيد الدفع.</p>
                <form id="paymentForm" style="margin-top:15px;">
                    <div style="margin-bottom:15px;">
                        <label style="display:block;font-weight:700;margin-bottom:5px;">رقم الحوالة / عملية التحويل <span style="color:#e74c3c;">*</span></label>
                        <input type="text" id="transferCode" required placeholder="أدخل رقم الحوالة هنا..." style="width:100%;padding:12px 15px;border:2px solid #E2E8F0;border-radius:12px;font-family:'Cairo';font-size:1rem;">
                    </div>
                    <button type="submit" style="width:100%;background:linear-gradient(135deg,#F5B041,#E67E22);color:#0A1628;border:none;padding:14px;border-radius:12px;font-weight:800;font-size:1.1rem;cursor:pointer;font-family:'Cairo';transition:0.3s;">
                        <i class="fas fa-check-circle"></i> تأكيد التحويل
                    </button>
                </form>
                <div id="paymentMessage" style="display:none;text-align:center;margin-top:15px;padding:15px;border-radius:12px;"></div>
            </div>
        `;
    } else if (isVerified) {
        paymentForm = `
            <div style="margin-top:20px;border-top:2px solid #27ae60;padding-top:20px;">
                <h3 style="color:#27ae60;text-align:center;">✅ تم تأكيد الدفع بنجاح</h3>
                <p style="text-align:center;color:#555;">تم التحقق من حوالتك وسيتم التواصل معك قريباً.</p>
                <p style="text-align:center;color:#888;font-size:0.9rem;">رقم الحوالة: ${request.transferCode || 'غير متاح'}</p>
            </div>
        `;
    } else if (isPaid) {
        paymentForm = `
            <div style="margin-top:20px;border-top:2px solid #F5B041;padding-top:20px;">
                <h3 style="color:#F5B041;text-align:center;">⏳ جاري التحقق من الحوالة</h3>
                <p style="text-align:center;color:#555;">تم استلام رقم حوالة: <strong>${request.transferCode}</strong></p>
                <p style="text-align:center;color:#888;font-size:0.9rem;">سيتم إشعارك بعد التحقق من قبل الشيخ بسام.</p>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تفاصيل الدفع - مركز النور الرباني</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
            <style>
                body{font-family:'Cairo',sans-serif;background:#F8FAFC;color:#1A2835;padding:20px;margin:0;}
                .payment-container{max-width:700px;margin:30px auto;background:#fff;border-radius:24px;padding:35px;box-shadow:0 20px 60px rgba(10,22,40,0.12);border-top:8px solid #F5B041;}
                .payment-header{text-align:center;margin-bottom:25px;}
                .payment-header h1{color:#0A1628;font-size:2rem;}
                .payment-header h1 span{color:#F5B041;}
                .payment-header .subtitle{color:#1B4D3D;font-size:1.1rem;margin-top:5px;}
                .amount-box{background:#FFFBF0;border-radius:16px;padding:15px 20px;text-align:center;border:2px solid #F5B041;margin:20px 0;}
                .amount-box .price{font-size:2rem;font-weight:800;color:#E67E22;}
                .payment-methods{margin:20px 0;}
                .payment-methods h3{color:#0A1628;margin-bottom:15px;}
                .footer-note{text-align:center;color:#888;font-size:0.9rem;margin-top:20px;border-top:1px solid #eee;padding-top:15px;}
                .footer-note i{color:#F5B041;}
                .btn-home{display:inline-block;background:#0A1628;color:#F5B041;padding:10px 25px;border-radius:40px;text-decoration:none;font-weight:700;margin-top:15px;transition:0.3s;}
                .btn-home:hover{background:#F5B041;color:#0A1628;}
                @media(max-width:600px){.payment-container{padding:20px;}.payment-header h1{font-size:1.5rem;}}
            </style>
        </head>
        <body>
            <div class="payment-container">
                <div class="payment-header">
                    <h1>مركز <span>النور الرباني</span></h1>
                    <p class="subtitle">﴿ لإعادة اتزان الروح والنفس والجسد ﴾</p>
                </div>

                <div style="background:#F0F7F4;border-radius:12px;padding:15px;margin-bottom:20px;">
                    <p><strong>👤 المستفيد:</strong> ${request.fullName}</p>
                    <p><strong>🛠 الخدمة:</strong> ${request.serviceType}</p>
                </div>

                <div class="amount-box">
                    <p style="margin:0;color:#555;">المبلغ المطلوب:</p>
                    <p class="price">${price > 0 ? `${price} ${currencySymbol}` : 'مجاناً'}</p>
                </div>

                <div class="payment-methods">
                    <h3><i class="fas fa-coins" style="color:#F5B041;"></i> طرق الدفع المتاحة</h3>
                    ${methodsHtml}
                </div>

                ${paymentForm}

                <div style="text-align:center;margin-top:15px;">
                    <a href="https://bassam-spiritual-center.onrender.com/" class="btn-home">
                        <i class="fas fa-arrow-right"></i> العودة إلى الموقع
                    </a>
                </div>

                <div class="footer-note">
                    <i class="fas fa-lock"></i> هذه الصفحة آمنة وسرية تماماً
                </div>
            </div>

            <script>
                document.getElementById('paymentForm')?.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const transferCode = document.getElementById('transferCode').value.trim();
                    if (!transferCode) { alert('⚠️ يرجى إدخال رقم الحوالة.'); return; }
                    const btn = this.querySelector('button[type="submit"]');
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
                    try {
                        const res = await fetch('/api/confirm-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: '${token}', transferCode })
                        });
                        const json = await res.json();
                        const msgDiv = document.getElementById('paymentMessage');
                        msgDiv.style.display = 'block';
                        if (json.success) {
                            msgDiv.style.background = '#D1FAE5';
                            msgDiv.style.color = '#065F46';
                            msgDiv.innerHTML = '<i class="fas fa-check-circle" style="font-size:1.5rem;"></i><br><strong>✅ تم استلام طلب الدفع بنجاح.</strong><br>سيتم التحقق من قبل الشيخ بسام وإشعارك قريباً.';
                            this.style.display = 'none';
                        } else {
                            msgDiv.style.background = '#FEE2E2';
                            msgDiv.style.color = '#991B1B';
                            msgDiv.innerHTML = '❌ حدث خطأ. يرجى المحاولة مرة أخرى.';
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد التحويل';
                        }
                    } catch(e) {
                        alert('⚠️ خطأ في الاتصال بالخادم.');
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد التحويل';
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// ==============================================
// مسارات لوحة التحكم (محمية)
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

    if (status === 'completed' && !data.requests[index].paymentToken) {
        const token = crypto.randomBytes(32).toString('hex');
        data.requests[index].paymentToken = token;
    }

    writeData(data);

    const reqData = data.requests[index];
    const clientEmail = reqData.email;
    const clientName = reqData.fullName;
    const paymentToken = reqData.paymentToken;
    const paymentLink = paymentToken ? `https://bassam-spiritual-center.onrender.com/payment/${paymentToken}` : null;
    const price = reqData.serviceType?.includes('500') ? 500 : (reqData.serviceType?.includes('مجاناً') ? 0 : 200);
    const currencySymbol = data.settings?.currencySymbol || 'ر.س';

    if (clientEmail && adminReply && status === 'completed') {
        try {
            let emailHtml = `
                <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;border-radius:12px;border-right:8px solid #D4AF37;">
                    <h2 style="color:#0A1628;text-align:center;">مركز <span style="color:#D4AF37;">النور الرباني والنفس الرحماني</span></h2>
                    <p style="font-size:1.1rem;">السلام عليكم ورحمة الله وبركاته <strong>${clientName}</strong>،</p>
                    <p>✅ تمت الموافقة على طلبك.</p>
                    <div style="background:#fff;padding:15px;border-radius:8px;margin:15px 0;border:1px solid #eee;">
                        <p><strong>✍️ رد الشيخ بسام:</strong></p>
                        <p style="background:#f4f0eb;padding:15px;border-radius:10px;">${adminReply}</p>
                    </div>
            `;

            if (paymentLink && price > 0) {
                emailHtml += `
                    <hr style="border:1px dashed #D4AF37;margin:20px 0;">
                    <h3 style="color:#0A1628;text-align:center;">💳 إتمام الدفع</h3>
                    <p style="text-align:center;">لإتمام عملية الدفع، يرجى الضغط على الرابط التالي:</p>
                    <p style="text-align:center;">
                        <a href="${paymentLink}" style="display:inline-block;background:linear-gradient(135deg,#F5B041,#E67E22);color:#0A1628;padding:12px 30px;border-radius:40px;text-decoration:none;font-weight:800;margin:10px 0;">
                            <i class="fas fa-credit-card"></i> اضغط هنا لعرض تفاصيل الدفع
                        </a>
                    </p>
                    <p style="text-align:center;color:#888;font-size:0.9rem;">الرابط صالح لمدة 7 أيام فقط.</p>
                `;
            } else if (paymentLink && price === 0) {
                emailHtml += `
                    <hr style="border:1px dashed #D4AF37;margin:20px 0;">
                    <p style="text-align:center;color:#0A1628;font-weight:bold;">✅ خدمتك مجانية بالكامل. سيتم التواصل معك قريباً.</p>
                `;
            }

            emailHtml += `
                    <p style="margin-top:20px;text-align:center;color:#555;">نسأل الله لكم الشفاء والعافية.</p>
                    <p style="text-align:center;color:#aaa;font-size:0.8rem;">هذا البريد آلي، يرجى عدم الرد عليه.</p>
                </div>
            `;

            await transporter.sendMail({
                from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
                to: clientEmail,
                subject: `✅ تمت الموافقة على طلبك - مركز النور الرباني والنفس الرحماني`,
                html: emailHtml
            });
        } catch (e) {
            console.error('فشل إرسال إشعار الموافقة:', e.message);
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
// تشغيل الخادم
// ==============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔒 مركز النور الرباني والنفس الرحماني يعمل على http://localhost:${PORT}`);
    console.log(`📊 لوحة التحكم: http://localhost:${PORT}/admin.html`);
});
