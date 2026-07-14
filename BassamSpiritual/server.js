const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// ==============================================
// 1. البرمجيات الوسيطة والحماية الفائقة (Security & Middleware)
// ==============================================
app.use(helmet({
    contentSecurityPolicy: false, // لضمان عمل الواجهات الأمامية المدمجة بسلاسة
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// محدد معدل الطلبات لمنع هجمات التخمين والغمر
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // حد أقصى 100 طلب لكل جهاز
    message: { success: false, error: 'لقد قمت بمحاولات كثيرة جداً، يرجى المحاولة لاحقاً بعد 15 دقيقة.' }
});

// ==============================================
// 2. إعداد الاتصال بقاعدة البيانات السحابية (PostgreSQL Connection)
// ==============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') 
        ? { rejectUnauthorized: false } 
        : false
});

pool.connect()
    .then(() => console.log("🐘 [قاعدة البيانات] تم الاتصال بـ PostgreSQL بنجاح ورابط السيرفر مستقر."))
    .catch(err => console.error("❌ [قاعدة البيانات] خطأ في الاتصال بقاعدة البيانات:", err.message));

app.set('db', pool);

// ==============================================
// 3. إعداد نظام إرسال البريد الإلكتروني (Nodemailer Setup)
// ==============================================
const mailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true للـ 465، false للمنافذ الأخرى مثل 587
    auth: {
        user: process.env.EMAIL_USER || '', // بريد مرسل الإشعارات
        pass: process.env.EMAIL_PASS || ''  // رمز تطبيق البريد الإلكتروني الخاص بك
    }
});

