const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const jwt = require('jsonwebtoken');

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
        res.status(401).json({ error: 'رمز غير صالح' });
    }
};

// ==============================================
// 1. الحصول على بيانات المستخدم ولوحة التحكم
// ==============================================
router.get('/me', authenticate, (req, res) => {
    const user = req.user;
    const requests = readRequests().filter(r => r.userId === user.id);
    
    // ترتيب الطلبات من الأحدث
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
            message: r.message || null,
            diagnosis: r.diagnosis || null,
            treatment: r.treatment || null,
            treatmentDetails: r.treatmentDetails || null
        })),
        notifications: user.spiritualProfile?.notifications || [],
        articles: user.spiritualProfile?.articles || [],
        ruqya: user.spiritualProfile?.ruqya || [],
        dailyWirds: user.spiritualProfile?.dailyWirds || []
    });
});

// ==============================================
// 2. تقديم طلب جديد
// ==============================================
router.post('/request',
    authenticate,
    [
        express.body('serviceType').notEmpty(),
        express.body('description').notEmpty().isLength({ min: 5 }),
        express.body('contactMethod').notEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'بيانات غير صالحة', details: errors.array() });
        }

        const { serviceType, description, contactMethod, voiceNote } = req.body;
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
            voiceNote: voiceNote || null,
            status: 'pending', // pending, processing, completed, rejected
            paymentStatus: 'pending', // pending, paid, verified
            paymentHistory: [],
            createdAt: new Date().toISOString(),
            diagnosis: null,
            treatment: null,
            treatmentDetails: null,
            adminReplies: [],
            completedAt: null
        };

        requests.push(newRequest);
        writeRequests(requests);

        // إضافة الطلب إلى ملف المستخدم
        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
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
router.post('/payment/confirm/:id', authenticate, async (req, res) => {
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
    
    // تحديث حالة الدفع
    requests[index].paymentStatus = 'paid';
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
// 5. الموافقة على العلاج (المرحلة الثانية)
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
        // المستفيد رفض العلاج
        requests[index].status = 'rejected';
        writeRequests(requests);
        return res.json({
            success: true,
            message: 'تم رفض العلاج. سيتم إشعار الشيخ بذلك.'
        });
    }
    
    // المستفيد وافق على العلاج (الجلسة الصوتية)
    if (!transferCode) {
        return res.status(400).json({ error: 'رقم الحوالة مطلوب' });
    }
    
    // تسجيل الدفع للجلسة الصوتية (350 ريال)
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
// 6. إرسال رسالة استفسار (نافذة التواصل بعد العلاج)
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
    
    if (!requests[index].messages) {
        requests[index].messages = [];
    }
    
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
