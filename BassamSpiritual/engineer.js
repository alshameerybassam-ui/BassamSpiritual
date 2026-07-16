// engineer.js – الخبير الأمني والمهندس والمساعد الذكي
const fs = require('fs');
const path = require('path');
const os = require('os');

// =============================================
// أدوات مساعدة
// =============================================
function getSystemReport() {
    const publicPath = path.join(__dirname, 'public');
    let files = [];
    try { files = fs.readdirSync(publicPath); } catch (e) {}
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const uptime = process.uptime().toFixed(0);
    return `📊 **تقرير حالة النظام**\n\n- 📁 ملفات الواجهة: ${files.length} ملف\n- 🧠 الذاكرة: ${memory} MB\n- ⏱️ وقت التشغيل: ${uptime} ثانية\n- 🖥️ النظام: ${os.platform()} ${os.arch()}`;
}

function getTodayDateStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// --- دوال أمنية جديدة ---
async function lookupIP(ip) {
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,query`);
        const data = await response.json();
        if (data.status === 'success') {
            return `🌍 **معلومات IP:** \`${data.query}\`\n- 🏳️ البلد: ${data.country}\n- 🏙️ المنطقة: ${data.regionName}\n- 📍 المدينة: ${data.city}\n- 📡 مزود الخدمة: ${data.isp}`;
        } else {
            return `❌ فشل جلب معلومات IP: ${data.message}`;
        }
    } catch (e) {
        return `❌ خطأ في الاتصال بخدمة فحص IP: ${e.message}`;
    }
}

// =============================================
// 1. المهندس الداخلي (خبير أمني + تطوير)
// =============================================
const SiteEngineer = {
    name: 'المهندس الداخلي (النور الأسود)',
    help: `🔧 **المهندس الداخلي – تطوير وأمان**\n\n🛡️ **أوامر أمنية (جديد):**\n• \`تحقق من IP [العنوان]\` – جلب معلومات عن أي عنوان IP.\n• \`تقرير أمني\` – عرض ملخص أمني سريع.\n\n📝 **أوامر الملفات:**\n• \`تعديل ملف [الاسم] إلى [المحتوى]\` – تعديل أي ملف.\n• \`إنشاء صفحة [الاسم]\` – إنشاء صفحة جديدة.\n\n⚙️ **أوامر الخادم:**\n• \`إعادة تشغيل\` – إعادة تشغيل الخادم.\n• \`تقرير\` – عرض حالة النظام.\n• \`سجل الأخطاء\` – عرض آخر الأخطاء.\n\n💡 اكتب \`مساعدة المهندس\` لرؤية هذه القائمة.`,

    async execute(command, db = null) {
        const cmd = command.trim();
        const lowerCmd = cmd.toLowerCase();
        const reply = (msg) => `🔧 **المهندس الداخلي:** ${msg}`;

        // --- أمر فحص IP (جديد) ---
        if (lowerCmd.startsWith('تحقق من ip') || lowerCmd.startsWith('فحص ip') || lowerCmd.startsWith('ip lookup')) {
            const parts = cmd.match(/ip\s+([\d.]+)/i);
            if (!parts) return reply('⚠️ صيغة الأمر: `تحقق من IP [العنوان]`');
            const info = await lookupIP(parts[1]);
            return reply(info);
        }
        // --- أمر تقرير أمني (جديد) ---
        else if (lowerCmd.includes('تقرير أمني') || lowerCmd.includes('security report')) {
            if (!db || !db.getSecurityReport) return reply('❌ لا يمكنني الوصول إلى قاعدة البيانات.');
            try {
                const report = await db.getSecurityReport();
                return reply(`🛡️ **التقرير الأمني**\n\n• محاولات دخول فاشلة (آخر 24 ساعة): ${report.failedLogins}\n• عناوين IP محظورة حالياً: ${report.blockedIPs}`);
            } catch (e) { return reply(`❌ خطأ: ${e.message}`); }
        }
        // --- باقي أوامر الملفات والخادم (تعديل، إنشاء، إعادة تشغيل، سجل أخطاء، تقرير) ---
        // (هنا تأتي الأكواد السابقة لأوامر تعديل ملف، إنشاء صفحة، إعادة تشغيل، سجل أخطاء، تقرير... إلخ)
        // ... سنضعها كما هي في النسخة السابقة ...
        else if (lowerCmd.includes('تعديل ملف') || lowerCmd.includes('تعديل الملف')) { /* ... كود تعديل الملف ... */ }
        else if (lowerCmd.includes('أنشئ صفحة') || lowerCmd.includes('انشاء صفحة')) { /* ... كود إنشاء صفحة ... */ }
        else if (lowerCmd.includes('إعادة تشغيل') || lowerCmd.includes('ريحني')) { /* ... كود إعادة تشغيل ... */ }
        else if (lowerCmd.includes('سجل الأخطاء') || lowerCmd.includes('اخطاء')) { /* ... كود سجل الأخطاء ... */ }
        else if (lowerCmd.includes('تقرير') || lowerCmd.includes('حالة') || lowerCmd.includes('status')) { return reply(getSystemReport()); }
        else if (lowerCmd.includes('مساعدة المهندس') || lowerCmd.includes('اوامر المهندس')) { return reply(this.help); }
        else { return reply('🤔 لم أفهم. اكتب `مساعدة المهندس` لرؤية الأوامر المتاحة.'); }
    }
};