// دالة برمجية مساعدة لإرسال الإشعارات البريدية الأنيقة للمستفيدين تلقائياً
const sendEmailNotification = async (toEmail, subject, textContent, htmlContent) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("⚠️ [البريد الإلكتروني] لم يتم إعداد بيانات SMTP في ملف .env، تم تخطي إرسال الإيميل.");
        return;
    }
    try {
        await mailTransporter.sendMail({
            from: `"مركز النور الرباني" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: subject,
            text: textContent,
            html: htmlContent
        });
        console.log(`📧 [البريد الإلكتروني] تم إرسال إشعار بنجاح إلى: ${toEmail}`);
    } catch (error) {
        console.error("❌ [البريد الإلكتروني] خطأ أثناء إرسال البريد:", error.message);
    }
};

// ==============================================
// 4. تهيئة وبناء الجداول تلقائياً (Database Schema Initialization)
// ==============================================
const initializeDatabase = async () => {
    try {
        console.log("🧹 [قاعدة البيانات] جاري فحص وتحديث الجداول لضمان الترابط التام...");
        
        // جدول المستخدمين
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                phone VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // جدول طلبات الاستشفاء والاستشارات وعمليات الدفع
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                service_type VARCHAR(255) DEFAULT 'استشارة عامة',
                description TEXT NOT NULL,
                contact_method VARCHAR(100) DEFAULT 'واتساب',
                status VARCHAR(50) DEFAULT 'pending',
                initial_diagnosis TEXT,
                treatment_plan TEXT,
                additional_treatment_cost NUMERIC DEFAULT 0.00,
                treatment_duration_days INTEGER DEFAULT 0,
                treatment_expires_at TIMESTAMP,
                is_message_locked BOOLEAN DEFAULT FALSE,
                payment_method VARCHAR(100),
                payment_sender_name VARCHAR(255),
                payment_transfer_number VARCHAR(100),
                payment_submitted_at TIMESTAMP,
                payment_rejection_reason TEXT,
                initial_rejection_reason TEXT,
                total_paid_amount NUMERIC DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // جدول المحادثات والمراسلات الآمنة والمغلقة داخل الموقع
        await pool.query(`
            CREATE TABLE IF NOT EXISTS request_messages (
                id SERIAL PRIMARY KEY,
                request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                sender_role VARCHAR(50) NOT NULL,
                message_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // جدول المقالات والمدونة
        await pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                summary TEXT,
                content TEXT,
                icon VARCHAR(100) DEFAULT 'bi bi-heart-fill',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // جدول آراء المستفيدين والتقييمات الخاضعة للرقابة قبل النشر
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                full_name VARCHAR(255),
                comment TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                is_approved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // جدول إعدادات النظام وتوجيهات الذكاء الاصطناعي
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        console.log("✅ [قاعدة البيانات] جميع الجداول مهيأة ومترابطة بنجاح بنسبة 100%.");
    } catch (err) {
        console.error("❌ [قاعدة البيانات] خطأ حرج أثناء تهيئة الجداول وهيكلة البيانات:", err.message);
    }
};
initializeDatabase();

// ==============================================
// 5. برمجيات التحقق والمصادقة (Authentication Guards)
// ==============================================
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'الرجاء تسجيل الدخول أولاً للوصول إلى هذه الصفحة.' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (e) {
        res.status(401).json({ success: false, error: 'انتهت صلاحية الجلسة الآمنة، يرجى تسجيل الدخول مجدداً.' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'صلاحية غير كافية. هذا القسم مخصص لفضيلة الشيخ بسام فقط.' });
    }
    next();
};

// ==============================================
// 6. مسارات المصادقة وحماية الحسابات (Authentication API)
// ==============================================
app.post('/api/auth/register', authRateLimiter, [
    body('email').isEmail().withMessage('يرجى إدخال بريد إلكتروني صحيح وصالح.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { fullName, email, password, phone } = req.body;
    const finalName = fullName ? fullName.trim() : "مستفيد جديد";

    try {
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً في المنصة.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (full_name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role, phone',
            [finalName, email, hashedPassword, 'user', phone || null]
        );

        const newUser = result.rows[0];
        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
        
        res.status(201).json({
            success: true,
            message: 'تم إنشاء حسابكم بنجاح في مركز النور الرباني.',
            token,
            user: { id: newUser.id, fullName: newUser.full_name, email: newUser.email, role: newUser.role, phone: newUser.phone }
        });
    } catch (err) {
        console.error('❌ [المصادقة] خطأ حرج أثناء التسجيل الجديد:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ غير متوقع في النظام، يرجى مراجعة المسؤول.' });
    }
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'يرجى كتابة البريد الإلكتروني وكلمة المرور بالكامل.' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            success: true,
            message: `مرحباً بك مجدداً في المنصة الروحانية.`,
            token,
            user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role, phone: user.phone }
        });
    } catch (err) {
        console.error('❌ [المصادقة] خطأ حرج أثناء تسجيل الدخول:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ في النظام الداخلي للمنصة.' });
    }
});

app.get('/api/auth/verify', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, full_name, email, role, phone FROM users WHERE id = $1', [req.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'المستخدم غير موجود بالنظام.' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (e) {
        res.status(500).json({ success: false, error: 'فشل التحقق من الجلسة الآمنة.' });
    }
});

