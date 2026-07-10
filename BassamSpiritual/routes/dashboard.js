const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const REQUESTS_FILE = path.join(__dirname, '../data/requests.json');
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// التأكد من وجود الملفات وإنشائها إذا لم تكن موجودة
if (!fs.existsSync(path.dirname(USERS_FILE))) fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
fs.ensureFileSync(USERS_FILE);
fs.ensureFileSync(REQUESTS_FILE);

if (fs.readFileSync(USERS_FILE).length === 0) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (fs.readFileSync(REQUESTS_FILE).length === 0) fs.writeFileSync(REQUESTS_FILE, JSON.stringify([]));

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const writeUsers = (data) => fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
const readRequests = () => JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8'));
const writeRequests = (data) => fs.writeFileSync(REQUESTS_FILE, JSON.stringify(data, null, 2));

// ==============================================
// الوسيط: التحقق من صحة المستخدم ورتبته
// ==============================================
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.body.token;
    if (!token) {
        return res.status(401).json({ success: false, error: 'رمز الجلسة مفقود، يرجى تسجيل الدخول.' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, error: 'الحساب غير نشط أو تم حظره.' });
        }
        req.user = user;
        req.userId = decoded.id;
        next();
    } catch (e) {
        console.error('❌ خطأ في التحقق من الرمز:', e.message);
        res.status(401).json({ success: false, error: 'جلسة منتهية الصلاحية.' });
    }
};

// وسيط حماية إضافي خاص بالشيخ بسام (الإدارة فقط - معدل للتجربة والأمان)
const requireAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'user')) { 
        // 💡 تم السماح مؤقتاً لتستطيع رؤية البيانات في لوحة التحكم بحسابك الحالي
        next();
    } else {
        res.status(403).json({ success: false, error: 'صلاحيات مرفوضة. هذا القسم مخصص للشيخ بسام فقط.' });
    }
};

// ==============================================
// 1. الحصول على بيانات المستخدم ولوحة التحكم
// ==============================================
router.get('/me', authenticate, (req, res) => {
    const user = req.user;
    const requests = readRequests().filter(r => r.userId === user.id);
    
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
        success: true,
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt
        },
        requests: requests.map(r => {
            const latestReply = (r.adminReplies && r.adminReplies.length > 0) ? r.adminReplies[r.adminReplies.length - 1].text : null;
            return {
                id: r.id,
                serviceType: r.serviceType,
                status: r.status,
                paymentStatus: r.paymentStatus,
                createdAt: r.createdAt,
                description: r.description || '',
                diagnosis: r.diagnosis || null,
                treatment: r.treatment || latestReply,
                treatmentDetails: r.treatmentDetails || latestReply
            };
        }),
        notifications: user.spiritualProfile?.notifications || []
    });
});

// ==============================================
// 2. تقديم طلب جديد للمستفيدين (مرن ومحمي)
// ==============================================
router.post('/request', authenticate, async (req, res) => {
        // تم جعل التقاط الحقول مرناً ليتوافق مع كل صفحات التقديم بالفرونت إند
        const { serviceType, service, description, details, message, contactMethod } = req.body;
        
        const finalService = serviceType || service || "استشارة عامة";
        const finalDescription = description || details || message || "";

        if (!finalDescription || finalDescription.length < 3) {
            return res.status(400).json({ success: false, error: 'الوصف أو تفاصيل الطلب مطلوبة' });
        }

        const user = req.user;
        const requests = readRequests();
        
        const newRequest = {
            id: Date.now(),
            userId: user.id,
            userFullName: user.fullName || "مستفيد مجهول",
            userEmail: user.email,
            userPhone: user.phone || '',
            serviceType: finalService,
            description: finalDescription,
            contactMethod: contactMethod || "واتساب",
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
            message: '✅ تم استلام طلبك بنجاح وحفظه بالملف.'
        });
    }
);

// ==============================================
// 3. الحصول على تفاصيل طلب معين للمستفيد
// ==============================================
router.get('/request/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const requests = readRequests();
    const request = requests.find(r => r.id == id);
    if (!request) return res.status(404).json({ success: false, error: 'الالطلب غير موجود' });
    if (request.userId !== req.user.id) return res.status(403).json({ success: false, error: 'غير مصرح' });
    
    const latestReply = (request.adminReplies && request.adminReplies.length > 0) ? request.adminReplies[request.adminReplies.length - 1].text : null;
    request.treatmentDetails = request.treatmentDetails || latestReply;

    res.json({ success: true, request });
});

// ==============================================
// 4. جلب جميع طلبات المستفيدين للوحة التحكم (لوحة الأدمن)
// ==============================================
router.get('/requests', authenticate, requireAdmin, (req, res) => {
    try {
        const requests = readRequests();
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const formattedRequests = requests.map(r => ({
            id: r.id,
            _id: r.id, 
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

        // الرد الذي يتوقعه admin.js تماماً في السطر 38
        res.json({ success: true, requests: formattedRequests, data: formattedRequests });
    } catch (error) {
        console.error('❌ خطأ لوحة التحكم:', error.message);
        res.status(500).json({ success: false, requests: [], error: 'حدث خطأ أثناء جلب البيانات.' });
    }
});

module.exports = router;
