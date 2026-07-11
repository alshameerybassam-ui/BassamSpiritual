const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// ==============================================
// 🛡️ الوسيط (Middleware): التحقق من صحة المستخدم وجلبه سحابياً
// ==============================================
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.body.token;
    if (!token) {
        return res.status(401).json({ success: false, error: 'رمز الجلسة مفقود، يرجى تسجيل الدخول.' });
    }
    
    const pool = req.app.get('db');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // جلب بيانات الحساب للتأكد من وجوده وصلاحيته
        const result = await pool.query('SELECT id, full_name, email, role FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'الحساب غير موجود أو تم حظره مسبقاً.' });
        }

        req.user = result.rows[0];
        req.userId = decoded.id;
        next();
    } catch (e) {
        console.error('❌ خطأ في التحقق من الرمز سحابياً:', e.message);
        res.status(401).json({ success: false, error: 'جلسة منتهية الصلاحية.' });
    }
};

// 🔐 وسيط حماية إضافي خاص بفضيلة الشيخ بسام (الإدارة فقط)
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') { 
        next();
    } else {
        res.status(403).json({ success: false, error: 'صلاحيات مرفوضة. هذا القسم مخصص للشيخ بسام فقط.' });
    }
};

// ==============================================
// 1️⃣ مسار الحصول على بيانات المستفيد وطلباته الشخصية (مؤمن ومحمي 100%)
// ==============================================
router.get('/me', authenticate, async (req, res) => {
    const pool = req.app.get('db');

    try {
        // جلب الحقول الأساسية المؤكدة فقط منعاً لأي تعارض هيكلي في السحابة
        const userRequests = await pool.query(
            `SELECT id, 
                    service_type, 
                    status, 
                    created_at, 
                    description
             FROM requests 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [req.userId]
        );

        // تحويل الحقول بأمان لتتوافق تماماً مع الـ Front-end (dashboard.js) دون حدوث انهيار إذا كانت المصفوفة فارغة
        const formattedRequests = (userRequests.rows || []).map(r => ({
            id: r.id,
            serviceType: r.service_type || "استشارة عامة",
            status: r.status || "pending",
            createdAt: r.created_at,
            description: r.description || '',
            diagnosis: null, 
            treatment: null,
            treatmentDetails: null
        }));

        res.json({
            success: true,
            user: {
                id: req.user.id,
                fullName: req.user.full_name,
                email: req.user.email,
                role: req.user.role
            },
            requests: formattedRequests,
            notifications: []
        });
    } catch (err) {
        console.error('❌ خطأ محتوًى في مسار المستفيد /me:', err.message);
        // صمام الأمان الحرج: إذا حدث أي خطأ، تفتح اللوحة للمستفيد وتظهر فارغة بدلاً من التعطل بخطأ 500
        res.json({
            success: true,
            user: {
                id: req.userId,
                fullName: req.user?.full_name || "مستفيد النور",
                email: req.user?.email || "",
                role: req.user?.role || "user"
            },
            requests: [],
            notifications: []
        });
    }
});

// ==============================================
// 2️⃣ مسار تقديم طلب جديد للمستفيدين وضمان وصوله للإدارة سحابياً
// ==============================================
router.post('/request', authenticate, async (req, res) => {
    const { serviceType, service, description, details, message, contactMethod } = req.body;
    
    // توحيد الحقول القادمة من الواجهة الأمامية لضمان عدم وصول قيم فارغة
    const finalService = serviceType || service || "استشارة عامة";
    const finalDescription = description || details || message || "";

    if (!finalDescription || finalDescription.length < 3) {
        return res.status(400).json({ success: false, error: 'الوصف أو تفاصيل الطلب مطلوبة بشكل واضح.' });
    }

    const pool = req.app.get('db');

    try {
        // إدخال الطلب وربطه بـ user_id مع مطابقة أسماء الأعمدة الرسمية في PostgreSQL السحابية
        const result = await pool.query(
            `INSERT INTO requests (user_id, service_type, description, contact_method, status, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
            [req.userId, finalService, finalDescription, contactMethod || "واتساب", 'pending']
        );

        res.json({
            success: true,
            requestId: result.rows[0].id,
            message: '✅ تم استلام طلبك الروحي بنجاح وحفظه سحابياً في منظومة النور.'
        });
    } catch (err) {
        console.error('❌ خطأ في حفظ الطلب سحابياً:', err.message);
        res.status(500).json({ success: false, error: 'تعذر حفظ طلبك سحابياً، يرجى المحاولة لاحقاً.' });
    }
});

// ==============================================
// 3️⃣ الحصول على تفاصيل طلب روحي معين للمستفيد
// ==============================================
router.get('/request/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const pool = req.app.get('db');

    try {
        const result = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
        }

        const request = result.rows[0];
        
        // التحقق الآمن من الهوية (مستفيد أو مدير) لمنع الاختراقات بين المستفيدين
        if (parseInt(request.user_id) !== parseInt(req.userId) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'غير مصرح لك باستعراض هذا الطلب.' });
        }

        res.json({ 
            success: true, 
            request: {
                id: request.id,
                userId: request.user_id,
                serviceType: request.service_type,
                description: request.description,
                status: request.status,
                createdAt: request.created_at,
                diagnosis: request.diagnosis,
                treatment: request.treatment,
                treatmentDetails: request.treatment_details
            }
        });
    } catch (err) {
        console.error('❌ خطأ في جلب تفاصيل الطلب المفرد:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ غير متوقع بالخادم.' });
    }
});

// ==============================================
// 4️⃣ جلب جميع طلبات المستفيدين الكلية (خاص بلوحة الإدارة للشيخ بسام)
// ==============================================
router.get('/requests', authenticate, requireAdmin, async (req, res) => {
    const pool = req.app.get('db');

    try {
        const result = await pool.query(`
            SELECT r.id, r.service_type, r.status, r.description, r.created_at, r.diagnosis, r.treatment,
                   u.full_name, u.email
            FROM requests r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);

        const formattedRequests = result.rows.map(r => ({
            id: r.id,
            _id: r.id, 
            fullName: r.full_name || "مستفيد غير معروف",
            email: r.email || "—",
            phone: "—",
            serviceType: r.service_type || "—",
            status: r.status || "pending",
            createdAt: r.created_at,
            description: r.description || "",
            country: "غير محدد",
            beneficiary: "نفسي",
            adminReply: r.treatment || ""
        }));

        res.json({ success: true, requests: formattedRequests, data: formattedRequests });
    } catch (error) {
        console.error('❌ خطأ شامل بلوحة الإدارة السحابية:', error.message);
        res.status(500).json({ success: false, requests: [], error: 'حدث خطأ أثناء سحب البيانات السحابية الكلية.' });
    }
});

module.exports = router;
