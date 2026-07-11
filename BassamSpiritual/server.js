const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg'); // استدعاء محرك PostgreSQL
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================
// 1. البرمجيات الوسيطة الأساسية (Middlewares)
// ==============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تشغيل الملفات الساكنة
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================
// 2. الاتصال بقاعدة البيانات السحابية PostgreSQL
// ==============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // مطلوب لتأمين الاتصال مع سيرفرات Render
    }
});

pool.connect()
    .then(() => console.log("🐘 [نظام النور] تم الاتصال بقاعدة بيانات PostgreSQL السحابية بنجاح!"))
    .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err.message));

// مشاركة الـ pool فوراً مع التطبيق قبل استدعاء أي مسارات فرعية لمنع خطأ undefined 'query'
app.set('db', pool);

// ==============================================
// 2.5 تهيئة وبناء الجداول سحابياً وتحديث الهيكل البرمجي المتقدم
// ==============================================
const initializeDatabase = async () => {
    try {
        console.log("🧹 جاري فحص وتحديث الجداول السحابية للتوافق مع نظام المراحل المطور...");

        // أ. جدول المستخدمين (المستفيدين والإدارة)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ب. بناء أو تحديث جدول الطلبات لدعم الحوالات والمراحل التشخيصية الكاملة
        // نقوم بإسقاط الجدول القديم لضمان زرع البنية الهندسية الجديدة بالكامل بدون تعارض
        await pool.query(`DROP TABLE IF EXISTS requests CASCADE;`);
        await pool.query(`
            CREATE TABLE requests (
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
                initial_rejection_reason TEXT, -- توثيق سبب اعتذار الشيخ عن الحالة مبدئياً
                total_paid_amount NUMERIC DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ج. جدول الرسائل والمراجعات والاستفسارات الداخلية المدمجة بالطلب
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

        // د. جدول المقالات الديناميكي 
        await pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                summary TEXT,
                content TEXT,
                icon VARCHAR(100) DEFAULT 'fa-solid fa-heart',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // هـ. جدول آراء المستفيدين المحمي
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

        // و. جدول إعدادات النظام وتوجيهات الذكاء الاصطناعي
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        // حقن توجيه آلي للذكاء الاصطناعي
        await pool.query(`
            INSERT INTO system_settings (key, value) 
            VALUES ('ai_prompt', 'أنت المعالج الروحي المساعد المعتمد من قبل فضيلة الشيخ بسام...')
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log("⚙️ [نظام النور] تمت ترقية بنية الجداول السحابية بنجاح واستقرار تام!");
    } catch (err) {
        console.error("❌ خطأ حرج أثناء التطهير أو التهيئة السحابية:", err.message);
    }
};
initializeDatabase();

// ==============================================
// 3. البرمجيات الوسيطة للتحقق من الصلاحيات والرموز الأمنية (JWT)
// ==============================================

// وسيط حماية المستفيد لقراءة الـ Token
const verifyUserToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, error: 'غير مصرح بالدخول، الرمز مفقود' });

        const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (e) {
        res.status(401).json({ success: false, error: 'انتهت الجلسة الأمنية، يرجى تسجيل الدخول.' });
    }
};

// وسيط حماية خاص بفضيلة الشيخ بسام كمسؤول أعلى
const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'غير مصرح بالدخول، الرمز مفقود' });

        const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';
        const decoded = jwt.verify(token, JWT_SECRET);

        const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [decoded.id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'عذراً، هذه الصلاحية خاصة بفضيلة الشيخ بسام!' });
        }
        req.adminId = decoded.id;
        next();
    } catch (e) {
        res.status(401).json({ error: 'انتهت الجلسة الأمنية، يرجى إعادة تسجيل الدخول.' });
    }
};

// ==============================================
// 4. مسارات مستخدمي النظام الأساسيين (المستفيدين)
// ==============================================

