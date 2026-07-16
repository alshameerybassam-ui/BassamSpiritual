// engineer.js – الخبير الأمني والمهندس والمساعد الذكي (بدون أمر ترقية)
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

// --- دوال أمنية ---
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
    help: `🔧 **المهندس الداخلي – تطوير وأمان**\n\n🛡️ **أوامر أمنية:**\n• \`تحقق من IP [العنوان]\` – جلب معلومات عن أي عنوان IP.\n• \`تقرير أمني\` – عرض ملخص أمني سريع.\n\n📝 **أوامر الملفات:**\n• \`تعديل ملف [الاسم] إلى [المحتوى]\` – تعديل أي ملف.\n• \`إنشاء صفحة [الاسم]\` – إنشاء صفحة جديدة.\n\n⚙️ **أوامر الخادم:**\n• \`إعادة تشغيل\` – إعادة تشغيل الخادم.\n• \`تقرير\` – عرض حالة النظام.\n• \`سجل الأخطاء\` – عرض آخر الأخطاء.\n\n💡 اكتب \`مساعدة المهندس\` لرؤية هذه القائمة.`,

    async execute(command, db = null) {
        const cmd = command.trim();
        const lowerCmd = cmd.toLowerCase();
        const reply = (msg) => `🔧 **المهندس الداخلي:** ${msg}`;

        // --- أمر فحص IP ---
        if (lowerCmd.startsWith('تحقق من ip') || lowerCmd.startsWith('فحص ip') || lowerCmd.startsWith('ip lookup')) {
            const parts = cmd.match(/ip\s+([\d.]+)/i);
            if (!parts) return reply('⚠️ صيغة الأمر: `تحقق من IP [العنوان]`');
            const info = await lookupIP(parts[1]);
            return reply(info);
        }
        // --- أمر تقرير أمني ---
        else if (lowerCmd.includes('تقرير أمني') || lowerCmd.includes('security report')) {
            if (!db || !db.getSecurityReport) return reply('❌ لا يمكنني الوصول إلى قاعدة البيانات.');
            try {
                const report = await db.getSecurityReport();
                return reply(`🛡️ **التقرير الأمني**\n\n• محاولات دخول فاشلة (آخر 24 ساعة): ${report.failedLogins}\n• عناوين IP محظورة حالياً: ${report.blockedIPs}`);
            } catch (e) { return reply(`❌ خطأ: ${e.message}`); }
        }
        // --- تعديل ملف ---
        else if (lowerCmd.includes('تعديل ملف') || lowerCmd.includes('تعديل الملف') || lowerCmd.includes('edit file')) {
            const match = cmd.match(/(?:ملف|الملف)\s+([\w./-]+\.\w+)\s+(?:إلى|to)\s+([\s\S]+)/i);
            if (!match) return reply('⚠️ صيغة الأمر: `تعديل ملف [اسم الملف] إلى [المحتوى الجديد]`');
            const fullPath = path.join(__dirname, 'public', match[1]);
            if (fs.existsSync(fullPath)) { fs.writeFileSync(fullPath, match[2].trim(), 'utf8'); return reply(`✅ تم تعديل \`${match[1]}\` بنجاح.`); }
            else { return reply(`❌ الملف \`${match[1]}\` غير موجود.`); }
        }
        // --- إنشاء صفحة ---
        else if (lowerCmd.includes('أنشئ صفحة') || lowerCmd.includes('انشاء صفحة') || lowerCmd.includes('new page')) {
            const match = cmd.match(/(?:صفحة|page)\s+([\w./-]+)/i);
            if (!match) return reply('⚠️ صيغة الأمر: `إنشاء صفحة [اسم الصفحة]`');
            const pageName = match[1].replace(/\.html$/i, '');
            const fullPath = path.join(__dirname, 'public', `${pageName}.html`);
            const template = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${pageName} | مركز النور الرباني</title><link rel="stylesheet" href="style.css"></head><body><div class="container"><h1>${pageName}</h1><p>تم إنشاء هذه الصفحة بواسطة المهندس الداخلي.</p><a href="/">العودة للرئيسية</a></div></body></html>`;
            fs.writeFileSync(fullPath, template, 'utf8'); return reply(`✅ تم إنشاء \`${pageName}.html\` بنجاح.`);
        }
        // --- إعادة تشغيل ---
        else if (lowerCmd.includes('إعادة تشغيل') || lowerCmd.includes('اعادة تشغيل') || lowerCmd.includes('ريستارت') || lowerCmd.includes('restart') || lowerCmd.includes('ريحني') || lowerCmd.includes('معلق')) {
            setTimeout(() => process.exit(0), 1500); return reply('🔄 جاري إعادة تشغيل الخادم... سيتم التطبيق خلال ثوانٍ.');
        }
        // --- سجل الأخطاء ---
        else if (lowerCmd.includes('سجل الأخطاء') || lowerCmd.includes('اخطاء') || lowerCmd.includes('errors') || lowerCmd.includes('مشاكل')) {
            const logFile = path.join(__dirname, 'error.log');
            if (fs.existsSync(logFile)) {
                const logs = fs.readFileSync(logFile, 'utf8');
                if (logs.trim() === '') return reply('✅ سجل الأخطاء فارغ. لا توجد أخطاء مسجلة حالياً.');
                const lines = logs.trim().split('\n'); return reply(`📋 **آخر الأخطاء المسجلة:**\n\`\`\`\n${lines.slice(-20).join('\n')}\n\`\`\``);
            } else { return reply('ℹ️ لا يوجد ملف سجل أخطاء حالياً.'); }
        }
        // --- تنظيف سجل الأخطاء ---
        else if (lowerCmd.includes('تنظيف السجلات') || lowerCmd.includes('حذف السجلات') || lowerCmd.includes('clear logs')) {
            const logFile = path.join(__dirname, 'error.log');
            if (fs.existsSync(logFile)) { fs.unlinkSync(logFile); return reply('✅ تم حذف ملف سجل الأخطاء بنجاح.'); }
            else { return reply('ℹ️ لا يوجد ملف سجل أخطاء لحذفه.'); }
        }
        // --- تقرير ---
        else if (lowerCmd.includes('تقرير') || lowerCmd.includes('حالة') || lowerCmd.includes('status')) {
            return reply(getSystemReport());
        }
        // --- مساعدة ---
        else if (lowerCmd.includes('مساعدة المهندس') || lowerCmd.includes('اوامر المهندس')) {
            return reply(this.help);
        }
        else { return reply('🤔 لم أفهم الأمر. اكتب `مساعدة المهندس` لرؤية الأوامر المتاحة.'); }
    }
};