// ==============================================
// 7. مسارات لوحة تحكم المستفيد (Beneficiary Dashboard)
// ==============================================
app.get('/api/dashboard/me', verifyToken, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT id, full_name, email, role, phone, created_at FROM users WHERE id = $1', [req.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الملف الشخصي غير مسجل لدينا.' });
        }

        const requestsResult = await pool.query(
            `SELECT id, service_type AS "serviceType", status, description, 
                    initial_diagnosis AS "initialDiagnosis", treatment_plan AS "treatmentPlan", 
                    payment_method AS "paymentMethod", total_paid_amount AS "totalPaidAmount",
                    payment_rejection_reason AS "paymentRejectionReason", initial_rejection_reason AS "initialRejectionReason",
                    created_at AS "createdAt"
             FROM requests WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.userId]
        );

        res.json({
            success: true,
            user: userResult.rows[0],
            requests: requestsResult.rows
        });
    } catch (err) {
        console.error('❌ [لوحة المستفيد] خطأ أثناء جلب الملف الشخصي والطلبات:', err.message);
        res.status(500).json({ success: false, error: 'فشل السيرفر في استرجاع بياناتك الشخصية.' });
    }
});

app.post('/api/dashboard/request', verifyToken, async (req, res) => {
    const { serviceType, description, contactMethod } = req.body;
    if (!description || description.trim().length < 15) {
        return res.status(400).json({ success: false, error: 'الرجاء شرح حالتك ووصف مشكلتك بالتفصيل (15 حرفاً على الأقل) لنتمكن من تشخيصها بدقة.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO requests (user_id, service_type, description, contact_method, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [req.userId, serviceType || 'استشارة عامة', description, contactMethod || 'واتساب', 'pending']
        );
        res.json({ success: true, requestId: result.rows[0].id, message: '✅ تم إرسال طلبكم بنجاح لفضيلة الشيخ بسام وسنقوم بدراسته بعناية.' });
    } catch (err) {
        console.error('❌ [لوحة المستفيد] خطأ أثناء إدراج طلب استشارة جديد:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ فني أثناء تقديم طلب الاستشارة.' });
    }
});

app.get('/api/dashboard/request/:id', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *, service_type AS "serviceType", created_at AS "createdAt", 
                    treatment_plan AS "treatmentPlan", initial_diagnosis AS "initialDiagnosis",
                    payment_method AS "paymentMethod", payment_sender_name AS "paymentSenderName",
                    payment_transfer_number AS "paymentTransferNumber", payment_rejection_reason AS "paymentRejectionReason"
             FROM requests WHERE id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب المستعلم عنه غير موجود.' });
        }
        if (parseInt(result.rows[0].user_id) !== parseInt(req.userId) && req.userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'غير مصرح لك بمشاهدة تفاصيل هذه الحالة.' });
        }
        res.json({ success: true, request: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'فشل النظام في جلب تفاصيل الطلب.' });
    }
});

app.put('/api/dashboard/request/:id/submit-payment', verifyToken, async (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    if (!paymentMethod || !paymentSenderName || !paymentTransferNumber) {
        return res.status(400).json({ success: false, error: 'يرجى ملء جميع حقول بيانات التحويل لتوثيق إجراء الدفع.' });
    }
    try {
        const result = await pool.query(
            `UPDATE requests SET payment_method = $1, payment_sender_name = $2, payment_transfer_number = $3,
             status = 'payment_submitted', payment_submitted_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND user_id = $5 RETURNING id`,
            [paymentMethod, paymentSenderName, paymentTransferNumber, req.params.id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'لم يتم العثور على الطلب المطلوب أو لا تملك الصلاحية لتسجيل دفعة له.' });
        }
        res.json({ success: true, message: '✅ تم إرسال إيصال الحوالة المالية بنجاح وجاري فحصها لتأكيد الاعتماد.' });
    } catch (err) {
        console.error('❌ [لوحة المستفيد] خطأ في تحديث بيانات الدفع للطلب:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ أثناء حفظ معلومات الإجراء المالي.' });
    }
});

// ==============================================
// 8. مسارات لوحة الإدارة الشاملة (الشيخ بسام - Admin API)
// ==============================================
app.get('/api/admin/requests', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, 
                    r.service_type AS "serviceType", r.created_at AS "createdAt", 
                    r.total_paid_amount AS "totalPaidAmount", r.initial_rejection_reason AS "initialRejectionReason",
                    r.payment_sender_name AS "paymentSenderName", r.payment_transfer_number AS "paymentTransferNumber",
                    r.payment_method AS "paymentMethod", r.payment_rejection_reason AS "paymentRejectionReason",
                    u.full_name AS "fullName", u.email, u.phone AS "userPhone"
             FROM requests r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC`
        );
        res.json(result.rows);
    } catch (e) {
        console.error('❌ [لوحة الإدارة] فشل استخراج الطلبات الشاملة للمدير:', e.message);
        res.status(500).json({ success: false, error: 'خطأ داخلي في تجميع كشوف الطلبات.' });
    }
});

