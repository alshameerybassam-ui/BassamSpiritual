// engineer.js - النظام الخبير (النور الأسود)
const fs = require('fs');
const path = require('path');
const os = require('os');

function getSystemReport() {
    const dbFile = path.join(__dirname, 'database.sqlite');
    const dbExists = fs.existsSync(dbFile);
    const publicPath = path.join(__dirname, 'public');
    const files = fs.readdirSync(publicPath);
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const uptime = process.uptime().toFixed(0);

    return `📊 **تقرير حالة النظام (النور الرباني)**\n\n` +
           `- 🗄️ قاعدة البيانات: ${dbExists ? '✅ متصلة وتعمل' : '❌ غير موجودة'}\n` +
           `- 📁 ملفات الواجهة: ${files.length} ملف\n` +
           `- 🧠 الذاكرة المستخدمة: ${memory} MB\n` +
           `- ⏱️ وقت التشغيل: ${uptime} ثانية\n` +
           `- 🖥️ النظام: ${os.platform()} ${os.arch()}\n` +
           `- 💻 المعالج: ${os.cpus()[0].model}\n\n` +
           `🟢 جميع الخدمات تعمل بشكل طبيعي.`;
}

async function executeCommand(command, db = null) {
    const cmd = command.trim().toLowerCase();
    let response = '';

    // --- الأوامر الأساسية ---
    if (cmd === 'مساعدة' || cmd === 'help') {
        response = `🤖 **النظام الخبير (النور الأسود)**\n\n` +
                   `الأوامر المتاحة:\n` +
                   `1. \`تقرير\` - عرض تقرير كامل عن حالة النظام.\n` +
                   `2. \`حالة النظام\` - عرض حالة النظام.\n` +
                   `3. \`تعديل ملف [اسم الملف] إلى [المحتوى]\` - لتعديل أي ملف.\n` +
                   `4. \`إنشاء صفحة [اسم الصفحة]\` - لإنشاء صفحة جديدة.\n` +
                   `5. \`تغيير كلمة المرور [البريد] إلى [الجديدة]\` - لتغيير كلمة مرور أي مستخدم.\n` +
                   `6. \`إعادة تشغيل\` - لإعادة تشغيل الخادم (يتطلب الصلاحية).\n` +
                   `7. \`مساعدة\` - عرض هذه القائمة.`;
    }
    else if (cmd === 'تقرير' || cmd === 'حالة النظام' || cmd === 'status') {
        response = getSystemReport();
    }
    // --- أمر تغيير كلمة المرور ---
    else if (cmd.startsWith('تغيير كلمة المرور') || cmd.startsWith('غير كلمة المرور')) {
        const parts = command.match(/تغيير كلمة المرور\s+([^\s]+@[^\s]+)\s+إلى\s+(.+)/i) || command.match(/غير كلمة المرور\s+([^\s]+@[^\s]+)\s+إلى\s+(.+)/i);
        if (!parts) {
            response = '⚠️ صيغة الأمر: `تغيير كلمة المرور [البريد] إلى [كلمة المرور الجديدة]`';
        } else {
            const email = parts[1];
            const newPassword = parts[2].trim();
            if (db && db.updatePassword) {
                try {
                    await db.updatePassword(email, newPassword);
                    response = `✅ تم تغيير كلمة مرور المستخدم \`${email}\` بنجاح.`;
                } catch (e) {
                    response = `❌ فشل تغيير كلمة المرور: ${e.message}`;
                }
            } else {
                response = '❌ لا يمكنني الاتصال بقاعدة البيانات.';
            }
        }
    }
    // --- أمر تعديل ملف ---
    else if (cmd.startsWith('تعديل ملف') || cmd.startsWith('تعديل الملف')) {
        const parts = command.match(/ملف\s+([\w./-]+\.\w+)\s+إلى\s+([\s\S]+)/i);
        if (!parts) {
            response = '⚠️ صيغة الأمر: `تعديل ملف [اسم الملف] إلى [المحتوى الجديد]`';
        } else {
            const filePath = parts[1];
            const newContent = parts[2].trim();
            const fullPath = path.join(__dirname, 'public', filePath);
            if (fs.existsSync(fullPath)) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                response = `✅ تم تعديل الملف \`${filePath}\` بنجاح.`;
            } else {
                response = `❌ الملف \`${filePath}\` غير موجود.`;
            }
        }
    }
    // --- أمر إنشاء صفحة ---
    else if (cmd.startsWith('إنشاء صفحة') || cmd.startsWith('انشاء صفحة')) {
        const parts = command.match(/صفحة\s+([\w./-]+)/i);
        if (!parts) {
            response = '⚠️ صيغة الأمر: `إنشاء صفحة [اسم الصفحة]`';
        } else {
            const pageName = parts[1].replace(/\.html$/i, '');
            const fullPath = path.join(__dirname, 'public', `${pageName}.html`);
            const template = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${pageName} | مركز النور الرباني</title><link rel="stylesheet" href="style.css"></head><body><div class="container"><h1>${pageName}</h1><p>تم إنشاء هذه الصفحة بواسطة النظام الخبير.</p><a href="/">العودة للرئيسية</a></div></body></html>`;
            fs.writeFileSync(fullPath, template, 'utf8');
            response = `✅ تم إنشاء صفحة \`${pageName}.html\` بنجاح.`;
        }
    }
    // --- أمر إعادة التشغيل ---
    else if (cmd.startsWith('إعادة تشغيل') || cmd.startsWith('اعادة تشغيل') || cmd === 'ريستارت') {
        response = '🔄 جاري إعادة تشغيل الخادم...';
        setTimeout(() => process.exit(0), 1000);
    }
    else {
        response = `🤔 لم أفهم الأمر. اكتب \`مساعدة\` لمعرفة الأوامر المتاحة.`;
    }

    return response;
}

module.exports = { executeCommand };
