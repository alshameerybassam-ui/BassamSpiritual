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
// دالة مساعدة للاتصال بـ Gemini API
// ==============================================
async function callGeminiAPI(userMessage, userFullName, userEmail, history) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('مفتاح Gemini API غير موجود. يرجى إضافته في متغيرات البيئة.');
    }

    // بناء السياق (System Prompt) بالطريقة التي يدعمها Gemini
    const systemPrompt = `أنت مستشار روحاني إسلامي متخصص في المنهج الصوفي الروحاني، وتمثل "مركز النور الرباني والنفس الرحماني" بإدارة الشيخ بسام الشميري (آل الكدهي).

التزاماتك تجاه المركز والمستخدم:
1- **الاشادة بالمركز وإدارته**: أشكر المستخدم على ثقته بمركز النور الرباني، واذكر أن المركز يضم كوادر مؤهلة (راوٍ شرعي، معالج روحاني، مستشار نفسي) وتحت إدارة الشيخ بسام الذي يمتلك خبرة طويلة في هذا المجال.
2- **كسر حاجز الخوف والتردد**: طمئن المستخدم بأن طلب المساعدة هو خطوة شجاعة نحو الشفاء، وأن المركز يضم آلاف الحالات الناجحة. ذكرهم بأن السرية التامة مكفولة، وأنهم في ملاذ آمن.
3- **تشجيع تقديم الطلب**: شجع المستخدم بلطف على الضغط على زر "قدم طلبك الآن" إذا شعر بأنه بحاجة إلى استشارة معمقة أو علاج مباشر من الشيخ بسام، مؤكداً أن الإدارة تنتظر خدمتهم بفارغ الصبر.
4- **الردود الروحية**: تلتزم بالمنهج الإسلامي الوسطي، وتذكر الله، وتشجع على الذكر والعبادة، مع الحفاظ على أسلوب هادئ ومليء بالرحمة والحكمة.
5- **الحدود الشرعية**: لا تفتي في أمور حرام، وإذا سُئلت عن أمر لا تعرفه، قل بصدق: "هذا السؤال يحتاج إلى توجيه مباشر من الشيخ بسام، وسأنقل استفسارك إليه."
6- **التخصيص**: خاطب المستخدم باسمه (${userFullName}) لجعل الحوار شخصياً ومطمئناً.

تذكر دائماً: أنت سفير رقمي للمركز، هدفك الأول هو زرع الطمأنينة في قلب المستخدم وتوجيهه نحو الخير والشفاء.`;

المستخدم الحالي: ${userFullName}
بريده: ${userEmail}`;

    // بناء تاريخ المحادثة (آخر 10 رسائل)
    let conversationHistory = history.slice(-10).flatMap(h => [
        { role: 'user', parts: [{ text: h.message }] },
        { role: 'model', parts: [{ text: h.reply }] }
    ]);

    // بناء الطلب النهائي لـ Gemini
    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [{ text: systemPrompt }]
            },
            ...conversationHistory,
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.9
        }
    };

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            requestBody,
            { headers: { 'Content-Type': 'application/json' } }
        );

        // استخراج النص من رد Gemini
        const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع فهم سؤالك. هل يمكنك إعادة صياغته؟';
        return reply;
    } catch (error) {
        console.error('❌ خطأ في Gemini API:', error.response?.data || error.message);
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

    // حساب عدد رسائل المستخدم
    const history = readChatHistory();
    const userHistory = history.filter(h => h.userId === userId);
    const freeMessagesCount = userHistory.length;

    const FREE_LIMIT = 50; // تم تعديلها إلى 50 رسالة مجانية

    if (freeMessagesCount >= FREE_LIMIT) {
        return res.status(403).json({
            error: `لقد استهلكت جميع رسائلك المجانية (${FREE_LIMIT} رسالة). يرجى التواصل مع الشيخ بسام مباشرة عبر نموذج الطلب.`,
            requiresPayment: true,
            freeMessagesUsed: freeMessagesCount,
            freeMessagesLimit: FREE_LIMIT
        });
    }

    try {
        // الاتصال بـ Gemini API
        const reply = await callGeminiAPI(
            message,
            user.fullName,
            user.email,
            userHistory
        );

        // حفظ المحادثة
        history.push({
            userId: userId,
            message: message,
            reply: reply,
            date: new Date().toISOString(),
            provider: 'gemini'
        });
        writeChatHistory(history);

        res.json({
            success: true,
            reply: reply,
            freeMessagesUsed: freeMessagesCount + 1,
            freeMessagesLimit: FREE_LIMIT
        });

    } catch (error) {
        console.error('❌ فشل الاتصال بـ Gemini API:', error.message);

        // رد احتياطي عند فشل الاتصال
        const fallbackReply = `🌙 السلام عليكم ورحمة الله وبركاته يا ${user.fullName}،

أشكرك على سؤالك. لاحظت أن هناك صعوبة تقنية في الاتصال بالخادم في هذه اللحظة.

لكن لا تقلق، سأقوم بنقل استفسارك إلى الشيخ بسام مباشرة، وسيتواصل معك قريباً عبر البريد الإلكتروني أو واتساب.

يمكنك أيضاً التواصل مع الشيخ مباشرة عبر نموذج الطلب في الموقع.

نسأل الله لك التوفيق والسداد. 🙏`;

        history.push({
            userId: userId,
            message: message,
            reply: fallbackReply,
            date: new Date().toISOString(),
            isFallback: true,
            provider: 'fallback'
        });
        writeChatHistory(history);

        res.json({
            success: true,
            reply: fallbackReply,
            freeMessagesUsed: freeMessagesCount + 1,
            freeMessagesLimit: FREE_LIMIT,
            isFallback: true
        });
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
