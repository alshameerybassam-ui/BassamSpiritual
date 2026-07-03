// ===== الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 6000);
}

// ===== التحقق من الجلسة في الواجهة الرئيسية =====
(function checkSessionOnHome() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
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
            requestBtn.innerHTML = '<i class="fas fa-pen"></i> طلب جديد';
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

// ===== جلب المقالات =====
async function loadArticles() {
    try {
        const res = await fetch('/api/articles');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const articles = await res.json();
        const container = document.getElementById('articlesContainer');
        if (!container) return;
        if (!articles || articles.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">📚 سيتم إضافة مقالات قريباً...</p>';
            return;
        }
        container.innerHTML = articles.map(article => `
            <div class="article-card" data-id="${article.id}" style="cursor:pointer;">
                <i class="${article.icon || 'fa-solid fa-book'} icon"></i>
                <h3>${article.title}</h3>
                <p>${article.summary || (article.content ? article.content.substring(0, 80) + '...' : '')}</p>
                <span class="date"><i class="far fa-calendar-alt"></i> ${article.date || 'تاريخ غير محدد'}</span>
                <span style="display:block; margin-top:12px; color:#F5B041; font-weight:600; font-size:0.85rem;">
                    <i class="fas fa-arrow-left"></i> اضغط لقراءة المزيد
                </span>
            </div>
        `).join('');
        container.querySelectorAll('.article-card').forEach(card => {
            card.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                if (id) openArticle(id);
            });
        });
    } catch (e) {
        console.error('خطأ في تحميل المقالات:', e.message);
        const container = document.getElementById('articlesContainer');
        if (container) {
            container.innerHTML = `<p style="text-align:center; color:#e74c3c; padding:30px;">⚠️ حدث خطأ في تحميل المقالات: ${e.message}</p>`;
        }
    }
}

// ===== فتح المقال =====
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
        const modalTitle = document.getElementById('modalArticleTitle');
        const modalContent = document.getElementById('modalArticleContent');
        const modal = document.getElementById('articleModal');
        if (!modalTitle || !modalContent || !modal) return;
        modalTitle.innerHTML = `<i class="fas fa-feather-alt"></i> ${article.title}`;
        let contentHtml = article.content ? article.content.replace(/\n/g, '<br>') : '<p>لا يوجد محتوى مكتوب لهذا المقال بعد.</p>';
        contentHtml += `<span class="article-date"><i class="far fa-calendar-alt"></i> نشر في: ${article.date || 'تاريخ غير محدد'}</span>`;
        modalContent.innerHTML = contentHtml;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    } catch (e) {
        showNotification('⚠️ خطأ في تحميل المحتوى', 'error');
    }
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeArticleModal();
        });
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeArticleModal();
});

// ===== جلب الشهادات =====
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

// ===== عداد الثقة =====
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
// ===== الذكاء الاصطناعي (المساعد الذكي) =====
// ==============================================
let chatState = {
    step: 'intro',
    userData: { problem: '', duration: '', previous: '' }
};
let hasAutoOpened = false;

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
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    setTimeout(() => { processResponse(text); }, 500);
}