// موافقة مبدئية والطلب بانتظار الدفع
app.put('/api/admin/requests/:id/accept-initial', verifyToken, verifyAdmin, async (req, res) => {
    const { sendEmail } = req.body; // خيار إرسال بريد إلكتروني اختياري
    try {
        const result = await pool.query(
            `UPDATE requests SET status = 'accepted_waiting_payment' WHERE id = $1 RETURNING id, user_id`, 
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب المبحوث عنه غير متوفر.' });
        }

        // إشعار المستفيد بريدياً (اختياري)
        if (sendEmail) {
            const userRes = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [result.rows[0].user_id]);
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                const subject = "تحديث طلبكم في مركز النور الرباني";
                const text = `السلام عليكم ورحمة الله وبركاته، أخي ${user.full_name}. لقد تم قبول طلبكم مبدئياً وهو بانتظار إتمام إجراءات الدفع المقررة. يرجى تسجيل الدخول إلى لوحة التحكم الخاصة بك لإكمال الإجراء.`;
                const html = `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                                <h3 style="color: #4A154B;">السلام عليكم ورحمة الله وبركاته</h3>
                                <p>مرحباً بك أخي الكريم <strong>${user.full_name}</strong>،</p>
                                <p>لقد اطلع فضيلة الشيخ بسام على طلبكم وتم <strong>القبول المبدئي للحالة</strong> وهي الآن بانتظار تأكيد وتعبئة بيانات الإجراء المالي.</p>
                                <p style="margin-top: 20px;"><a href="${process.env.SITE_URL || 'https://noor-alrabbani.com'}/dashboard" style="background-color: #4A154B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">اضغط هنا للدخول للوحة التحكم ودفع الرسوم</a></p>
                                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
                                <p style="font-size: 12px; color: #777;">هذا البريد مرسل تلقائياً، يرجى عدم الرد عليه مباشرة.</p>
                             </div>`;
                await sendEmailNotification(user.email, subject, text, html);
            }
        }

        res.json({ success: true, message: '✅ تم تحديث حالة الطلب إلى مقبول وبانتظار تعبئة بيانات الدفع.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'فشل تنفيذ عملية القبول المبدئي.' }); 
    }
});