// أ. استقبال وإنشاء طلب مستفيد جديد وحفظه في PostgreSQL
app.post('/api/requests', verifyUserToken, async (req, res) => {
    const { serviceType, description, contactMethod } = req.body;
    try {
        if (!description) {
            return res.status(400).json({ success: false, error: 'وصف الحالة مطلوب شرحه بالتفصيل' });
        }
        
        await pool.query(
            'INSERT INTO requests (user_id, service_type, description, contact_method, status) VALUES ($1, $2, $3, $4, $5)',
            [req.userId, serviceType || 'استشارة عامة', description, contactMethod || 'واتساب', 'pending']
        );

        res.json({ success: true, message: 'تم رفع طلبك السحابي بنجاح للشيخ بسام، وهو قيد المراجعة الفقهية الآن.' });
    } catch (error) {
        console.error("❌ خطأ سحابي عند حفظ الطلب:", error.message);
        res.status(500).json({ success: false, error: 'فشل خادم السيرفر في معالجة طلبك وحفظه' });
    }
});

// ب. قيام المستفيد برفع بيانات الحوالة المالية (100 ريال كشفية)
app.put('/api/requests/:id/submit-payment', verifyUserToken, async (req, res) => {
    const { paymentMethod, paymentSenderName, paymentTransferNumber } = req.body;
    try {
        if (!paymentMethod || !paymentSenderName || !paymentTransferNumber) {
            return res.status(400).json({ success: false, error: 'يرجى ملء جميع بيانات إيصال التحويل المالي بالتفصيل' });
        }

        const result = await pool.query(
            `UPDATE requests 
             SET payment_method = $1, payment_sender_name = $2, payment_transfer_number = $3, status = $4, payment_submitted_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6 RETURNING id`,
            [paymentMethod, paymentSenderName, paymentTransferNumber, 'payment_submitted', req.params.id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب غير موجود أو غير تابع لحسابك' });
        }

        res.json({ success: true, message: 'تم إرسال بيانات إيصال الحوالة لفضيلة الشيخ بسام للتحقق المالي المباشر.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'خطأ خادم داخلي أثناء معالجة بيانات الحوالة' });
    }
});

// ج. إرسال استفسار أو مراجعة من قبل المستفيد داخل الطلب
app.post('/api/requests/:id/messages', verifyUserToken, async (req, res) => {
    const { messageText } = req.body;
    try {
        const reqCheck = await pool.query('SELECT status, is_message_locked FROM requests WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
        
        if (reqCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'لم يتم العثور على هذا الملف.' });
        }
        
        if (reqCheck.rows[0].is_message_locked) {
            return res.status(403).json({ success: false, error: 'لقد أغلق فضيلة الشيخ باب المراسلات والمراجعات لهذا الطلب نظراً لشفاء الحالة تماماً.' });
        }

        await pool.query(
            'INSERT INTO request_messages (request_id, sender_id, sender_role, message_text) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.userId, 'user', messageText]
        );

        res.json({ success: true, message: 'تم إرسال مراجعتك بنجاح للوحة الشيخ.' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'فشل إرسال الرسالة السحابية.' });
    }
});

// ==============================================
// 5. مسارات التحكم الكاملة الخاصة بالإدارة (الشيخ بسام الشميري)
// ==============================================

// أ. مسار جلب كافة طلبات المستفيدين بدقة هندسية عالية وبدون أي إخفاء
app.get('/api/admin/requests', verifyAdminToken, async (req, res) => {
    try {
        const allRequests = await pool.query(`
            SELECT r.id, 
                   r.user_id as "userId", 
                   u.full_name as "fullName", 
                   u.email, 
                   r.service_type as "serviceType", 
                   r.status, 
                   r.created_at as "createdAt",
                   r.description, 
                   r.initial_diagnosis as "initialDiagnosis", 
                   r.treatment_plan as "treatmentPlan",
                   r.additional_treatment_cost as "additionalTreatmentCost",
                   r.treatment_duration_days as "treatmentDurationDays",
                   r.treatment_expires_at as "treatmentExpiresAt",
                   r.is_message_locked as "isMessageLocked",
                   r.payment_method as "paymentMethod",
                   r.payment_sender_name as "paymentSenderName",
                   r.payment_transfer_number as "paymentTransferNumber",
                   r.payment_submitted_at as "paymentSubmittedAt",
                   r.payment_rejection_reason as "paymentRejectionReason",
                   r.initial_rejection_reason as "initialRejectionReason",
                   r.total_paid_amount as "totalPaidAmount"
            FROM requests r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json(allRequests.rows);
    } catch (e) {
        console.error("❌ خطأ في مسار جلب طلبات الإدارة:", e.message);
        res.status(200).json([]);
    }
});

// 🌟 [مسار جديد مضاف]: 1. قبول الحالة المبدئي لتبدأ إجراءات الدفع والتأكيد الكشفية
app.put('/api/admin/requests/:id/accept-initial', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE requests 
             SET status = 'accepted_waiting_payment' 
             WHERE id = $1 RETURNING id`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الملف غير موجود' });
        }

        res.json({ success: true, message: 'تم قبول استقبال الحالة مبدئياً والمستفيد ملزم برفع الحوالة الآن.' });
    } catch (e) {
        res.status(500).json({ error: 'حدث خطأ سيرفر أثناء تحديث حالة قبول الملف.' });
    }
});

// 🌟 [مسار جديد مضاف]: 2. رفض استقبال الحالة مباشرة واعتذار كلي دون إلزام مالي
app.put('/api/admin/requests/:id/reject-initial', verifyAdminToken, async (req, res) => {
    const { reason } = req.body;
    try {
        const result = await pool.query(
            `UPDATE requests 
             SET status = 'rejected_by_admin', initial_rejection_reason = $1, is_message_locked = true
             WHERE id = $2 RETURNING id`,
            [reason || 'تم الاعتذار عن استقبال الحالة لعدم الاختصاص الروحي.', req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الملف غير موجود' });
        }

        res.json({ success: true, message: 'تم رفض الملف بنجاح وإغلاقه كلياً والمستفيد غير ملزم بأي مبالغ مادية.' });
    } catch (e) {
        res.status(500).json({ error: 'حدث خطأ سيرفر أثناء معالجة الاعتذار وإغلاق الملف.' });
    }
});

// ب. تشخيص مبدئي اختياري إضافي 
app.put('/api/admin/requests/:id/diagnose', verifyAdminToken, async (req, res) => {
    const { initialDiagnosis } = req.body;
    try {
        if (!initialDiagnosis) {
            return res.status(400).json({ error: 'يرجى كتابة الملاحظات التشخيصية المبدئية للمستفيد' });
        }

        await pool.query(
            `UPDATE requests 
             SET initial_diagnosis = $1, status = $2 
             WHERE id = $3`,
            [initialDiagnosis, 'processing', req.params.id]
        );

        res.json({ success: true, message: 'تم حفظ التشخيص، وإشعار المستفيد بطلب دفع قيمة الكشفية بنجاح.' });
    } catch (e) {
        res.status(500).json({ error: 'حدث خطأ سيرفر أثناء تحديث التشخيص المبدئي.' });
    }
});

// ج. اعتماد وقبول الحوالة المالية (100 ريال) بضغطة زر واحدة
app.put('/api/admin/requests/:id/approve-payment', verifyAdminToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE requests 
             SET total_paid_amount = total_paid_amount + 100.00, status = $1 
             WHERE id = $2`,
            ['processing', req.params.id] 
        );
        res.json({ success: true, message: '🟢 تم اعتماد الحوالة وتأكيد استلام مبلغ الكشفية بنجاح، وجاهز لصياغة الخطة العلاجية.' });
    } catch (e) {
        res.status(500).json({ error: 'فشل خادم الاعتماد المالي.' });
    }
});

// د. رفض الحوالة المالية وتوثيق سبب الرفض وإشعار المستفيد لإعادتها
app.put('/api/admin/requests/:id/reject-payment', verifyAdminToken, async (req, res) => {
    const { reason } = req.body;
    try {
        if (!reason) return res.status(400).json({ error: 'يرجى كتابة سبب رفض إيصال الحوالة' });

        await pool.query(
            `UPDATE requests 
             SET payment_rejection_reason = $1, status = $2 
             WHERE id = $3`,
            [reason, 'payment_rejected', req.params.id]
        );
        res.json({ success: true, message: '🔴 تم رفض الحوالة بنجاح وإشعار المستفيد بالسبب لتعديل البيانات.' });
    } catch (e) {
        res.status(500).json({ error: 'فشل خادم معالجة الرفض المالي.' });
    }
});

// هـ. إصدار الخطة العلاجية الكاملة وتحديد المبالغ الإضافية والمدة الزمنية (قيد العلاج والمتابعة)
app.put('/api/admin/requests/:id/complete-treatment', verifyAdminToken, async (req, res) => {
    const { treatmentPlan, additionalCost, durationDays } = req.body;
    try {
        if (!treatmentPlan) return res.status(400).json({ error: 'يرجى كتابة تفاصيل الخطة العلاجية بالكامل' });

        const days = parseInt(durationDays) || 0;
        const expiryDate = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
        const addCost = parseFloat(additionalCost) || 0.00;

        await pool.query(
            `UPDATE requests 
             SET treatment_plan = $1, additional_treatment_cost = $2, treatment_duration_days = $3, treatment_expires_at = $4, status = $5, total_paid_amount = total_paid_amount + $6
             WHERE id = $7`,
            [treatmentPlan, addCost, days, expiryDate, 'completed', 0, req.params.id] // حالة completed هنا تعني (قيد العلاج والمتابعة الفعالة) للواجهات
        );

        res.json({ success: true, message: '✅ تم إرسال البرامج العلاجية والأذكار بنجاح تام للمستفيد وتحويل الحالة لمكتمل.' });
    } catch (e) {
        res.status(500).json({ error: 'خطأ أثناء كتابة وحفظ الخطة العلاجية النهائية.' });
    }
});

// و. قيد قدرة المستفيد على المراسلة أو تجميد المراسلة نهائياً للطلب الحالي
app.put('/api/admin/requests/:id/lock-messages', verifyAdminToken, async (req, res) => {
    const { lock } = req.body; // مرري true للقفل النهائي أو false لفك القفل
    try {
        await pool.query(
            `UPDATE requests SET is_message_locked = $1, status = $2 WHERE id = $3`,
            [lock, lock ? 'closed' : 'completed', req.params.id]
        );
        res.json({ success: true, message: lock ? '🔒 تم إغلاق باب المراسلات والمراجعات لهذا الطلب بنجاح وفخر.' : '🔓 تم إعادة فتح باب المراجعات للمستفيد.' });
    } catch (e) {
        res.status(500).json({ error: 'فشل نظام التحكم في أمن المراسلات والمراجعات.' });
    }
});

// ز. إرسال رد مباشر من الشيخ بسام داخل صندوق المحادثة الخاص بالطلب
app.post('/api/admin/requests/:id/messages', verifyAdminToken, async (req, res) => {
    const { messageText } = req.body;
    try {
        if (!messageText) return res.status(400).json({ error: 'نص التوجيه لا يمكن أن يكون فارغاً' });

        await pool.query(
            'INSERT INTO request_messages (request_id, sender_id, sender_role, message_text) VALUES ($1, $2, $3, $4)',
            [req.params.id, req.adminId, 'admin', messageText]
        );

        res.json({ success: true, message: 'تم إرسال ردك وتوجيهك الروحي الحكيم للمستفيد فوراَ.' });
    } catch (e) {
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الرسالة من لوحة الشيخ.' });
    }
});

// ح. جلب سجل المحادثة التاريخي المكامل بين الشيخ والمستفيد للطلب الحالي
app.get('/api/requests/:id/messages', async (req, res) => {
    try {
        const messages = await pool.query(
            `SELECT m.id, m.sender_role as "senderRole", m.message_text as "messageText", m.created_at as "createdAt", u.full_name as "senderName"
             FROM request_messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.request_id = $1
             ORDER BY m.created_at ASC`,
            [req.params.id]
        );
        res.json({ success: true, messages: messages.rows });
    } catch (e) {
        res.status(500).json({ success: false, error: 'تعذر جلب سجل المحادثات.' });
    }
});

// ط. حذف طلب مستفيد نهائياً من النظام السحابي
app.delete('/api/admin/requests/:id', verifyAdminToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: '🗑️ تم حذف ملف المستفيد بالكامل من السجلات السحابية بنجاح.' });
    } catch (e) {
        res.status(500).json({ error: 'فشل السيرفر في مسح الطلب.' });
    }
});

// ==============================================
// 6. مسارات التحكم بالمقالات وآراء المستفيدين والذكاء الاصطناعي
// ==============================================

app.get('/api/articles', async (req, res) => {
    try {
        const articles = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(articles.rows);
    } catch (error) {
        res.status(500).json({ error: "حدث خطأ أثناء تحميل المقالات السحابية" });
    }
});

app.post('/api/admin/articles', verifyAdminToken, async (req, res) => {
    const { title, summary, content, icon } = req.body;
    try {
        await pool.query(
            'INSERT INTO articles (title, summary, content, icon) VALUES ($1, $2, $3, $4)',
            [title, summary, content, icon || 'fa-solid fa-heart']
        );
        res.json({ success: true, message: '✅ تم نشر المقال الجديد بنجاح في الموقع.' });
    } catch (e) {
        res.status(500).json({ error: 'فشل حفظ المقال الجديد' });
    }
});

app.get('/api/admin/reviews', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
        res.json({ success: true, reviews: result.rows });
    } catch (e) {
        res.status(500).json({ success: false, error: 'تعذر جلب المراجعات' });
    }
});

app.put('/api/admin/reviews/:id/approve', verifyAdminToken, async (req, res) => {
    const { approve } = req.body;
    try {
        await pool.query('UPDATE reviews SET is_approved = $1 WHERE id = $2', [approve, req.params.id]);
        res.json({ success: true, message: 'تم تحديث حالة الرأي بنجاح والمزامنة بالواجهة.' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/admin/reviews/:id', verifyAdminToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'تم حذف الرأي نهائياً.' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/admin/ai-instructions', verifyAdminToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM system_settings WHERE key = 'ai_prompt'");
        res.json({ success: true, instructions: result.rows[0]?.value || '' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.put('/api/admin/ai-instructions', verifyAdminToken, async (req, res) => {
    const { instructions } = req.body;
    try {
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'ai_prompt'", [instructions]);
        res.json({ success: true, message: '⚙️ تم تحديث البنية التوجيهية الحاكمة لعقل الذكاء الاصطناعي بنجاح.' });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// ==============================================
// 7. روابط التوجيه الفرعية للمصادقة ولوحة تحكم المستفيد
// ==============================================
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);

// ==============================================
// 🔐 نظام الترقية المستمرة والمؤتمتة لحساب الشيخ بسام كأدمن أعلى
// ==============================================
setInterval(async () => {
    try {
        const checkAdmin = await pool.query('SELECT role FROM users WHERE email = $1', ["alshameerybassam@gmail.com"]);
        if (checkAdmin.rows.length > 0 && checkAdmin.rows[0].role !== 'admin') {
            await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', "alshameerybassam@gmail.com"]);
            console.log("✅ [نظام النور] تم تأكيد رتبة الإدارة لحساب الشيخ بسام سحابياً في PostgreSQL.");
        }
    } catch (e) {
        console.log("❌ خطأ في الترقية التلقائية السحابية:", e.message);
    }
}, 10000);

// ==============================================
// 8. التوجيه الذكي للواجهات الساكنة (SPA Routing)
// ==============================================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'مسار الـ API غير موجود' });
    }
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// إطلاق سيرفر التطبيق
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 سيرفر النور السحابي يعمل بنجاح وثبات على المنفذ: ${PORT}`);
    console.log(`====================================================`);
});
