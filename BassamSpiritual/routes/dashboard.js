const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const REQUESTS_FILE = path.join(__dirname, '../data/requests.json');
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// التأكد من وجود الملفات
fs.ensureFileSync(USERS_FILE);
fs.ensureFileSync(REQUESTS_FILE);
if (!fs.existsSync(USERS_FILE) || fs.readFileSync(USERS_FILE).length === 0) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(REQUESTS_FILE) || fs.readFileSync(REQUESTS_FILE).length === 0) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([]));
}

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE));
const writeUsers = (data) => fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
const readRequests = () => JSON.parse(fs.readFileSync(REQUESTS_FILE));
const writeRequests = (data) => fs.writeFileSync(REQUESTS_FILE, JSON.stringify(data, null, 2));

// ==============================================
// الوسيط: التحقق من صحة المستخدم
// ==============================================
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'غير مصرح' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'الحساب غير نشط' });
        }
        req.user = user;
        req.userId = decoded.id;
        next();
    } catch (e) {
        console.error('❌ خطأ في التحقق من الرمز:', e.message);
        res.status(401).json({ error: 'رمز غير صالح' });
    }
};

// ==============================================
// 1. الحصول على بيانات المستخدم ولوحة التحكم
// ==============================================
router.get('/me', authenticate, (req, res) => {
    const user = req.user;
    const requests = readRequests().filter(r => r.userId === user.id);
    requests.sort((a, b) => b.createdAt - a.createdAt);
    res.json({
        success: true,
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt
        },
        requests: requests.map(r => ({
            id: r.id,
            serviceType: r.serviceType,
            status: r.status,
            paymentStatus: r.paymentStatus,
            createdAt: r.createdAt,
            description: r.description || '',
            diagnosis: r.diagnosis || null,
            treatment: r.treatment || null,
            treatmentDetails: r.treatmentDetails || null
        })),
        notifications: user.spiritualProfile?.notifications || []
    });
});

// ==============================================
// 2. تقديم طلب جديد
// ==============================================
router.post('/request',
    authenticate,
    [
        body('serviceType').notEmpty().withMessage('نوع الخدمة مطلوب'),
        body('description').notEmpty().isLength({ min: 5 }).withMessage('الوصف قصير جداً'),
        body('contactMethod').notEmpty().withMessage('طريقة التواصل مطلوبة')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'بيانات غير صالحة', details: errors.array() });
        }

        const { serviceType, description, contactMethod } = req.body;
        const user = req.user;

        const requests = readRequests();
        const newRequest = {
            id: Date.now(),
            userId: user.id,
            userFullName: user.fullName,
            userEmail: user.email,
            userPhone: user.phone || '',
            serviceType,
            description,
            contactMethod,
            status: 'pending',
            paymentStatus: 'pending',
            paymentHistory: [],
            createdAt: new Date().toISOString(),
            diagnosis: null,
            treatment: null,
            treatmentDetails: null,
            adminReplies: [],
            messages: []
        };

        requests.push(newRequest);
        writeRequests(requests);

        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            if (!users[userIndex].requests) users[userIndex].requests = [];
            users[userIndex].requests.push(newRequest.id);
            writeUsers(users);
        }

        res.json({
            success: true,
            requestId: newRequest.id,
            message: '✅ تم استلام طلبك بنجاح.'
        });
    }
);

// ==============================================
// 3. الحصول على تفاصيل طلب معين
// ==============================================
router.get('/request/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const requests = readRequests();
    const request = requests.find(r => r.id == id);
    if (!request) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    if (request.userId !== req.user.id) {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    res.json({ success: true, request });
});

// ==============================================
// 4. تأكيد الدفع (المرحلة الأولى - 100 ريال)
// ==============================================
router.post('/payment/confirm/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { transferCode, paymentMethod } = req.body;
    if (!transferCode) {
        return res.status(400).json({ error: 'رقم الحوالة مطلوب' });
    }
    const requests = readRequests();
    const index = requests.findIndex(r => r.id == id);
    if (index === -1) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    if (requests[index].userId !== req.user.id) {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    requests[index].paymentStatus = 'paid';
    if (!requests[index].paymentHistory) requests[index].paymentHistory = [];
    requests[index].paymentHistory.push({
        amount: 100,
        currency: 'SAR',
        method: paymentMethod || 'تحويل بنكي',
        transferCode,
        date: new Date().toISOString(),
        stage: 'diagnosis'
    });
    writeRequests(requests);
    res.json({
        success: true,
        message: '✅ تم استلام طلب الدفع بنجاح. سيتم التحقق من قبل الشيخ وإشعارك قريباً.'
    });
});

