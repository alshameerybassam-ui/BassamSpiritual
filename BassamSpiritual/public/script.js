// ==============================================
// 1. الإشعارات العامة
// ==============================================
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 6000);
}

// ==============================================
// 2. إصلاح الأيقونات (تحميل Font Awesome بشكل آمن)
// ==============================================
(function ensureFontAwesome() {
    // التحقق من وجود أي رابط لـ Font Awesome
    const existingLink = document.querySelector('link[href*="font-awesome"]');
    if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css';
        link.integrity = 'sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        console.log('✅ Font Awesome تم تحميله تلقائياً');
    }
})();

// ==============================================
// 3. التحقق من الجلسة في الواجهة الرئيسية
// ==============================================
(function checkSessionOnHome() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const registerBtn = document.querySelector('.btn-register');
    const loginBtn = document.querySelector('.btn-login');
    const dashboardLink = document.getElementById('dashboardLink');
    const requestBtn = document.getElementById('requestBtn');

    if (token && user) {
        if (registerBtn) registerBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';
        if (dashboardLink) {
            dashboardLink.style.display = 'inline-flex';
            dashboardLink.innerHTML = `<i class="fas fa-user"></i> مرحباً، ${user.fullName.split(' ')[0]}`;
        }
        if (requestBtn) {
            requestBtn.href = '/dashboard.html';
            requestBtn.innerHTML = '<i class="fas fa-pen"></i> قدم طلبك الآن';
        }
    } else {
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (requestBtn) {
            requestBtn.href = '/login.html';
            requestBtn.innerHTML = '<i class="fas fa-pen"></i> قدم طلبك الآن';
        }
    }
})();

// ==============================================
// 4. المساعد الذكي - سيناريوهات متعددة
// ==============================================

// تعريف سيناريوهات المحادثة
const chatScenarios = {
    intro: {
        message: 'السلام عليكم ورحمة الله وبركاته 🌙\nأنا المستشار الروحاني الذكي في مركز النور الرباني.\nأنا هنا لمساعدتك في توضيح مشكلتك وتوجيهك إلى الخدمة المناسبة.\n🔹 هل يمكنك إخباري بما تمر به؟',
        next: 'problem'
    },
    problem: {
        message: 'شكراً لك على المشاركة.\n🔹 هل هذه المشكلة مرتبطة بالروح (خوف، وسواس، عين، سحر)، أم بالنفس (قلق، اكتئاب، توتر)، أم بالجسد (ألم، مرض)؟\n(اختر: روح / نفس / جسد / لا أعرف)',
        next: 'duration'
    },
    duration: {
        message: '🔹 منذ متى وأنت تعاني من هذه المشكلة؟\n(أشهر، سنوات، منذ الطفولة، حديثاً)',
        next: 'previous'
    },
    previous: {
        message: '🔹 هل حاولت علاج هذه المشكلة سابقاً؟\n(رقية شرعية، استشارة نفسية، طبيب، لم أحاول)',
        next: 'summary'
    },
    summary: function(data) {
        // تحليل البيانات وتوليد توصية
        let recommendation = '';
        let serviceType = '';
        let price = '';

        const text = (data.problem + ' ' + (data.category || '')).toLowerCase();

        if (text.includes('سحر') || text.includes('عين') || text.includes('حسد') || text.includes('مس')) {
            serviceType = 'علاج العين والحسد والأسحار والرصد';
            price = '200 ر.س';
            recommendation = '🛡️ يبدو أنك تعاني من أعراض قد تكون مرتبطة بالعين أو الحسد أو السحر. نوصي بجلسة علاجية شاملة تشمل الرقية الشرعية والتحصين.';
        } else if (text.includes('قلق') || text.includes('اكتئاب') || text.includes('توتر') || text.includes('نفس')) {
            serviceType = 'استشارة روحانية ونفسية';
            price = 'مجاناً';
            recommendation = '🕊️ يبدو أنك بحاجة إلى توجيه روحاني ونفسي. هذه الاستشارة ستساعدك في توضيح رؤيتك وتقديم النصائح المناسبة لحالتك.';
        } else if (text.includes('ألم') || text.includes('مرض') || text.includes('جسد')) {
            serviceType = 'جلسة صوتية مباشرة مع الشيخ';
            price = '350 ر.س';
            recommendation = '🎧 حالتك تتطلب تواصلاً مباشراً مع الشيخ عبر مكالمة صوتية. ستتيح لك فرصة لمناقشة تفاصيلك بشكل أعمق والحصول على توجيه فوري.';
        } else {
            serviceType = 'استشارة روحانية عامة';
            price = '100 ر.س';
            recommendation = '📖 نوصي باستشارة عامة مع الشيخ بسام لتحديد طبيعة مشكلتك بدقة والحصول على التوجيه المناسب.';
        }

        const result = `
✨ بناءً على ما شاركتني به، إليك توصيتي:

📌 الخدمة المناسبة: **${serviceType}**
💰 التكلفة: **${price}**

📝 ${recommendation}

🔹 هل ترغب في نقل هذه المعلومات إلى نموذج الطلب وتقديم طلبك الآن؟
        `;
        // حفظ البيانات للاستخدام في النقل
        window._chatData = {
            problem: data.problem,
            category: data.category || '',
            duration: data.duration || '',
            previous: data.previous || '',
            serviceType: serviceType,
            price: price,
            recommendation: recommendation
        };
        return result;
    }
};

