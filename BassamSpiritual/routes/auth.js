const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// التأكد من تهيئة ملف الحسابات
if (!fs.existsSync(path.dirname(USERS_FILE))) fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
fs.ensureFileSync(USERS_FILE);
if (fs.readFileSync(USERS_FILE).length === 0) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));

const readUsers = () => {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
};
const writeUsers = (data) => fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');

// مسار التسجيل (Register)
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'بيانات غير صالحة', details: errors.array() });

    let { fullName, name, email, phone, password } = req.body;
    const finalName = fullName || name || "مستفيد جديد";

    const users = readUsers();
    if (users.find(u => u.email === email)) return res.status(409).json({ success: false, error: 'البريد مسجل مسبقاً' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now(),
        fullName: finalName,
        email,
        phone: phone || '',
        password: hashedPassword,
        role: 'user',
        createdAt: new Date().toISOString(),
        isActive: true,
        spiritualProfile: { notifications: [], articles: [], ruqya: [], dailyWirds: [] },
        requests: [],
        paymentHistory: []
    };

    users.push(newUser);
    writeUsers(users);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ success: true, token, user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email, role: newUser.role } });
});

// مسار تسجيل الدخول (Login)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, error: 'البريد أو كلمة المرور غير صحيحة' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, error: 'الحساب غير نشط' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
});

// مسار التحقق المتوافق (Verify)
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'الرمز مفقود' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = readUsers().find(u => u.id === decoded.id);
        if (!user || !user.isActive) return res.status(401).json({ success: false });
        res.json({ success: true, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role || 'user' } });
    } catch { res.status(401).json({ success: false }); }
});

module.exports = router;
