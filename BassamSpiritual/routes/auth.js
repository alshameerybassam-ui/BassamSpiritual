const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// مسار التسجيل السحابي (Register)
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'بيانات غير صالحة', details: errors.array() });

    let { fullName, name, email, password } = req.body;
    const finalName = fullName || name || "مستفيد جديد";
    
    // جلب اتصال قاعدة البيانات المشترك من السيرفر الرئيسي
    const pool = req.app.get('db');

    try {
        // 1. التحقق من عدم تكرار البريد الإلكتروني في السيرفر السحابي
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'البريد مسجل مسبقاً' });
        }

        // 2. تشفير كلمة المرور بأمان
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. إدخال الحساب الجديد لقاعدة البيانات
        const result = await pool.query(
            'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
            [finalName, email, hashedPassword, 'user']
        );

        const newUser = result.rows[0];

        // 4. إنشاء الرمز التلقائي (Token) للمستفيد
        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
        
        res.status(201).json({ 
            success: true, 
            token, 
            user: { id: newUser.id, fullName: newUser.full_name, email: newUser.email, role: newUser.role } 
        });

    } catch (err) {
        console.error('خطأ أثناء التسجيل السحابي:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ في النظام السحابي أثناء إنتاج الحساب' });
    }
});

// مسار تسجيل الدخول السحابي (Login)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const pool = req.app.get('db');

    try {
        // 1. البحث عن المستخدم بالبريد
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'البريد أو كلمة المرور غير صحيحة' });
        }

        const user = result.rows[0];

        // 2. مطابقة كلمة المرور المشفرة
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'البريد أو كلمة المرور غير صحيحة' });
        }

        // 3. إصدار الرمز الجديد المحدث
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        
        res.json({ 
            success: true, 
            token, 
            user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } 
        });

    } catch (err) {
        console.error('خطأ أثناء تسجيل الدخول السحابي:', err.message);
        res.status(500).json({ success: false, error: 'حدث خطأ في السيرفر أثناء تسجيل الدخول' });
    }
});

// مسار التحقق المتوافق السحابي (Verify)
router.get('/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'الرمز مفقود' });
    
    const pool = req.app.get('db');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // جلب بيانات الحساب من السحاب للتأكد من صلاحيته الحالية والترقيات
        const result = await pool.query('SELECT id, full_name, email, role FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) return res.status(401).json({ success: false });

        const user = result.rows[0];
        res.json({ 
            success: true, 
            user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } 
        });
        
    } catch { 
        res.status(401).json({ success: false }); 
    }
});

module.exports = router;
