// ===== الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

// ===== جلب وعرض المقالات =====
async function loadArticles() {
    try {
        console.log('🔄 جاري تحميل المقالات...');
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const articles = await res.json();
        console.log('✅ تم جلب المقالات:', articles.length);
        
        const container = document.getElementById('articlesContainer');
        if (!container) {
            console.error('❌ articlesContainer غير موجود!');
            return;
        }

        if (!articles || articles.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">📚 سيتم إضافة مقالات قريباً...</p>';
            return;
        }

        // عرض المقالات
        container.innerHTML = articles.map(article => {
            const summary = article.summary || (article.content ? article.content.substring(0, 80) + '...' : '');
            return `
                <div class="article-card" data-id="${article.id}" style="cursor:pointer;">
                    <i class="${article.icon || 'fa-solid fa-book'} icon"></i>
                    <h3>${article.title}</h3>
                    <p>${summary}</p>
                    <span class="date"><i class="far fa-calendar-alt"></i> ${article.date || 'تاريخ غير محدد'}</span>
                    <span style="display:block; margin-top:12px; color:#F5B041; font-weight:600; font-size:0.85rem;">
                        <i class="fas fa-arrow-left"></i> اضغط لقراءة المزيد
                    </span>
                </div>
            `;
        }).join('');

        // ===== إضافة حدث النقر =====
        container.querySelectorAll('.article-card').forEach(card => {
            card.addEventListener('click', function(e) {
                const id = parseInt(this.getAttribute('data-id'));
                console.log('🖱️ تم النقر على المقال رقم:', id);
                if (id) openArticle(id);
            });
        });

        console.log('✅ تم عرض المقالات بنجاح');
    } catch (e) {
        console.error('❌ خطأ في تحميل المقالات:', e.message);
        const container = document.getElementById('articlesContainer');
        if (container) {
            container.innerHTML = `<p style="text-align:center; color:#e74c3c; padding:30px;">⚠️ حدث خطأ في تحميل المقالات: ${e.message}</p>`;
        }
    }
}

// ===== فتح المقال =====
async function openArticle(articleId) {
    console.log('📖 فتح المقال رقم:', articleId);
    try {
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error('فشل جلب المقالات');
        const articles = await res.json();
        const article = articles.find(a => a.id === articleId);
        if (!article) {
            showNotification('⚠️ المقال غير موجود', 'error');
            return;
        }

        const modalTitle = document.getElementById('modalArticleTitle');
        const modalContent = document.getElementById('modalArticleContent');
        const modal = document.getElementById('articleModal');

        if (!modalTitle || !modalContent || !modal) {
            console.error('❌ عناصر المودال غير موجودة!');
            alert('حدث خطأ: عناصر المودال غير موجودة');
            return;
        }

        modalTitle.innerHTML = `<i class="fas fa-feather-alt"></i> ${article.title}`;
        let contentHtml = article.content ? article.content.replace(/\n/g, '<br>') : '<p>لا يوجد محتوى مكتوب لهذا المقال بعد.</p>';
        contentHtml += `<span class="article-date"><i class="far fa-calendar-alt"></i> نشر في: ${article.date || 'تاريخ غير محدد'}</span>`;
        modalContent.innerHTML = contentHtml;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('✅ تم فتح المقال بنجاح');
    } catch (e) {
        console.error('❌ خطأ في فتح المقال:', e);
        showNotification('⚠️ خطأ في تحميل المحتوى', 'error');
    }
}

// ===== إغلاق المودال =====
function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// ===== عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تم تحميل الصفحة بالكامل، جاري تهيئة الموقع...');

    // ربط إغلاق المودال بالنقر خارج المحتوى
    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeArticleModal();
        });
    }

    // ربط زر Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeArticleModal();
    });

    // تحميل المقالات والشهادات
    loadArticles();
    loadTestimonials();

    // عداد الثقة
    setTimeout(animateCounters, 600);
});
// ===== الذكاء الاصطناعي الروحاني (محاكاة ذكية) =====
let chatState = {
    step: 'intro', // intro, problem, duration, previous, summary
    userData: {
        problem: '',
        duration: '',
        previous: ''
    }
};

// ===== فتح/إغلاق نافذة الدردشة =====
function toggleChat() {
    const window = document.getElementById('chatWindow');
    window.classList.toggle('show');
    if (window.classList.contains('show')) {
        document.getElementById('chatInput').focus();
        // إزالة الإشعار
        document.querySelector('.chat-badge').style.display = 'none';
    }
}

