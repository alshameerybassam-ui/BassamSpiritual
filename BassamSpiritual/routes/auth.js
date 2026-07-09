const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// التأكد من وجود ملف المستخدمين
fs.ensureFileSync(USERS_FILE);
if (!fs.existsSync(USERS_FILE) || fs.readFileSync(USERS_FILE).length === 0) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE));
const writeUsers = (data) => fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

// ==============================================
// 1. تسجيل مستخدم جديد (مستفيد)
// ==============================================
router.post('/register',
    [
        body('fullName').notEmpty().trim().escape().isLength({ min: 3 }),
        body('email').isEmail().normalizeEmail(),
        body('phone').optional().trim().escape(),
        body('password').isLength({ min: 6 }),
        body('agreeTerms').isBoolean(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'بيانات غير صالحة', details: errors.array() });
        }

        const { fullName, email, phone, password } = req.body;

        const users = readUsers();
        if (users.find(u => u.email === email)) {
            return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now(),
            fullName,
            email,
            phone: phone || '',
            password: hashedPassword,
            role: 'user', // يتم تسجيل أي شخص جديد كـ مستفيد تلقائياً 👤
            createdAt: new Date().toISOString(),
            isActive: true,
            spiritualProfile: { notifications: [], articles: [], ruqya: [], dailyWirds: [] },
            requests: [],
            paymentHistory: []
        };

        users.push(newUser);
        writeUsers(users);

        // تشفير البيانات داخل التوكن مع الرتبة
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser.id,
                fullName: newUser.fullName,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        });
    }
);

// ==============================================
// 2. تسجيل الدخول الذكي (يفصل بين العميل والمدير)
// ==============================================
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'بيانات غير صالحة', details: errors.array() });
        }

        const { email, password } = req.body;
        const users = readUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'الحساب غير نشط. يرجى التواصل مع الإدارة.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // إذا لم يكن للمستخدم رتبة مسبقة نضع له رتبة user افتراضية حماية للنظام
        if (!user.role) {
            user.role = 'user';
        }

        // تشفير الرتبة الـ role داخل التوكن لضمان الأمان بالأجهزة الأخرى
        const token = jwt.sign(
            { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role, // إرسال الرتبة للمتصفح ليقوم بالتوجيه الصحيح
                createdAt: user.createdAt
            }
        });
    }
);

// ==============================================
// 3. التحقق من صحة الرمز للحفاظ على الجلسة (نسخة مصلحة تدعم GET لمنع الـ 404)
// ==============================================
router.get('/verify', (req, res) => {
    // قراءة التوكن بأمان من الهيدر
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'رمز الجلسة مفقود وغير متاح.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === decoded.id);
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'المستفيد غير مسجل بقاعدة البيانات.' });
        }
        
        if (!user.isActive) {
            return res.status(403).json({ success: false, error: 'هذا الحساب تم توقيفه مؤقتاً من قبل الإدارة.' });
        }

        // إرجاع استجابة نجاح متوافقة 100% مع متطلبات dashboard.js و admin.js
        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role || 'user'
            }
        });
    } catch (e) {
        res.status(401).json({ success: false, error: 'انتهت صلاحية الرمز، يرجى إعادة تسجيل الدخول.' });
    }
});

// دعم احتياطي لـ POST أيضاً لضمان عدم تأثر أي ملفات أخرى بالمشروع
router.post('/verify', (req, res) => {
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'غير مصرح' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === decoded.id);
        if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'الحساب غير نشط' });
        
        res.json({
            success: true,
            user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role || 'user' }
        });
    } catch (e) {
        res.status(401).json({ success: false, error: 'رمز غير صالح' });
    }
});

module.exports = router;