// حالة المحادثة
let chatState = {
    step: 'intro',
    userData: { problem: '', category: '', duration: '', previous: '' },
    isProcessing: false
};
let hasAutoOpened = false;

// ===== فتح/إغلاق نافذة الدردشة =====
function toggleChat() {
    const window = document.getElementById('chatWindow');
    const isShowing = window.classList.contains('show');
    if (!isShowing) {
        sessionStorage.removeItem('chat_manual_closed');
    } else {
        sessionStorage.setItem('chat_manual_closed', 'true');
    }
    window.classList.toggle('show');
    if (window.classList.contains('show')) {
        document.getElementById('chatInput').focus();
        const badge = document.querySelector('.chat-badge');
        if (badge) badge.style.display = 'none';
        // تحديث رصيد الرسائل إذا كان هناك توكن
        updateChatCredits();
    }
}

// ===== إرسال رسالة إلى المساعد الذكي =====
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message || chatState.isProcessing) return;

    chatState.isProcessing = true;
    input.disabled = true;

    // عرض رسالة المستخدم فوراً
    const container = document.getElementById('chatBody');
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-message user';
    userDiv.innerHTML = `<div class="message-content">${message}</div>`;
    container.appendChild(userDiv);
    container.scrollTop = container.scrollHeight;
    input.value = '';

    // تحديث حالة المحادثة
    const currentStep = chatState.step;
    const data = chatState.userData;

    // حفظ إجابة المستخدم حسب الخطوة الحالية
    if (currentStep === 'intro') {
        data.problem = message;
        chatState.step = 'problem';
    } else if (currentStep === 'problem') {
        data.category = message;
        chatState.step = 'duration';
    } else if (currentStep === 'duration') {
        data.duration = message;
        chatState.step = 'previous';
    } else if (currentStep === 'previous') {
        data.previous = message;
        chatState.step = 'summary';
    }

    // توليد الرد المناسب
    let reply = '';
    let isSummary = false;

    if (chatState.step === 'summary') {
        // الخطوة الأخيرة - توليد التوصية
        const scenario = chatScenarios.summary;
        if (typeof scenario === 'function') {
            reply = scenario(data);
        } else {
            reply = scenario || 'شكراً لك على المعلومات. كيف يمكنني مساعدتك أكثر؟';
        }
        isSummary = true;
    } else {
        // الحصول على رسالة الخطوة الحالية
        const stepKey = chatState.step;
        const scenario = chatScenarios[stepKey];
        if (scenario && typeof scenario === 'object') {
            reply = scenario.message || 'أنا هنا لمساعدتك. أخبرني أكثر.';
        } else {
            reply = 'أنا هنا لمساعدتك. أخبرني أكثر.';
        }
    }

    // إضافة رد البوت
    const botDiv = document.createElement('div');
    botDiv.className = 'chat-message bot';
    botDiv.innerHTML = `<div class="message-content">${reply.replace(/\n/g, '<br>')}</div>`;
    container.appendChild(botDiv);
    container.scrollTop = container.scrollHeight;

    // إذا كانت هذه هي الخلاصة، أضف أزرار الإجراء
    if (isSummary) {
        setTimeout(() => {
            const body = document.getElementById('chatBody');
            const actionDiv = document.createElement('div');
            actionDiv.className = 'chat-message bot';
            actionDiv.innerHTML = `
                <div class="message-content" style="background:#FFFBF0; border-right:4px solid #F5B041;">
                    <button onclick="transferToForm()" style="background:linear-gradient(135deg,#F5B041,#E67E22); color:#0A1628; border:none; padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; font-family:'Cairo'; width:100%;">
                        <i class="fas fa-arrow-left"></i> نقل إلى نموذج الطلب
                    </button>
                    <button onclick="resetChat()" style="background:#E2E8F0; color:#333; border:none; padding:8px 16px; border-radius:10px; font-weight:600; cursor:pointer; font-family:'Cairo'; margin-top:8px; width:100%;">
                        <i class="fas fa-undo"></i> بدء محادثة جديدة
                    </button>
                </div>
            `;
            body.appendChild(actionDiv);
            body.scrollTop = body.scrollHeight;
        }, 500);
    }

    chatState.isProcessing = false;
    input.disabled = false;
    input.focus();
}