// ==============================================
// 5. الموافقة على العلاج (المرحلة الثانية - الجلسة الصوتية)
// ==============================================
router.post('/treatment/agree/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { agree, paymentMethod, transferCode } = req.body;
    const requests = readRequests();
    const index = requests.findIndex(r => r.id == id);
    if (index === -1) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    if (requests[index].userId !== req.user.id) {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    if (agree === false) {
        requests[index].status = 'rejected';
        writeRequests(requests);
        return res.json({
            success: true,
            message: 'تم رفض العلاج. سيتم إشعار الشيخ بذلك.'
        });
    }
    if (!transferCode) {
        return res.status(400).json({ error: 'رقم الحوالة مطلوب' });
    }
    if (!requests[index].paymentHistory) requests[index].paymentHistory = [];
    requests[index].paymentHistory.push({
        amount: 350,
        currency: 'SAR',
        method: paymentMethod || 'تحويل بنكي',
        transferCode,
        date: new Date().toISOString(),
        stage: 'voice_session'
    });
    requests[index].paymentStatus = 'paid_voice';
    writeRequests(requests);
    res.json({
        success: true,
        message: '✅ تم استلام طلب الجلسة الصوتية. سيتم التواصل معك لتحديد الموعد.'
    });
});

// ==============================================
// 6. إرسال رسالة استفسار
// ==============================================
router.post('/message/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || message.trim().length < 3) {
        return res.status(400).json({ error: 'الرسالة قصيرة جداً' });
    }
    const requests = readRequests();
    const index = requests.findIndex(r => r.id == id);
    if (index === -1) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    if (requests[index].userId !== req.user.id) {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    if (requests[index].status !== 'completed') {
        return res.status(400).json({ error: 'لا يمكن إرسال رسالة إلا بعد اكتمال العلاج' });
    }
    if (!requests[index].messages) requests[index].messages = [];
    requests[index].messages.push({
        from: 'user',
        text: message.trim(),
        date: new Date().toISOString(),
        read: false
    });
    writeRequests(requests);
    res.json({
        success: true,
        message: '✅ تم إرسال رسالتك. سيتم الرد عليها قريباً.'
    });
});

module.exports = router;
// ==============================================================================
// مسارات لوحة التحكم (Admin Dashboard Routes) - مخصصة لـ admin.html و admin.js
// ==============================================================================

// 1. جلب جميع طلبات المستفيدين للوحة التحكم
router.get('/requests', (req, res) => {
    try {
        const requests = readRequests();
        
        // ترتيب الطلبات تلقائياً من الأحدث إلى الأقدم بناءً على تاريخ الإنشاء
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // تحويل الحقول لتطابق تماماً المسميات المتوقعة في كود admin.js
        const formattedRequests = requests.map(r => ({
            id: r.id,
            _id: r.id, // لضمان التوافق التام مع الكود المصحح لـ admin.js
            fullName: r.userFullName || "مستفيد غير معروف",
            email: r.userEmail || "—",
            phone: r.userPhone || "—",
            serviceType: r.serviceType || "—",
            status: r.status || "pending",
            createdAt: r.createdAt,
            description: r.description || "",
            country: r.country || "غير محدد",
            beneficiary: r.beneficiary || "نفسي",
            adminReply: (r.adminReplies && r.adminReplies.length > 0) ? r.adminReplies[r.adminReplies.length - 1].text : ""
        }));

        res.json(formattedRequests);
    } catch (error) {
        console.error('❌ خطأ في جلب جميع الطلبات للإدارة:', error.message);
        res.status(500).json({ error: 'خطأ داخلي في السيرفر أثناء جلب البيانات' });
    }
});

// 2. تحديث حالة الطلب وإضافة رد المسؤول (PATCH)
router.patch('/request/:id', (req, res) => {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    try {
        const requests = readRequests();
        const index = requests.findIndex(r => r.id == id);

        if (index === -1) {
            return res.status(404).json({ error: 'الطلب غير موجود بنظام البيانات' });
        }

        // تحديث الحالة إن أُرسلت
        if (status) {
            requests[index].status = status;
        }

        // إضافة الرد الإداري إلى مصفوفة adminReplies
        if (adminReply !== undefined) {
            if (!requests[index].adminReplies) requests[index].adminReplies = [];
            requests[index].adminReplies.push({
                text: adminReply,
                date: new Date().toISOString()
            });
        }

        writeRequests(requests);
        res.json({ success: true, message: '✅ تم تحديث بيانات المستفيد بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في تحديث الطلب من الإدارة:', error.message);
        res.status(500).json({ error: 'فشل السيرفر في تحديث البيانات' });
    }
});

// 3. حذف طلب مستفيد نهائياً (DELETE)
router.delete('/request/:id', (req, res) => {
    const { id } = req.params;

    try {
        const requests = readRequests();
        const filtered = requests.filter(r => r.id != id);

        if (requests.length === filtered.length) {
            return res.status(404).json({ error: 'الطلب غير موجود أو تم حذفه مسبقاً' });
        }

        writeRequests(filtered);
        res.json({ success: true, message: '🗑 تم حذف الطلب من السجلات بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في حذف الطلب من السجلات:', error.message);
        res.status(500).json({ error: 'فشل السيرفر في معالجة طلب الحذف' });
    }
});