// رفض مبدئي مع تحديد سبب الرفض
app.put('/api/admin/requests/:id/reject-initial', verifyToken, verifyAdmin, async (req, res) => {
    const { reason, sendEmail } = req.body;
    try {
        const result = await pool.query(
            `UPDATE requests SET status = 'rejected_by_admin', initial_rejection_reason = $1 WHERE id = $2 RETURNING id, user_id`, 
            [reason || 'نعتذر عن قبول الحالة لعدم الاختصاص الروحي أو الطبي في هذا المجال.', req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
        }

        if (sendEmail) {
            const userRes = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [result.rows[0].user_id]);
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                const subject = "بخصوص طلبكم في مركز النور الرباني";
                const text = `السلام عليكم ورحمة الله وبركاته، أخي ${user.full_name}. نأسف لإعلامكم بأنه تم الاعتذار عن تلبية طلبكم للسبب التالي: ${reason}`;
                const html = `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                                <h3>السلام عليكم ورحمة الله وبركاته</h3>
                                <p>مرحباً بك أخي الكريم <strong>${user.full_name}</strong>،</p>
                                <p>بخصوص طلب الاستشارة الروحية المقدم لفضيلتكم، نأسف لإبلاغكم بأنه تم الاعتذار عن قبول الطلب للسبب التالي:</p>
                                <blockquote style="background-color: #f9f9f9; padding: 15px; border-right: 4px solid #f44336; margin: 15px 0;">
                                    ${reason || 'عدم الاختصاص لعدم مطابقة الشروط.'}
                                </blockquote>
                                <p>نسأل الله لكم العفو والعافية المستمرة.</p>
                             </div>`;
                await sendEmailNotification(user.email, subject, text, html);
            }
        }

        res.json({ success: true, message: '🔴 تم رفض الطلب بنجاح وتوثيق السبب إدارياً.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'حدث خطأ في عملية الرفض الإداري.' }); 
    }
});

// اعتماد ومصادقة الدفع للبدء في البرنامج العلاجي
app.put('/api/admin/requests/:id/approve-payment', verifyToken, verifyAdmin, async (req, res) => {
    const { sendEmail } = req.body;
    try {
        const result = await pool.query(
            `UPDATE requests SET status = 'processing' WHERE id = $1 RETURNING id, user_id`, 
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب غير موجود لإتمام الإجراء المالي.' });
        }

        if (sendEmail) {
            const userRes = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [result.rows[0].user_id]);
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                const subject = "تأكيد استلام الدفع وبدء الاستشفاء";
                const text = `أخي ${user.full_name}، تم اعتماد دفعتكم المالية بنجاح وحالتكم الآن قيد الدراسة وإعداد البرنامج العلاجي المناسب.`;
                const html = `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                                <h3>الحمد لله تم اعتماد دفعتكم بنجاح</h3>
                                <p>مرحباً بك أخي <strong>${user.full_name}</strong>،</p>
                                <p>لقد قمنا بتأكيد استلام التحويل المالي وإثباته، وبدأ فضيلة الشيخ بسام بالعمل على حالتك ودراسة تفاصيل البرنامج العلاجي والتحصينات الروحية المناسبة.</p>
                                <p>يرجى متابعة حسابكم في المنصة باستمرار لمعاينة الرد الفوري والرقية المقررة.</p>
                             </div>`;
                await sendEmailNotification(user.email, subject, text, html);
            }
        }

        res.json({ success: true, message: '✅ تم اعتماد الدفع بنجاح والطلب الآن انتقل لمرحلة المعالجة والدراسة الفعلية.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'خطأ فني في مسار اعتماد البيانات المالية.' }); 
    }
});

// رفض الدفع بسبب خطأ في التحويل أو عدم صحة البيانات المرسلة من العميل
app.put('/api/admin/requests/:id/reject-payment', verifyToken, verifyAdmin, async (req, res) => {
    const { reason, sendEmail } = req.body;
    try {
        const result = await pool.query(
            `UPDATE requests SET status = 'payment_rejected', payment_rejection_reason = $1 WHERE id = $2 RETURNING id, user_id`, 
            [reason || 'لم يتم العثور على أي حوالة مطابقة للبيانات المدخلة في حساباتنا.', req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب المطلوب غير موجود.' });
        }

        if (sendEmail) {
            const userRes = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [result.rows[0].user_id]);
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                const subject = "تنبيه بخصوص خطأ في تأكيد الدفع";
                const text = `السلام عليكم ${user.full_name}. نود إعلامكم بأن إثبات الدفع المرفق لطلبكم تم رفضه للسبب التالي: ${reason}`;
                const html = `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                                <h3>تنبيه بخصوص معاملتكم المالية</h3>
                                <p>أخي الكريم <strong>${user.full_name}</strong>،</p>
                                <p>نظراً لعدم تطابق بيانات الإيصال مع كشوفات حساباتنا، فقد تم رفض معاملة الدفع للسبب التالي:</p>
                                <p style="color: #f44336; font-weight: bold; padding: 10px; background-color: #ffebee;">${reason}</p>
                                <p>يرجى تسجيل الدخول مجدداً وإرفاق بيانات إثبات الحوالة بشكل صحيح لإتمام طلب الاستشفاء.</p>
                             </div>`;
                await sendEmailNotification(user.email, subject, text, html);
            }
        }

        res.json({ success: true, message: '🔴 تم رفض الحوالة المالية بنجاح مع إخطار العميل بنوع الخطأ لتعديله.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'حدث خطأ في عملية رفض الدفع المالي.' }); 
    }
});

// تحديث التشخيص وكتابة البرنامج العلاجي المتكامل للمستفيد
app.put('/api/admin/requests/:id/diagnose', verifyToken, verifyAdmin, async (req, res) => {
    const { initialDiagnosis, treatmentPlan, sendEmail } = req.body;
    try {
        const result = await pool.query(
            `UPDATE requests SET initial_diagnosis = $1, treatment_plan = $2, status = 'diagnosed' WHERE id = $3 RETURNING id, user_id`,
            [initialDiagnosis, treatmentPlan, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب غير متوفر لتعديل العلاج.' });
        }

        if (sendEmail) {
            const userRes = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [result.rows[0].user_id]);
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                const subject = "بشرى سارة: تم إصدار خطتكم العلاجية";
                const text = `السلام عليكم ${user.full_name}. يرجى الدخول فوراً إلى حسابكم في الموقع لاستلام برنامج الرقية والتحصينات الروحانية المعدة لكم من فضيلة الشيخ بسام.`;
                const html = `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
                                <h3 style="color: #4A154B;">بشرى سارة بنجاح التشخيص</h3>
                                <p>أخي الكريم <strong>${user.full_name}</strong>،</p>
                                <p>نهنئكم بأن فضيلة الشيخ بسام قد فرغ من دراسة وتوضيح التشخيص الروحاني لحالتكم، وقام بكتابة وتحديث الخطة العلاجية الشاملة وجدول التحصين المقررة لكم.</p>
                                <p>تفضل بالدخول إلى لوحة التحكم الخاصة بك لمشاهدة التفاصيل والمباشرة في العلاج والشفاء.</p>
                                <p style="margin-top: 20px;"><a href="${process.env.SITE_URL || 'https://noor-alrabbani.com'}/dashboard" style="background-color: #4A154B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">مشاهدة البرنامج العلاجي</a></p>
                             </div>`;
                await sendEmailNotification(user.email, subject, text, html);
            }
        }

        res.json({ success: true, message: '✅ تم توثيق وحفظ التشخيص الروحي والخطة العلاجية بنجاح على حساب العميل.' });
    } catch (e) {
        console.error('❌ [لوحة الإدارة] خطأ أثناء حفظ التشخيص والعلاج:', e.message);
        res.status(500).json({ success: false, error: 'فشل حفظ التشخيص الطبي والروحي.' });
    }
});

app.delete('/api/admin/requests/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM requests WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب تم حذفه مسبقاً أو غير متوفر بالنظام.' });
        }
        res.json({ success: true, message: '🗑️ تم إزالة طلب الاستشارة وسجلاته المرتبطة تماماً من خوادم المنصة.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'فشل السيرفر في حذف وحذف السجلات المرجعية.' }); 
    }
});