// =============================================
// 2. المساعد الذكي (للأتمتة) – بدون أمر ترقية
// =============================================
const AutomationAgent = {
    name: 'المساعد الذكي للأتمتة',
    help: `🤖 **المساعد الذكي – أتمتة المهام**\n\n🗄️ **أوامر البيانات:**\n• \`لخص طلبات اليوم\` – عرض ملخص الطلبات الجديدة.\n• \`لخص طلبات الأسبوع\` – عرض ملخص طلبات آخر 7 أيام.\n• \`نظف الطلبات المرفوضة\` – حذف جميع الطلبات المرفوضة.\n• \`إحصائيات سريعة\` – عرض أعداد الطلبات حسب الحالة.\n\n🔐 **أوامر الإدارة:**\n• \`تغيير كلمة المرور [البريد] إلى [الجديدة]\` – تغيير كلمة مرور أي مستخدم.\n\n💾 **أوامر النسخ الاحتياطي:**\n• \`نسخة احتياطية\` – إنشاء نسخة احتياطية من قاعدة البيانات.\n\n💡 اكتب \`مساعدة المساعد\` لرؤية هذه القائمة.`,

    async execute(command, db) {
        const cmd = command.trim();
        const lowerCmd = cmd.toLowerCase();
        const reply = (msg) => `🤖 **المساعد الذكي:** ${msg}`;

        // --- تلخيص طلبات اليوم ---
        if ((lowerCmd.includes('لخص') || lowerCmd.includes('ملخص')) && (lowerCmd.includes('اليوم') || lowerCmd.includes('يوم'))) {
            if (!db || !db.getDailyRequests) return reply('❌ لا يمكنني الوصول إلى قاعدة البيانات.');
            try {
                const today = getTodayDateStr();
                const requests = await db.getDailyRequests(today);
                if (requests.length === 0) return reply('📭 لا توجد طلبات جديدة اليوم.');
                let response = `📋 **ملخص طلبات اليوم (${today})**\n\n📊 إجمالي الطلبات الجديدة: ${requests.length}\n\n`;
                requests.forEach((r, i) => { response += `**#${i+1}** ${r.fullName} — ${r.serviceType} [${r.status}]\n`; });
                return reply(response);
            } catch (e) { return reply(`❌ خطأ: ${e.message}`); }
        }
        // --- تلخيص طلبات الأسبوع ---
        else if ((lowerCmd.includes('لخص') || lowerCmd.includes('ملخص')) && (lowerCmd.includes('أسبوع') || lowerCmd.includes('اسبوع'))) {
            if (!db || !db.getWeeklyRequests) return reply('❌ لا يمكنني الوصول إلى قاعدة البيانات.');
            try {
                const requests = await db.getWeeklyRequests();
                if (requests.length === 0) return reply('📭 لا توجد طلبات هذا الأسبوع.');
                let response = `📋 **ملخص طلبات آخر 7 أيام**\n\n📊 إجمالي الطلبات: ${requests.length}\n\n`;
                requests.forEach((r, i) => { response += `**#${i+1}** ${r.fullName} — ${r.serviceType} [${r.status}]\n`; });
                return reply(response);
            } catch (e) { return reply(`❌ خطأ: ${e.message}`); }
        }
        // --- تنظيف الطلبات المرفوضة ---
        else if ((lowerCmd.includes('نظف') || lowerCmd.includes('حذف')) && lowerCmd.includes('مرفوض')) {
            if (!db || !db.deleteRejectedRequests) return reply('❌ لا يمكنني الوصول إلى قاعدة البيانات.');
            try { const count = await db.deleteRejectedRequests(); return reply(`✅ تم تنظيف ${count} طلباً مرفوضاً بنجاح.`); }
            catch (e) { return reply(`❌ خطأ: ${e.message}`); }
        }
        // --- إحصائيات سريعة ---
        else if (lowerCmd.includes('إحصائيات') || lowerCmd.includes('احصائيات') || lowerCmd.includes('stats')) {
            if (!db || !db.getQuickStats) return reply('❌ لا يمكنني الوصول إلى قاعدة البيانات.');
            try {
                const stats = await db.getQuickStats();
                return reply(`📊 **إحصائيات سريعة**\n\n• إجمالي الطلبات: ${stats.total}\n• قيد الانتظار: ${stats.pending}\n• تحت المعالجة: ${stats.processing}\n• مكتملة: ${stats.completed}\n• مرفوضة: ${stats.rejected}`);
            } catch (e) { return reply(`❌ خطأ: ${e.message}`); }
        }
        // --- نسخة احتياطية ---
        else if (lowerCmd.includes('نسخة احتياطية') || lowerCmd.includes('backup')) {
            if (!db || !db.createBackup) return reply('❌ لا يمكنني إنشاء نسخة احتياطية.');
            try { const backupPath = await db.createBackup(); return reply(`✅ تم إنشاء نسخة احتياطية في: \`${backupPath}\``); }
            catch (e) { return reply(`❌ فشل: ${e.message}`); }
        }
        // --- تغيير كلمة المرور ---
        else if (lowerCmd.includes('تغيير كلمة المرور') || lowerCmd.includes('غير كلمة المرور') || lowerCmd.includes('تغيير الباسورد')) {
            const parts = cmd.match(/(?:تغيير كلمة المرور|غير كلمة المرور|تغيير الباسورد)\s+([^\s]+@[^\s]+)\s+(?:إلى|to)\s+(.+)/i);
            if (!parts) return reply('⚠️ صيغة الأمر: `تغيير كلمة المرور [البريد] إلى [الجديدة]`');
            if (!db || !db.updatePassword) return reply('❌ لا يمكنني الاتصال بقاعدة البيانات.');
            try { await db.updatePassword(parts[1], parts[2].trim()); return reply(`✅ تم تغيير كلمة مرور \`${parts[1]}\` بنجاح.`); }
            catch (e) { return reply(`❌ فشل: ${e.message}`); }
        }
        // --- مساعدة ---
        else if (lowerCmd.includes('مساعدة المساعد') || lowerCmd.includes('اوامر المساعد')) {
            return reply(this.help);
        }
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
        (lowerCmd.includes('إحصائيات') || lowerCmd.includes('احصائيات') || lowerCmd.includes('stats')) ||
        (lowerCmd.includes('مساعدة المساعد'))) {
        return AutomationAgent;
    }
    // افتراضياً: المهندس الداخلي
    return SiteEngineer;
}

module.exports = { AutomationAgent, SiteEngineer, getAgent };
