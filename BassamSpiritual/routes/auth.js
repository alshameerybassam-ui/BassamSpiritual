const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// التأكد من وجود ملف المستخدمين
fs.ensureFileSync(USERS_FILE);
if (!fs.existsSync(USERS_FILE) || fs.readFileSync(USERS_FILE).length === 0) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE));
const writeUsers = (data) => fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

// إعداد البريد الإلكتروني
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// ==============================================
// 1. تسجيل مستخدم جديد
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

        // التحقق من عدم وجود المستخدم مسبقاً
        const users = readUsers();
        if (users.find(u => u.email === email)) {
            return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        // إنشاء حساب جديد
        const newUser = {
            id: Date.now(),
            fullName,
            email,
            phone: phone || '',
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            isActive: true,
            // بيانات إضافية
            spiritualProfile: {
                notifications: [],
                articles: [],
                ruqya: [],
                dailyWirds: []
            },
            // تاريخ الطلبات
            requests: [],
            // معلومات الدفع
            paymentHistory: []
        };

        users.push(newUser);
        writeUsers(users);

        // إرسال إشعار تسجيل عبر البريد
        try {
            await transporter.sendMail({
                from: `"مركز النور الرباني والنفس الرحماني" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'مرحباً بك في مركز النور الرباني',
                html: `
                    <div style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 12px; border-right: 8px solid #D4AF37;">
                        <h2 style="color: #0A1628; text-align: center;">مركز <span style="color: #D4AF37;">النور الرباني</span></h2>
                        <p>السلام عليكم ورحمة الله وبركاته <strong>${fullName}</strong>،</p>
                        <p>تم تسجيل حسابك بنجاح في مركز النور الرباني والنفس الرحماني.</p>
                        <p>يمكنك الآن:</p>
                        <ul>
                            <li>📖 قراءة المقالات الروحية</li>
                            <li>💭 تفسير الرؤى والأحلام</li>
                            <li>📿 الاشتراك في برامج التحصين</li>
                            <li>📩 استقبال الأذكار والأوراد الخاصة بك</li>
                        </ul>
                        <p style="margin-top: 20px; text-align: center; color: #555;">نسأل الله أن يبارك فيك ويسدد خطاك.</p>
                    </div>
                `
            });
        } catch (e) {
            console.error('فشل إرسال بريد الترحيب:', e.message);
        }

        // إنشاء رمز JWT للمستخدم
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, fullName: newUser.fullName },
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
                createdAt: newUser.createdAt
            }
        });
    }
);

// ==============================================
// 2. تسجيل الدخول
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

        const token = jwt.sign(
            { id: user.id, email: user.email, fullName: user.fullName },
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
                createdAt: user.createdAt
            }
        });
    }
);

// ==============================================
// 3. التحقق من صحة الرمز (للحفاظ على الجلسة)
// ==============================================
router.post('/verify', (req, res) => {
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
        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (e) {
        res.status(401).json({ error: 'رمز غير صالح' });
    }
});

module.exports = router;