// ==============================================
// 9. نظام المراسلات الثنائي والآمن (On-Platform Internal Chat)
// ==============================================
app.get('/api/requests/:id/messages', verifyToken, async (req, res) => {
    try {
        // التحقق من صلاحية الوصول للدردشة (العميل صاحب الشأن أو الإدارة)
        const reqCheck = await pool.query('SELECT user_id FROM requests WHERE id = $1', [req.params.id]);
        if (reqCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'طلب الاستفسار والمراسلات هذا غير موجود.' });
        }
        if (parseInt(reqCheck.rows[0].user_id) !== parseInt(req.userId) && req.userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'غير مصرح لك باستعراض هذه المحادثة المغلقة.' });
        }

        const messages = await pool.query(
            `SELECT m.*, m.sender_role AS "senderRole", m.message_text AS "messageText", m.created_at AS "createdAt",
                    u.full_name AS "senderName"
             FROM request_messages m JOIN users u ON m.sender_id = u.id
             WHERE m.request_id = $1 ORDER BY m.created_at ASC`,
            [req.params.id]
        );
        res.json({ success: true, messages: messages.rows });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'حدث عطل فني في استرجاع سجل المراسلات المباشرة.' }); 
    }
});

app.post('/api/requests/:id/messages', verifyToken, async (req, res) => {
    const { messageText } = req.body;
    if (!messageText || messageText.trim() === "") {
        return res.status(400).json({ success: false, error: 'لا يمكن إرسال رسائل أو استفسارات فارغة.' });
    }
    try {
        // فحص صلاحية الإرسال
        const reqCheck = await pool.query('SELECT user_id FROM requests WHERE id = $1', [req.params.id]);
        if (reqCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب المرتبط بالرسالة غير متوفر.' });
        }
        if (parseInt(reqCheck.rows[0].user_id) !== parseInt(req.userId) && req.userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'لا تمتلك حق إرسال رسائل داخل هذا الطلب.' });
        }

        const result = await pool.query(
            `INSERT INTO request_messages (request_id, sender_id, sender_role, message_text)
             VALUES ($1, $2, $3, $4) RETURNING *, message_text AS "messageText", created_at AS "createdAt", sender_role AS "senderRole"`,
            [req.params.id, req.userId, req.userRole, messageText.trim()]
        );

        res.status(201).json({ success: true, message: result.rows[0] });
    } catch (e) {
        console.error('❌ [المراسلات] خطأ أثناء إدراج الرسالة الجديدة:', e.message);
        res.status(500).json({ success: false, error: 'عفواً، فشل إرسال وحفظ الرسالة.' });
    }
});