// ===== إرسال رسالة =====
function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    // إضافة رسالة المستخدم
    addMessage(text, 'user');
    input.value = '';

    // معالجة الرد حسب الخطوة الحالية
    setTimeout(() => {
        processResponse(text);
    }, 500);
}

// ===== إضافة رسالة إلى الواجهة =====
function addMessage(text, sender) {
    const body = document.getElementById('chatBody');
    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;
    div.innerHTML = `<div class="message-content">${text}</div>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

// ===== إضافة رسالة من البوت =====
function addBotMessage(text) {
    addMessage(text, 'bot');
}

// ===== معالجة استجابة البوت =====
function processResponse(text) {
    const step = chatState.step;
    const data = chatState.userData;

    switch (step) {
        case 'intro':
            // السؤال عن المشكلة
            data.problem = text;
            chatState.step = 'duration';
            addBotMessage('🙏 شكراً لك على المشاركة.<br>منذ متى وأنت تعاني من هذه المشكلة؟ (مثل: أشهر، سنوات، منذ الطفولة)');
            break;

        case 'duration':
            data.duration = text;
            chatState.step = 'previous';
            addBotMessage('📖 هل حاولت علاج هذه المشكلة سابقاً؟ (مثل: رقية، استشارة نفسية، طبيب)');
            break;

        case 'previous':
            data.previous = text;
            chatState.step = 'summary';
            // تحليل البيانات وتقديم التوصية
            const recommendation = analyzeProblem(data);
            addBotMessage(`✨ شكراً لك على المعلومات.<br><br>بناءً على ما شاركتني به، إليك توصيتي:<br><br>${recommendation}<br><br>هل ترغب في نقل هذه المعلومات إلى نموذج الطلب مباشرة؟`);
            // إضافة زر نقل البيانات
            setTimeout(() => {
                const body = document.getElementById('chatBody');
                const div = document.createElement('div');
                div.className = 'chat-message bot';
                div.innerHTML = `
                    <div class="message-content" style="background:#FFFBF0; border-right:4px solid #F5B041;">
                        <button onclick="transferToForm()" style="background:linear-gradient(135deg,#F5B041,#E67E22); color:#0A1628; border:none; padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; font-family:'Cairo'; width:100%;">
                            <i class="fas fa-arrow-left"></i> نقل البيانات إلى نموذج الطلب
                        </button>
                        <button onclick="resetChat()" style="background:#E2E8F0; color:#333; border:none; padding:8px 16px; border-radius:10px; font-weight:600; cursor:pointer; font-family:'Cairo'; margin-top:8px; width:100%;">
                            <i class="fas fa-undo"></i> بدء محادثة جديدة
                        </button>
                    </div>
                `;
                body.appendChild(div);
                body.scrollTop = body.scrollHeight;
            }, 800);
            break;

        default:
            chatState.step = 'intro';
            addBotMessage('🌙 أهلاً بك مرة أخرى. كيف يمكنني مساعدتك اليوم؟');
            break;
    }
}

// ===== تحليل المشكلة وتقديم التوصية =====
function analyzeProblem(data) {
    const text = (data.problem + ' ' + data.previous).toLowerCase();
    let recommendation = '';

    // كشف الكلمات المفتاحية لتحديد الخدمة المناسبة
    const keywords = {
        'مجاني': ['رؤيا', 'حلم', 'استشارة', 'توجيه', 'نصيحة'],
        'علاج': ['سحر', 'عين', 'حسد', 'مس', 'رصد', 'صدمة', 'خوف', 'قلق', 'اكتئاب', 'وسواس'],
        'صوتي': ['صوتي', 'مباشر', 'جلسة', 'مكالمة', 'اتصال']
    };

    let service = 'استشارة مجانية';
    let confidence = 0;

    // فحص الكلمات المفتاحية
    for (const [key, words] of Object.entries(keywords)) {
        let count = 0;
        for (const word of words) {
            if (text.includes(word)) count++;
        }
        if (count > confidence) {
            confidence = count;
            if (key === 'علاج') service = 'علاج العين والحسد والأسحار (200 ر.س)';
            else if (key === 'صوتي') service = 'جلسة صوتية مباشرة (500 ر.س)';
            else service = 'استشارة روحانية ونفسية (مجاناً)';
        }
    }

    // بناء التوصية
    if (service === 'استشارة روحانية ونفسية (مجاناً)') {
        recommendation = `
            <strong>🕊️ الخدمة الموصى بها:</strong> الاستشارة الروحانية والنفسية (مجاناً)<br><br>
            بناءً على كلامك، يبدو أنك بحاجة إلى توجيه روحاني ونفسي. هذه الاستشارة ستساعدك في توضيح رؤيتك وتقديم النصائح المناسبة لحالتك.<br>
            <strong>المدة:</strong> جلسة واحدة مجانية<br>
            <strong>طريقة التواصل:</strong> نصي أو صوتي عبر واتساب
        `;
    } else if (service === 'علاج العين والحسد والأسحار (200 ر.س)') {
        recommendation = `
            <strong>🛡️ الخدمة الموصى بها:</strong> علاج العين والحسد والأسحار والرصد (200 ر.س)<br><br>
            يبدو أنك تعاني من أعراض قد تكون مرتبطة بالعين أو الحسد أو السحر. نوصي بجلسة علاجية شاملة تشمل الرقية الشرعية والتحصين.<br>
            <strong>المدة:</strong> جلسة واحدة (قابلة للتمديد حسب الحالة)<br>
            <strong>طريقة التواصل:</strong> عبر واتساب (نصي/صوتي)
        `;
    } else if (service === 'جلسة صوتية مباشرة (500 ر.س)') {
        recommendation = `
            <strong>🎧 الخدمة الموصى بها:</strong> جلسة صوتية مباشرة مع الشيخ بسام (500 ر.س)<br><br>
            حالتك تتطلب تواصلاً مباشراً مع الشيخ بسام عبر مكالمة صوتية. هذه الجلسة ستتيح لك فرصة لمناقشة تفاصيلك بشكل أعمق والحصول على توجيه فوري.<br>
            <strong>المدة:</strong> جلسة صوتية مباشرة (30-45 دقيقة)<br>
            <strong>طريقة التواصل:</strong> مكالمة صوتية عبر واتساب أو تطبيق آخر
        `;
    }

    return recommendation;
}

// ===== نقل البيانات إلى نموذج الطلب =====
function transferToForm() {
    const data = chatState.userData;
    
    // ملء النموذج الرئيسي
    const description = `[تم إنشاء هذا الطلب عبر المستشار الروحاني الذكي]\n\nالمشكلة: ${data.problem}\nالمدة: ${data.duration}\nالمحاولات السابقة: ${data.previous}`;
    
    document.getElementById('description').value = description;
    
    // اختيار الخدمة المناسبة تلقائياً (تحليل بسيط)
    const text = (data.problem + ' ' + data.previous).toLowerCase();
    let serviceValue = 'استشارة مجانية';
    if (text.includes('سحر') || text.includes('عين') || text.includes('حسد') || text.includes('مس')) {
        serviceValue = 'علاج';
    } else if (text.includes('صوتي') || text.includes('مباشر') || text.includes('جلسة')) {
        serviceValue = 'جلسة صوتية';
    }
    
    const serviceSelect = document.getElementById('serviceType');
    for (let option of serviceSelect.options) {
        if (option.value === serviceValue) {
            option.selected = true;
            break;
        }
    }
    
    // إغلاق نافذة الدردشة
    toggleChat();
    
    // التمرير إلى النموذج
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
    
    // إشعار
    showNotification('✅ تم نقل بياناتك إلى نموذج الطلب! راجع التفاصيل وأكمل الإرسال.', 'success');
    
    // إعادة ضبط المحادثة
    resetChat();
}

// ===== إعادة ضبط المحادثة =====
function resetChat() {
    chatState = {
        step: 'intro',
        userData: { problem: '', duration: '', previous: '' }
    };
    
    const body = document.getElementById('chatBody');
    body.innerHTML = `
        <div class="chat-message bot">
            <div class="message-content">
                السلام عليكم ورحمة الله وبركاته 🌙<br>
                أنا المستشار الروحاني الذكي، هنا لمساعدتك في توضيح مشكلتك وتوجيهك إلى الخدمة المناسبة.<br>
                <strong>هل يمكنك إخباري بما تمر به؟</strong>
            </div>
        </div>
    `;
}

// ===== بدء المحادثة تلقائياً عند فتح الصفحة (اختياري) =====
// يمكن تفعيل هذا السطر لعرض نافذة الدردشة تلقائياً بعد 3 ثواني من تحميل الصفحة
// setTimeout(() => { toggleChat(); }, 3000);
}