// ===== نقل البيانات إلى نموذج الطلب =====
function transferToForm() {
    const data = window._chatData || chatState.userData;
    const description = `[تم إنشاء هذا الطلب عبر المستشار الروحاني الذكي]\n\nالمشكلة: ${data.problem}\nالتصنيف: ${data.category || 'غير محدد'}\nالمدة: ${data.duration || 'غير محدد'}\nالمحاولات السابقة: ${data.previous || 'غير محدد'}\n\nالتوصية: ${data.recommendation || ''}`;
    
    // محاولة ملء النموذج إذا كان موجوداً في الصفحة
    const descField = document.getElementById('description');
    if (descField) {
        descField.value = description;
        showNotification('✅ تم نقل بياناتك إلى نموذج الطلب!', 'success');
    } else {
        // إذا لم يكن النموذج في الصفحة الحالية، نوجه المستخدم لتسجيل الدخول
        showNotification('⚠️ يرجى تسجيل الدخول لتقديم الطلب.', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }

    // اختيار الخدمة المناسبة تلقائياً في النموذج
    const serviceSelect = document.getElementById('serviceType');
    if (serviceSelect && data.serviceType) {
        const serviceMap = {
            'علاج العين والحسد والأسحار والرصد': 'علاج',
            'استشارة روحانية ونفسية': 'استشارة مجانية',
            'جلسة صوتية مباشرة مع الشيخ': 'جلسة صوتية',
            'استشارة روحانية عامة': 'استشارة'
        };
        const mappedValue = serviceMap[data.serviceType] || '';
        for (let option of serviceSelect.options) {
            if (option.value === mappedValue || option.text.includes(data.serviceType.split(' ')[0])) {
                option.selected = true;
                break;
            }
        }
    }

    // التمرير إلى النموذج
    const formCard = document.querySelector('.form-card');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    // إغلاق نافذة الدردشة
    toggleChat();
    resetChat();
}

// ===== إعادة ضبط المحادثة =====
function resetChat() {
    chatState = {
        step: 'intro',
        userData: { problem: '', category: '', duration: '', previous: '' },
        isProcessing: false
    };
    window._chatData = null;
    const body = document.getElementById('chatBody');
    body.innerHTML = `
        <div class="chat-message bot">
            <div class="message-content">${chatScenarios.intro.message.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    sessionStorage.removeItem('chat_manual_closed');
    hasAutoOpened = false;
}

// ===== إنشاء عنصر حالة المحادثة =====
function createChatStatus() {
    let status = document.getElementById('chatStatus');
    if (!status) {
        const footer = document.querySelector('.chat-footer');
        if (footer) {
            status = document.createElement('div');
            status.id = 'chatStatus';
            status.style.cssText = 'margin-top:8px; font-size:0.85rem; color:#6A7A8A; text-align:center;';
            footer.parentNode.insertBefore(status, footer.nextSibling);
        }
    }
    return status;
}

// ===== تحديث رصيد الرسائل (إن وجد) =====
async function updateChatCredits() {
    const token = localStorage.getItem('token');
    const status = document.getElementById('chatStatus') || createChatStatus();
    if (!token) {
        if (status) {
            status.innerHTML = `
                🔓 غير مسجل. <a href="/login.html" style="color:#F5B041; font-weight:700;">سجل الدخول</a> للحصول على 50 رسالة مجانية.
            `;
        }
        return;
    }
    try {
        const res = await fetch('/api/chat/credits', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && status) {
            if (data.remaining > 0) {
                status.textContent = `✅ رسائل متبقية: ${data.remaining}`;
            } else {
                status.innerHTML = `
                    ⚠️ انتهت رسائلك المجانية. <a href="/dashboard.html" style="color:#F5B041; font-weight:700;">تواصل مع الشيخ مباشرة</a>.
                `;
            }
        }
    } catch (e) {
        console.error('فشل تحديث رصيد الرسائل:', e);
    }
}

// ===== فتح الدردشة تلقائياً =====
function autoOpenChat() {
    const manualClosed = sessionStorage.getItem('chat_manual_closed');
    if (manualClosed === 'true') return;
    if (hasAutoOpened) return;
    hasAutoOpened = true;
    setTimeout(() => {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow && !chatWindow.classList.contains('show')) {
            chatWindow.classList.add('show');
            const input = document.getElementById('chatInput');
            if (input) input.focus();
            const badge = document.querySelector('.chat-badge');
            if (badge) badge.style.display = 'none';
            updateChatCredits();
        }
    }, 4000);
}

// ==============================================
// 5. تحميل المقالات والشهادات
// ==============================================
async function loadArticles() {
    try {
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error('فشل تحميل المقالات');
        const articles = await res.json();
        const container = document.getElementById('articlesContainer');
        if (!container) return;
        if (!articles || articles.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">📚 سيتم إضافة مقالات قريباً...</p>';
            return;
        }
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
        container.querySelectorAll('.article-card').forEach(card => {
            card.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                if (id) openArticle(id);
            });
        });
    } catch (e) {
        console.error('خطأ في تحميل المقالات:', e);
    }
}

async function openArticle(articleId) {
    try {
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error('فشل جلب المقالات');
        const articles = await res.json();
        const article = articles.find(a => a.id === articleId);
        if (!article) {
            showNotification('⚠️ المقال غير موجود', 'error');
            return;
        }
        document.getElementById('modalArticleTitle').innerHTML = `<i class="fas fa-feather-alt"></i> ${article.title}`;
        let contentHtml = article.content ? article.content.replace(/\n/g, '<br>') : '<p>لا يوجد محتوى مكتوب لهذا المقال بعد.</p>';
        contentHtml += `<span class="article-date"><i class="far fa-calendar-alt"></i> نشر في: ${article.date || 'تاريخ غير محدد'}</span>`;
        document.getElementById('modalArticleContent').innerHTML = contentHtml;
        document.getElementById('articleModal').classList.add('show');
        document.body.style.overflow = 'hidden';
    } catch (e) {
        showNotification('⚠️ خطأ في تحميل المحتوى', 'error');
    }
}

function closeArticleModal() {
    document.getElementById('articleModal').classList.remove('show');
    document.body.style.overflow = 'auto';
}

document.getElementById('articleModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeArticleModal();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeArticleModal();
});

async function loadTestimonials() {
    try {
        const res = await fetch('/api/testimonials');
        if (!res.ok) throw new Error('فشل جلب الشهادات');
        const testimonials = await res.json();
        const container = document.getElementById('testimonialsContainer');
        if (!container) return;
        if (testimonials.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">لا توجد آراء بعد، كن أنت الأول!</p>';
            return;
        }
        container.innerHTML = testimonials.map(t => {
            const stars = '★'.repeat(Math.min(t.rating || 5, 5)) + '☆'.repeat(Math.max(5 - (t.rating || 5), 0));
            return `
                <div class="testimonial-card">
                    <div class="stars">${stars}</div>
                    <p class="content">"${t.content}"</p>
                    <div class="name">- ${t.name}</div>
                    <span class="date">${t.date || ''}</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('خطأ في تحميل الشهادات:', e);
    }
}

function animateCounters() {
    const counters = document.querySelectorAll('.counter-number');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        if (!target) return;
        let current = 0;
        const increment = target / 80;
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.innerText = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = target + (target > 100 ? '+' : '');
            }
        };
        updateCounter();
    });
}

// ==============================================
// 6. تهيئة الصفحة
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تم تحميل الصفحة بالكامل...');
    loadArticles();
    loadTestimonials();
    setTimeout(animateCounters, 600);
    setTimeout(autoOpenChat, 2500);
    
    // تحديث رصيد الرسائل كل 30 ثانية
    setInterval(updateChatCredits, 30000);

    // إضافة حدث Enter في حقل الإدخال
    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

console.log('✅ تم تحميل script.js بنجاح');
