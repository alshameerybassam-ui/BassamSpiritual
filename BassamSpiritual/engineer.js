// engineer.js - مهندس المنصة الداخلي (النور الأسود)
const fs = require('fs');
const path = require('path');

async function executeCommand(command) {
    const lowerCmd = command.toLowerCase();
    let response = '';
    try {
        if (lowerCmd.includes('تعديل') && lowerCmd.includes('ملف')) {
            const filePath = extractFilePath(command);
            const newContent = extractNewContent(command);
            if (!filePath || !newContent) { response = '⚠️ لم أتمكن من فهم الملف أو المحتوى الجديد.'; }
            else {
                const fullPath = path.join(__dirname, 'public', filePath);
                if (fs.existsSync(fullPath)) { fs.writeFileSync(fullPath, newContent, 'utf8'); response = `✅ تم تعديل الملف \`${filePath}\` بنجاح.`; }
                else { response = `❌ الملف \`${filePath}\` غير موجود.`; }
            }
        } else if (lowerCmd.includes('أنشئ') && lowerCmd.includes('صفحة')) {
            const pageName = extractPageName(command);
            if (!pageName) { response = '⚠️ لم أتمكن من فهم اسم الصفحة.'; }
            else {
                const fullPath = path.join(__dirname, 'public', `${pageName}.html`);
                const template = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${pageName} | مركز النور الرباني</title><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"></head><body><div class="container"><h1>${pageName}</h1><p>تم إنشاء هذه الصفحة بواسطة مهندس المنصة الداخلي.</p><a href="/">العودة للرئيسية</a></div></body></html>`;
                fs.writeFileSync(fullPath, template, 'utf8'); response = `✅ تم إنشاء صفحة \`${pageName}.html\` بنجاح.`;
            }
        } else if (lowerCmd.includes('أعد تشغيل') || lowerCmd.includes('ريستارت')) { response = '🔄 جاري إعادة تشغيل الخادم...'; setTimeout(() => process.exit(0), 1000); }
        else if (lowerCmd.includes('حالة') && lowerCmd.includes('نظام')) {
            const dbExists = fs.existsSync(path.join(__dirname, 'database.sqlite'));
            const publicFiles = fs.readdirSync(path.join(__dirname, 'public'));
            response = `📊 **تقرير حالة النظام:**\n\n- قاعدة البيانات: ${dbExists ? '✅ موجودة' : '❌ مفقودة'}\n- عدد ملفات الواجهة: ${publicFiles.length} ملف\n- الذاكرة: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n- وقت التشغيل: ${process.uptime().toFixed(0)} ثانية\n`;
        } else if (lowerCmd.includes('مساعدة') || lowerCmd.includes('اوامر')) {
            response = `🤖 **النور الأسود** - الأوامر:\n1. \`تعديل ملف [اسم] إلى [محتوى]\`\n2. \`أنشئ صفحة [اسم]\`\n3. \`أعد تشغيل الخادم\`\n4. \`حالة النظام\`\n5. \`مساعدة\``;
        } else { response = `🤔 لم أفهم. اكتب "مساعدة".`; }
    } catch (err) { response = `❌ خطأ: ${err.message}`; }
    return response;
}

function extractFilePath(command) { const match = command.match(/ملف\s+([\w./-]+\.\w+)/i); return match ? match[1] : null; }
function extractNewContent(command) { const match = command.match(/إلى\s+([\s\S]+)/i); return match ? match[1].trim() : null; }
function extractPageName(command) { const match = command.match(/صفحة\s+([\w./-]+)/i); return match ? match[1].replace(/\.html$/i, '') : null; }

module.exports = { executeCommand };
