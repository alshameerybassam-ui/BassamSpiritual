const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');

const CHAT_HISTORY_FILE = path.join(__dirname, '../data/chat_history.json');
const JWT_SECRET = process.env.JWT_SECRET || 'bassam_spiritual_secret_key_2026';

// التأكد من وجود الملفات وإنشائها بشكل سليم
fs.ensureFileSync(CHAT_HISTORY_FILE);
if (!fs.existsSync(CHAT_HISTORY_FILE) || fs.readFileSync(CHAT_HISTORY_FILE).length === 0) {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([]));
}

const readChatHistory = () => JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE));
const writeChatHistory = (data) => fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(data, null, 2));

// ==============================================
// 🛡️ الوسيط السحابي الموحد: التحقق من صحة المستخدم
// ==============================================
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'غير مصرح، رمز الجلسة مفقود' });
    
    const pool = req.app.get('db');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // جلب بيانات الحساب سحابياً لضمان التوافق مع auth.js و requests.js
        const result = await pool.query('SELECT id, full_name, email, role FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'الحساب غير موجود أو تم حظره مسبقاً.' });
        }

        req.user = result.rows[0];
        req.userId = decoded.id;
        next();
    } catch (e) {
        res.status(401).json({ error: 'رمز غير صالح أو منتهي الصلاحية' });
    }
};

// ==============================================
// دالة الاتصال بـ Gemini المعالجة والمؤمنة هيكلياً
// ==============================================
async function callGeminiAPI(userMessage, userFullName, userEmail, history) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ مفتاح Gemini API غير موجود في متغيرات البيئة');
        throw new Error('مفتاح Gemini غير موجود');
    }
    console.log('✅ تم التحقق من مفتاح Gemini API بنجاح.');

    // 1. صياغة التوجيه الصارم للنظام في حقل مستقل
    const systemPrompt = `أنت مستشار روحاني إسلامي متخصص في المنهج الصوفي الروحاني، وتمثل "مركز النور الرباني" بإدارة الشيخ بسام الشميري.

التزاماتك الصارمة:
1- الإشادة الدائمة بالمركز وحكمة إدارته المتمثلة بالشيخ بسام الشميري.
2- كسر حاجز الخوف والتردد الروحي لدى الشخص، وطمأنة المستخدم وبث السكينة في قلبه.
3- تشجيع المستخدم بلطف على تقديم طلب رسمي عبر لوحة التحكم إذا احتاج كشفاً أو استشارة معمقة وخطة علاجية مكثفة.
4- الردود حصراً بلغة عربية فصحى، هادئة، رصينة، ومليئة بالرحمة والأمل.
5- لا تفتي في أمور الحلال والحرام الفقهية الشائكة، وأحِل الأسئلة الروحية المستعصية مباشرة للشيخ بسام الشميري.

اسم المستفتي أو المستخدم الحالي للتخاطب معه: ${userFullName}`;

    // 2. بناء مصفوفة السجل مع تصفية وتجنب تكرار الأدوار (Role Alternation)
    const contents = [];
    
    // سحب آخر 10 رسائل فقط لضمان سرعة الاستجابة وعدم استهلاك التوكنز
    const recentHistory = history.slice(-10);
    recentHistory.forEach(h => {
        contents.push({ role: 'user', parts: [{ text: h.message }] });
        contents.push({ role: 'model', parts: [{ text: h.reply }] });
    });

    // إضافة الرسالة الحالية للمستفيد في نهاية المصفوفة بشكل شرعي
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    // 3. هيكلة الجسم البرمجي المتوافق مع تحديثات جوجل لعام 2026
    const requestBody = {
        contents: contents,
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: { 
            temperature: 0.6, // خفض الحرارة لضمان اتزان الردود الروحانية وعدم التأليف
            maxOutputTokens: 1000 
        }
    };

    try {
        console.log('📤 جاري إرسال الطلب الهيكلي إلى خوادم Gemini API...');
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            requestBody,
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('📥 تم استلام الرد الإرشادي بنجاح.');
        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع فهم سؤالك بالشكل الصحيح.';
    } catch (error) {
        console.error('❌ فشل الاتصال بـ Gemini API:');
        if (error.response) {
            console.error('📌 رمز الحالة:', error.response.status);
            console.error('📌 تفاصيل الخطأ الصادر من خادم جوجل:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('📌 خطأ اتصال أو إعداد:', error.message);
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
        return res.status(400).json({ error: 'الرسالة المرسلة قصيرة جداً' });
    }

    const userId = req.userId;
    const user = req.user;
    const history = readChatHistory();
    const userHistory = history.filter(h => h.userId === userId);
    const freeMessagesCount = userHistory.length;
    const FREE_LIMIT = 50;

    if (freeMessagesCount >= FREE_LIMIT) {
        return res.status(403).json({
            error: `انتهت رسائلك الاسترشادية المجانية المتاحة (${FREE_LIMIT} رسالة). يرجى تقديم طلب رسمي عبر اللوحة للتواصل مع الشيخ مباشرة.`,
            requiresPayment: true
        });
    }

    try {
        const reply = await callGeminiAPI(message, user.full_name || user.fullName, user.email, userHistory);
        
        // حفظ الرسالة الجديدة في السجل التاريخي
        history.push({ userId, message, reply, date: new Date().toISOString() });
        writeChatHistory(history);

        res.json({
            success: true,
            reply,
            freeMessagesUsed: freeMessagesCount + 1,
            freeMessagesLimit: FREE_LIMIT
        });
    } catch (error) {
        console.error('❌ فشل الاتصال بـ Gemini - تفعيل نظام الرد البديل الآمن:', error.message);
        const fallbackReply = `🌙 السلام عليكم ورحمة الله وبركاته يا ${user.full_name || user.fullName || "مستفيد النور"}،

أشكرك على ثقتك وتواصلك مع مركزنا. نواجه حالياً ضغطاً تقنياً مؤقتاً في معالجة البيانات الفورية.

لضمان نيل الرعاية الروحية المناسبة، نقترح عليك التوجه مباشرة إلى قسم "تقديم طلب جديد" في لوحتك ليتسنى للشيخ بسام الشميري دراسة حالتك بنفسه وإعطائك الكشف الشافي.

حفظك الله ورعاك من كل سوء. 🙏`;
        res.json({ success: true, reply: fallbackReply, isFallback: true });
    }
});

// ==============================================
// 2. جلب تاريخ المحادثة للمستفيد
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
// 3. جلب عدد الرسائل والائتمان المتبقي للعميل
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
