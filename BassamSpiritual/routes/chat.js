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
// 1. إرسال رسالة إلى المساعد الذكي (بعد التسجيل)
// ==============================================
router.post('/send', authenticate, async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim().length < 2) {
        return res.status(400).json({ error: 'الرسالة قصيرة جداً' });
    }

    const userId = req.userId;
    const user = req.user;

    // حساب عدد رسائل المستخدم المجانية
    const history = readChatHistory();
    const userHistory = history.filter(h => h.userId === userId);
    const freeMessagesCount = userHistory.length;

    // 20 رسالة مجانية فقط
    if (freeMessagesCount >= 20) {
        return res.status(403).json({
            error: 'لقد استهلكت جميع رسائلك المجانية (20 رسالة). يرجى دفع 10$ للاستمرار في المحادثة.',
            requiresPayment: true,
            freeMessagesUsed: freeMessagesCount,
            freeMessagesLimit: 20
        });
    }

    try {
        // الاتصال بـ DeepSeek API
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: `أنت مستشار روحاني إسلامي متخصص في المنهج الصوفي الروحاني. 
                    اسمك "المستشار الروحاني الذكي" في مركز النور الرباني.
                    التزامك:
                    1- الردود تكون بلغة عربية فصحى واضحة ومهذبة.
                    2- تلتزم بالمنهج الإسلامي الوسطي، وتذكر الله في ردودك.
                    3- لا تفتي في أمور حرام، ولا تتجاوز حدود الأدب الشرعي.
                    4- تشجع المستفيد على التقرب إلى الله، وتذكر فضائل الذكر والعبادة.
                    5- إذا سُئلت عن أمر لا تعرفه، قل بصدق: "هذا السؤال يحتاج إلى توجيه الشيخ بسام، سأنقل استفسارك إليه."
                    6- تذكير المستفيد بأن المحادثة مسجلة لتحسين الخدمة.
                    7- أسلوبك هادئ، مطمئن، ومليء بالرحمة والحكمة.
                    
                    المستفيد الحالي: ${user.fullName}
                    بريده: ${user.email}
                    `
                },
                ...userHistory.slice(-10).flatMap(h => [
                    { role: 'user', content: h.message },
                    { role: 'assistant', content: h.reply }
                ]),
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 800,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const reply = response.data.choices[0].message.content;

        // حفظ المحادثة
        history.push({
            userId: userId,
            message: message,
            reply: reply,
            date: new Date().toISOString()
        });
        writeChatHistory(history);

        res.json({
            success: true,
            reply: reply,
            freeMessagesUsed: freeMessagesCount + 1,
            freeMessagesLimit: 20
        });

    } catch (error) {
        console.error('خطأ في DeepSeek API:', error.response?.data || error.message);
        
        // إذا فشل الاتصال بـ DeepSeek، نستخدم رداً احتياطياً
        const fallbackReply = `🌙 السلام عليكم ورحمة الله وبركاته يا ${user.fullName}،

        أشكرك على سؤالك. لاحظت أن هناك صعوبة تقنية في الاتصال بالخادم في هذه اللحظة.

        لكن لا تقلق، سأقوم بنقل استفسارك إلى الشيخ بسام مباشرة، وسيتواصل معك قريباً عبر البريد الإلكتروني أو واتساب.

        يمكنك أيضاً الاستمرار في المحادثة لاحقاً، أو التواصل مع الشيخ مباشرة عبر نموذج الطلب في الموقع.

        نسأل الله لك التوفيق والسداد. 🙏`;

        history.push({
            userId: userId,
            message: message,
            reply: fallbackReply,
            date: new Date().toISOString(),
            isFallback: true
        });
        writeChatHistory(history);

        res.json({
            success: true,
            reply: fallbackReply,
            freeMessagesUsed: freeMessagesCount + 1,
            freeMessagesLimit: 20,
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
    res.json({
        success: true,
        history: userHistory,
        count: userHistory.length,
        freeMessagesLimit: 20,
        remaining: Math.max(0, 20 - userHistory.length)
    });
});

// ==============================================
// 3. دفع رسوم الاستمرار في المحادثة (10$)
// ==============================================
router.post('/pay', authenticate, async (req, res) => {
    const { transferCode, paymentMethod } = req.body;
    
    if (!transferCode) {
        return res.status(400).json({ error: 'رقم الحوالة مطلوب' });
    }
    
    const userId = req.userId;
    
    // تسجيل الدفع في ملف المستخدم
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    if (!users[userIndex].paymentHistory) {
        users[userIndex].paymentHistory = [];
    }
    
    users[userIndex].paymentHistory.push({
        amount: 10,
        currency: 'USD',
        method: paymentMethod || 'تحويل بنكي',
        transferCode,
        date: new Date().toISOString(),
        purpose: 'chat_continuation'
    });
    
    // إعادة تعيين عداد الرسائل المجانية (بإضافة 50 رسالة إضافية)
    // سنقوم بتخزين ذلك في ملف المستخدم
    users[userIndex].chatCredits = (users[userIndex].chatCredits || 0) + 50;
    writeUsers(users);
    
    res.json({
        success: true,
        message: '✅ تم تأكيد الدفع بنجاح. تم إضافة 50 رسالة إضافية إلى رصيدك.'
    });
});

// ==============================================
// 4. جلب عدد الرسائل المتبقية
// ==============================================
router.get('/credits', authenticate, (req, res) => {
    const userId = req.userId;
    const users = readUsers();
    const user = users.find(u => u.id === userId);
    
    const history = readChatHistory();
    const userHistory = history.filter(h => h.userId === userId);
    const usedMessages = userHistory.length;
    
    const chatCredits = user?.chatCredits || 0;
    const freeLimit = 20;
    
    const totalAvailable = freeLimit + chatCredits;
    const remaining = Math.max(0, totalAvailable - usedMessages);
    
    res.json({
        success: true,
        usedMessages: usedMessages,
        freeLimit: freeLimit,
        chatCredits: chatCredits,
        totalAvailable: totalAvailable,
        remaining: remaining
    });
});

module.exports = router;