// ==============================================
// 10. المقالات والمدونة وإدارتها (CMS Endpoints)
// ==============================================
app.get('/api/articles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) { 
        res.status(500).json({ error: 'عجز النظام عن تحميل مقالات المدونة حالياً.' }); 
    }
});

app.post('/api/admin/articles', verifyToken, verifyAdmin, async (req, res) => {
    const { title, summary, content, icon } = req.body;
    if (!title || !content) {
        return res.status(400).json({ success: false, error: 'يرجى كتابة عنوان المقال ومحتواه بالتفصيل.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO articles (title, summary, content, icon) VALUES ($1, $2, $3, $4) RETURNING *', 
            [title, summary || '', content, icon || 'bi bi-heart-fill']
        );
        res.json({ success: true, article: result.rows[0], message: '✅ تم نشر المقال بنجاح بمدونتنا.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'حدث خطأ في قاعدة البيانات أثناء نشر المقال.' }); 
    }
});

app.put('/api/admin/articles/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { title, summary, content, icon } = req.body;
    try {
        const result = await pool.query(
            'UPDATE articles SET title = $1, summary = $2, content = $3, icon = $4 WHERE id = $5 RETURNING id', 
            [title, summary, content, icon || 'bi bi-heart-fill', req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'المقال المطلوب تعديله لم يتم العثور عليه.' });
        }
        res.json({ success: true, message: 'تم تحديث المقال بنجاح واعتمدت التعديلات.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'فشل تحديث المقال الروحاني.' }); 
    }
});

app.delete('/api/admin/articles/:id', verifyToken, verifyAdmin, async (req, res) => {
    try { 
        const result = await pool.query('DELETE FROM articles WHERE id = $1 RETURNING id', [req.params.id]); 
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'المقال غير متوفر أو تم حذفه مسبقاً.' });
        }
        res.json({ success: true, message: '🗑️ تم إزالة المقال من المدونة نهائياً.' }); 
    } catch (e) { 
        res.status(500).json({ success: false, error: 'فشل حذف المقال المطلوب.' }); 
    }
});

// ==============================================
// 11. الرقابة وإدارة آراء وتقييمات المستفيدين (Reviews Guard)
// ==============================================
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, full_name AS "fullName", comment, rating, created_at AS "createdAt" FROM reviews WHERE is_approved = TRUE ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) { 
        res.status(500).json({ error: 'خطأ في جلب تقييمات وآراء المستفيدين المعتمدة.' }); 
    }
});