function addMessage(text, sender) {
    const body = document.getElementById('chatBody');
    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;
    div.innerHTML = `<div class="message-content">${text}</div>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function addBotMessage(text) {
    addMessage(text, 'bot');
}

function processResponse(text) {
    const step = chatState.step;
    const data = chatState.userData;

    switch (step) {
        case 'intro':
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
            const recommendation = analyzeProblem(data);
            addBotMessage(`✨ شكراً لك على المعلومات.<br><br>بناءً على ما شاركتني به، إليك توصيتي:<br><br>${recommendation}<br><br>هل ترغب في نقل هذه المعلومات إلى نموذج الطلب مباشرة؟`);
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

function analyzeProblem(data) {
    const text = (data.problem + ' ' + data.previous).toLowerCase();
    let service = 'استشارة مجانية';
    let confidence = 0;

    const keywords = {
        'مجاني': ['رؤيا', 'حلم', 'استشارة', 'توجيه', 'نصيحة', 'تفسير'],
        'علاج': ['سحر', 'عين', 'حسد', 'مس', 'رصد', 'صدمة', 'خوف', 'قلق', 'اكتئاب', 'وسواس', 'مرض', 'ألم'],
        'صوتي': ['صوتي', 'مباشر', 'جلسة', 'مكالمة', 'اتصال']
    };

    for (const [key, words] of Object.entries(keywords)) {
        let count = 0;
        for (const word of words) {
            if (text.includes(word)) count++;
        }
        if (count > confidence) {
            confidence = count;
            if (key === 'علاج') service = 'علاج العين والحسد والأسحار (100 ر.س)';
            else if (key === 'صوتي') service = 'جلسة صوتية مباشرة (350 ر.س)';
            else service = 'استشارة روحانية ونفسية (مجاناً)';
        }
    }

    if (service === 'استشارة روحانية ونفسية (مجاناً)') {
        return `
            <strong>🕊️ الخدمة الموصى بها:</strong> الاستشارة الروحانية والنفسية (مجاناً)<br><br>
            يبدو أنك بحاجة إلى توجيه روحاني ونفسي. هذه الاستشارة ستساعدك في توضيح رؤيتك وتقديم النصائح المناسبة.<br>
            <strong>المدة:</strong> جلسة واحدة مجانية<br>
            <strong>طريقة التواصل:</strong> نصي أو صوتي عبر واتساب
        `;
    } else if (service === 'علاج العين والحسد والأسحار (100 ر.س)') {
        return `
            <strong>🛡️ الخدمة الموصى بها:</strong> علاج العين والحسد والأسحار والرصد (100 ر.س)<br><br>
            يبدو أنك تعاني من أعراض قد تكون مرتبطة بالعين أو الحسد أو السحر. نوصي بجلسة علاجية شاملة.<br>
            <strong>المدة:</strong> جلسة واحدة (قابلة للتمديد)<br>
            <strong>طريقة التواصل:</strong> عبر واتساب (نصي/صوتي)
        `;
    } else if (service === 'جلسة صوتية مباشرة (350 ر.س)') {
        return `
            <strong>🎧 الخدمة الموصى بها:</strong> جلسة صوتية مباشرة مع الشيخ بسام (350 ر.س)<br><br>
            حالتك تتطلب تواصلاً مباشراً مع الشيخ عبر مكالمة صوتية. ستتيح لك فرصة لمناقشة تفاصيلك بشكل أعمق.<br>
            <strong>المدة:</strong> 30-45 دقيقة<br>
            <strong>طريقة التواصل:</strong> مكالمة صوتية عبر واتساب
        `;
    }
    return '';
}

function transferToForm() {
    const data = chatState.userData;
    const description = `[تم إنشاء هذا الطلب عبر المستشار الروحاني الذكي]\n\nالمشكلة: ${data.problem}\nالمدة: ${data.duration}\nالمحاولات السابقة: ${data.previous}`;
    
    // تخزين البيانات في localStorage لنقلها إلى نموذج الطلب
    localStorage.setItem('chatTransferData', JSON.stringify({
        description: description,
        serviceType: 'استشارة روحانية'
    }));
    
    // التوجيه إلى صفحة تسجيل الدخول أو لوحة التحكم
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/dashboard.html';
    } else {
        window.location.href = '/login.html?transfer=chat';
    }
    
    toggleChat();
    showNotification('✅ تم نقل بياناتك. يرجى تسجيل الدخول أو إنشاء حساب لإكمال الطلب.', 'success');
    resetChat();
}

function resetChat() {
    chatState = { step: 'intro', userData: { problem: '', duration: '', previous: '' } };
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
    sessionStorage.removeItem('chat_manual_closed');
    hasAutoOpened = false;
    setTimeout(autoOpenChat, 5000);
}

function autoOpenChat() {
    const manualClosed = sessionStorage.getItem('chat_manual_closed');
    if (manualClosed === 'true') return;
    if (hasAutoOpened) return;
    hasAutoOpened = true;
    setTimeout(() => {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow && !chatWindow.classList.contains('show')) {
            chatWindow.classList.add('show');
            document.getElementById('chatInput').focus();
            const badge = document.querySelector('.chat-badge');
            if (badge) badge.style.display = 'none';
        }
    }, 3000);
}

// ===== تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    loadArticles();
    loadTestimonials();
    setTimeout(animateCounters, 600);
    setTimeout(autoOpenChat, 2000);
});