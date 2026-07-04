const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const CHAT_HISTORY_FILE = path.join(__dirname, '../data/chat_history.json');
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// التأكد من وجود الملفات
fs.ensureFileSync(CHAT_HISTORY_FILE);
if (!fs.existsSync(CHAT_HISTORY_FILE) || fs.readFileSync(CHAT_HISTORY_FILE).length === 0) {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([]));
}

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE));
const readChatHistory = () => JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE));
const writeChatHistory = (data) => fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(data, null, 2));

// الوسيط: التحقق من صحة المستخدم
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === decoded.id);
        if (!user || !user.isActive) return res.status(401).json({ error: 'الحساب غير نشط' });
        req.user = user;
        req.userId = decoded.id;
        next();
    } catch (e) {
        res.status(401).json({ error: 'رمز غير صالح' });
    }
};

// دالة الاتصال بـ Gemini مع نظام السياقات (مع سجلات تصحيح)
async function callGeminiAPI(userMessage, userFullName, userEmail, history) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ مفتاح Gemini API غير موجود في متغيرات البيئة');
        throw new Error('مفتاح Gemini غير موجود');
    }
    console.log('✅ تم العثور على مفتاح Gemini API (يبدأ بـ: ' + apiKey.substring(0, 10) + '...)');

    const systemPrompt = `أنت مستشار روحاني إسلامي متخصص في المنهج الصوفي الروحاني، وتمثل "مركز النور الرباني" بإدارة الشيخ بسام الشميري.

التزاماتك:
1- الاشادة بالمركز وإدارته.
2- كسر حاجز الخوف والتردد، وطمأنة المستخدم.
3- تشجيع المستخدم على تقديم طلب إذا احتاج استشارة معمقة.
4- الردود بلغة عربية فصحى، هادئة، ومليئة بالرحمة.
5- لا تفتي في أمور حرام، وأحِل الأسئلة الصعبة للشيخ بسام.

المستخدم: ${userFullName}`;

    const requestBody = {
        contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...history.slice(-10).flatMap(h => [
                { role: 'user', parts: [{ text: h.message }] },
                { role: 'model', parts: [{ text: h.reply }] }
            ]),
            { role: 'user', parts: [{ text: userMessage }] }
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    };

    try {
        console.log('📤 جاري إرسال الطلب إلى Gemini API...');
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            requestBody,
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('📥 تم استلام الرد من Gemini API بنجاح.');
        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع فهم سؤالك.';
    } catch (error) {
        console.error('❌ فشل الاتصال بـ Gemini API:');
        if (error.response) {
            console.error('📌 رمز الحالة:', error.response.status);
            console.error('📌 بيانات الخطأ:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('📌 لم يتم استلام رد من الخادم (Network Error)');
        } else {
            console.error('📌 خطأ في إعداد الطلب:', error.message);
        }
        throw error;
    }
}

// ==============================================
// 1. إرسال رسالة إلى المساعد الذكي
// ==============================================
router.post('/send', authenticate, async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim().length < 2) {
        return res.status(400).json({ error: 'الرسالة قصيرة جداً' });
    }

    const userId = req.userId;
    const user = req.user;
    const history = readChatHistory();
    const userHistory = history.filter(h => h.userId === userId);
    const freeMessagesCount = userHistory.length;
    const FREE_LIMIT = 50;

    if (freeMessagesCount >= FREE_LIMIT) {
        return res.status(403).json({
            error: `انتهت رسائلك المجانية (${FREE_LIMIT} رسالة). يرجى التواصل مع الشيخ مباشرة.`,
            requiresPayment: true
        });
    }

    try {
        const reply = await callGeminiAPI(message, user.fullName, user.email, userHistory);
        history.push({ userId, message, reply, date: new Date().toISOString() });
        writeChatHistory(history);

        res.json({
            success: true,
            reply,
            freeMessagesUsed: freeMessagesCount + 1,
            freeMessagesLimit: FREE_LIMIT
        });
    } catch (error) {
        console.error('❌ فشل الاتصال بـ Gemini:', error.message);
        const fallbackReply = `🌙 السلام عليكم ${user.fullName}،

أشكرك على سؤالك. واجهت صعوبة تقنية في الاتصال بالخادم.

سأنقل استفسارك إلى الشيخ بسام مباشرة، وسيتواصل معك قريباً.

نسأل الله لك الشفاء. 🙏`;
        res.json({ success: true, reply: fallbackReply, isFallback: true });
    }
});

// ==============================================
// 2. جلب تاريخ المحادثة للمستخدم
// ==============================================
router.get('/history', authenticate, (req, res) => {
    const userId = req.userId;
    const history = readChatHistory();
    const userHistory = history.filter(h => h.userId === userId);
    const FREE_LIMIT = 50;
    res.json({
        success: true,
        history: userHistory,
        count: userHistory.length,
        freeMessagesLimit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - userHistory.length)
    });
});

// ==============================================
// 3. جلب عدد الرسائل المتبقية
// ==============================================
router.get('/credits', authenticate, (req, res) => {
    const userId = req.userId;
    const history = readChatHistory();
    const userHistory = history.filter(h => h.userId === userId);
    const usedMessages = userHistory.length;
    const FREE_LIMIT = 50;

    res.json({
        success: true,
        usedMessages: usedMessages,
        freeLimit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - usedMessages)
    });
});

module.exports = router;
