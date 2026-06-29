function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

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
            card.addEventListener('click', function(e) {
                const id = parseInt(this.getAttribute('data-id'));
                console.log('🖱️ تم النقر على المقال رقم:', id);
                if (id) openArticle(id);
            });
        });
    } catch (e) {
        console.error('❌ خطأ في تحميل المقالات:', e.message);
        const container = document.getElementById('articlesContainer');
        if (container) {
            container.innerHTML = `<p style="text-align:center; color:#e74c3c; padding:30px;">⚠️ حدث خطأ في تحميل المقالات: ${e.message}</p>`;
        }
    }
}

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
            return;
        }
        modalTitle.innerHTML = `<i class="fas fa-feather-alt"></i> ${article.title}`;
        let contentHtml = article.content ? article.content.replace(/\n/g, '<br>') : '<p>لا يوجد محتوى مكتوب لهذا المقال بعد.</p>';
        contentHtml += `<span class="article-date"><i class="far fa-calendar-alt"></i> نشر في: ${article.date || 'تاريخ غير محدد'}</span>`;
        modalContent.innerHTML = contentHtml;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error('❌ خطأ في فتح المقال:', e);
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
        console.error('❌ خطأ في تحميل الشهادات:', e);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('requestForm');
    if (!form) return;

    const beneficiary = document.getElementById('beneficiary');
    if (beneficiary) {
        beneficiary.addEventListener('change', function() {
            const div = document.getElementById('relationDiv');
            if (this.value === 'غيري') div.classList.remove('hidden');
            else div.classList.add('hidden');
        });
    }

    form.onsubmit = async function(e) {
        e.preventDefault();

        const contactMethod = document.getElementById('contactMethod').value;
        const phone = document.getElementById('phone').value.trim();
        if (contactMethod === 'whatsapp' && !phone) {
            showNotification('⚠️ إذا اخترت التواصل عبر واتساب، يرجى إدخال رقم هاتفك.', 'error');
            return;
        }

        const btn = document.querySelector('.btn-submit');
        if (!btn) return;
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        const data = {
            fullName: document.getElementById('fullName').value,
            country: document.getElementById('country').value,
            gender: document.getElementById('gender').value,
            beneficiary: document.getElementById('beneficiary').value,
            relation: document.getElementById('relation').value,
            serviceType: document.getElementById('serviceType').value,
            description: document.getElementById('description').value,
            contactMethod: document.getElementById('contactMethod').value,
            phone: phone,
            email: document.getElementById('email').value
        };

        try {
            const res = await fetch('/api/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (json.success) {
                showNotification('✅ تم استلام طلبك بنجاح. سنقوم بمراجعته وإشعارك عبر وسيلة التواصل التي اخترتها.', 'success');
                form.reset();
                document.getElementById('relationDiv').classList.add('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showNotification('❌ حدث خطأ في الإرسال. يرجى المحاولة مرة أخرى.', 'error');
            }
        } catch (e) {
            showNotification('⚠️ خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.', 'error');
        }
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
    };
});

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
            if (key === 'علاج') service = 'علاج العين والحسد والأسحار (200 ر.س)';
            else if (key === 'صوتي') service = 'جلسة صوتية مباشرة (500 ر.س)';
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
    } else if (service === 'علاج العين والحسد والأسحار (200 ر.س)') {
        return `
            <strong>🛡️ الخدمة الموصى بها:</strong> علاج العين والحسد والأسحار والرصد (200 ر.س)<br><br>
            يبدو أنك تعاني من أعراض قد تكون مرتبطة بالعين أو الحسد أو السحر. نوصي بجلسة علاجية شاملة.<br>
            <strong>المدة:</strong> جلسة واحدة (قابلة للتمديد)<br>
            <strong>طريقة التواصل:</strong> عبر واتساب (نصي/صوتي)
        `;
    } else if (service === 'جلسة صوتية مباشرة (500 ر.س)') {
        return `
            <strong>🎧 الخدمة الموصى بها:</strong> جلسة صوتية مباشرة مع الشيخ بسام (500 ر.س)<br><br>
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
    document.getElementById('description').value = description;

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

    toggleChat();
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
    showNotification('✅ تم نقل بياناتك إلى نموذج الطلب! راجع التفاصيل وأكمل الإرسال.', 'success');
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تم تحميل الصفحة بالكامل، جاري تهيئة الموقع...');
    loadArticles();
    loadTestimonials();
    setTimeout(animateCounters, 600);
    setTimeout(autoOpenChat, 2000);
});