// =============================================
// 2. المساعد الذكي (للأتمتة) – كما هو في النسخة السابقة
// =============================================
const AutomationAgent = {
    name: 'المساعد الذكي للأتمتة',
    help: `🤖 **المساعد الذكي – أتمتة المهام**\n\n🗄️ **أوامر البيانات:**\n• \`لخص طلبات اليوم\`\n• \`لخص طلبات الأسبوع\`\n• \`نظف الطلبات المرفوضة\`\n• \`إحصائيات سريعة\`\n\n🔐 **أوامر الإدارة:**\n• \`تغيير كلمة المرور [البريد] إلى [الجديدة]\`\n• \`ترقية مستخدم [البريد] إلى مدير\`\n\n💾 **أوامر النسخ:**\n• \`نسخة احتياطية\`\n\n💡 اكتب \`مساعدة المساعد\` لرؤية هذه القائمة.`,

    async execute(command, db) {
        const cmd = command.trim();
        const lowerCmd = cmd.toLowerCase();
        const reply = (msg) => `🤖 **المساعد الذكي:** ${msg}`;

        // --- جميع أوامر المساعد الذكي كما في النسخة السابقة ---
        // (تلخيص طلبات اليوم، الأسبوع، تنظيف المرفوضة، إحصائيات، نسخ احتياطي، تغيير كلمة مرور، ترقية مستخدم)
        if ((lowerCmd.includes('لخص') || lowerCmd.includes('ملخص')) && (lowerCmd.includes('اليوم') || lowerCmd.includes('يوم'))) { /* ... */ }
        else if ((lowerCmd.includes('لخص') || lowerCmd.includes('ملخص')) && (lowerCmd.includes('أسبوع') || lowerCmd.includes('اسبوع'))) { /* ... */ }
        else if ((lowerCmd.includes('نظف') || lowerCmd.includes('حذف')) && lowerCmd.includes('مرفوض')) { /* ... */ }
        else if (lowerCmd.includes('إحصائيات') || lowerCmd.includes('احصائيات') || lowerCmd.includes('stats')) { /* ... */ }
        else if (lowerCmd.includes('نسخة احتياطية') || lowerCmd.includes('backup')) { /* ... */ }
        else if (lowerCmd.includes('تغيير كلمة المرور') || lowerCmd.includes('غير كلمة المرور')) { /* ... */ }
        else if ((lowerCmd.includes('ترقية') || lowerCmd.includes('رفع')) && (lowerCmd.includes('مدير') || lowerCmd.includes('admin'))) { /* ... */ }
        else if (lowerCmd.includes('مساعدة المساعد') || lowerCmd.includes('اوامر المساعد')) { return reply(this.help); }
        else { return reply('🤔 لم أفهم. اكتب `مساعدة المساعد` لرؤية الأوامر.'); }
    }
};

// =============================================
// دالة التوجيه الذكي
// =============================================
function getAgent(command) {
    const lowerCmd = command.toLowerCase();
    // أوامر المساعد الذكي (الأتمتة والبيانات)
    if ((lowerCmd.includes('لخص') || lowerCmd.includes('ملخص') || lowerCmd.includes('طلبات') || lowerCmd.includes('اليوم') || lowerCmd.includes('أسبوع')) ||
        (lowerCmd.includes('نظف') || lowerCmd.includes('حذف') && lowerCmd.includes('مرفوض')) ||
        (lowerCmd.includes('نسخة احتياطية') || lowerCmd.includes('backup')) ||
        (lowerCmd.includes('تغيير كلمة المرور') || lowerCmd.includes('غير كلمة المرور') || lowerCmd.includes('تغيير الباسورد')) ||
        (lowerCmd.includes('ترقية') || lowerCmd.includes('رفع')) ||
        (lowerCmd.includes('إحصائيات') || lowerCmd.includes('احصائيات') || lowerCmd.includes('stats')) ||
        (lowerCmd.includes('مساعدة المساعد'))) {
        return AutomationAgent;
    }
    // افتراضياً: المهندس الداخلي
    return SiteEngineer;
}

module.exports = { AutomationAgent, SiteEngineer, getAgent };