app.post('/api/dashboard/reviews', verifyToken, async (req, res) => {
    const { comment, rating } = req.body;
    if (!comment || comment.trim() === "") {
        return res.status(400).json({ success: false, error: 'يرجى كتابة تعليق حقيقي لمشاركة تجربتك.' });
    }
    try {
        const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.userId]);
        const userName = userRes.rows[0]?.full_name || 'مستفيد مجهول';

        await pool.query(
            'INSERT INTO reviews (user_id, full_name, comment, rating, is_approved) VALUES ($1, $2, $3, $4, FALSE)',
            [req.userId, userName, comment, rating || 5]
        );
        res.json({ success: true, message: '✅ تم إرسال تقييمك ورأيك بنجاح، وسيتم نشره فور إتمام مراجعته برمجياً لضمان الخصوصية.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'عذراً، فشل إرسال رأيك.' });
    }
});

app.get('/api/admin/reviews', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.id, r.full_name AS "fullName", r.comment, r.rating, r.is_approved AS "isApproved", r.created_at AS "createdAt",
                    u.email AS "userEmail"
             FROM reviews r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC`
        );
        res.json({ success: true, reviews: result.rows });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'عطل في قراءة جميع التقييمات.' }); 
    }
});

app.put('/api/admin/reviews/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { isApproved } = req.body;
    try { 
        const result = await pool.query('UPDATE reviews SET is_approved = $1 WHERE id = $2 RETURNING id', [isApproved, req.params.id]); 
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'لم يتم العثور على التقييم.' });
        }
        res.json({ success: true, message: 'تم تحديث حالة الرأي العام للتعليق ونشره بنجاح.' }); 
    } catch (e) { 
        res.status(500).json({ success: false, error: 'خطأ أثناء السعي لتغيير اعتماد التقييم.' }); 
    }
});

app.delete('/api/admin/reviews/:id', verifyToken, verifyAdmin, async (req, res) => {
    try { 
        const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING id', [req.params.id]); 
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'التعليق غير متواجد.' });
        }
        res.json({ success: true, message: '🗑️ تم إقصاء وحذف التقييم نهائياً.' }); 
    } catch (e) { 
        res.status(500).json({ success: false, error: 'فشل إتمام عملية الحذف.' }); 
    }
});

// ==============================================
// 12. إدارة توجيهات والتعليمات الأساسية للـ AI (Prompt Center)
// ==============================================
app.get('/api/admin/ai-instructions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_prompt'");
        res.json({ success: true, instructions: result.rows[0]?.value || 'أنت مستشار روحي ونفسي لمركز النور الرباني، تقدم استشارات متزنة...' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'تعذر جلب توجيهات الذكاء الاصطناعي.' }); 
    }
});

app.put('/api/admin/ai-instructions', verifyToken, verifyAdmin, async (req, res) => {
    const { instructions } = req.body;
    if (!instructions || instructions.trim() === "") {
        return res.status(400).json({ success: false, error: 'لا يمكن إرسال توجيهات للـ AI فارغة بالكامل.' });
    }
    try {
        await pool.query(
            "INSERT INTO system_settings (key, value) VALUES ('ai_prompt', $1) ON CONFLICT (key) DO UPDATE SET value = $1", 
            [instructions.trim()]
        );
        res.json({ success: true, message: '✅ تم تعديل وتحديث سلوك ورؤية المستشار الذكي بالموقع بنجاح.' });
    } catch (e) { 
        res.status(500).json({ success: false, error: 'حدث عطل برمجى أثناء محاولة حفظ التعليمات.' }); 
    }
});

// ==============================================
// 13. توجيه الصفحات الفردية وإدارتها لربط وتكامل الـ (SPA UI Routing)
// ==============================================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'المسار البرمجي المطلوب غير متوفر بالخادم.' });
    }
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ==============================================
// 14. إطلاق الخادم وبدء التشغيل الفعلي للمنصة
// ==============================================
app.listen(PORT, () => {
    console.log(`
    ============================================================
    🚀 [مركز النور الرباني] السيرفر يعمل بنجاح وكفاءة تامة!
    📡 منفذ الخدمة النشط: http://localhost:${PORT}
    🛡️ الحماية: Helmet ونظام تقييد الطلبات مفعلة بكفاءة.
    ✉️ البريد الإلكتروني: جاهز لإرسال إشعارات Nodemailer المترابطة.
    ============================================================
    `);
});
