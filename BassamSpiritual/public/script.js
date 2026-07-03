// ==============================================
// الإشعارات العامة
// ==============================================
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 6000);
}

// ==============================================
// التحقق من الجلسة في الواجهة الرئيسية
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
// المساعد الذكي (المدمج مع DeepSeek)
// ==============================================
let chatState = {
    step: 'intro',
    userData: { problem: '', duration: '', previous: '' },
    isProcessing: false
};
let hasAutoOpened = false;
let chatFreeMessages = 20;

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
        // تحديث رصيد الرسائل عند فتح النافذة
        updateChatCredits();
    }
}

// ===== إرسال رسالة إلى المساعد الذكي =====
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message || chatState.isProcessing) return;

    // التحقق من وجود توكن (مستخدم مسجل)
    const token = localStorage.getItem('token');
    
    chatState.isProcessing = true;
    input.disabled = true;
    const statusDiv = document.getElementById('chatStatus') || createChatStatus();

    // عرض رسالة المستخدم فوراً
    const container = document.getElementById('chatBody');
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-message user';
    userDiv.innerHTML = `<div class="message-content">${message}</div>`;
    container.appendChild(userDiv);
    container.scrollTop = container.scrollHeight;
    input.value = '';

    statusDiv.textContent = '⏳ جاري التفكير...';

    try {
        const res = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        // إذا كانت الرسالة تتطلب تسجيل الدخول
        if (res.status === 401) {
            statusDiv.innerHTML = `
                ⚠️ للاستمرار في المحادثة، يرجى <a href="/login.html" style="color:#F5B041; font-weight:700;">تسجيل الدخول</a> أو <a href="/register.html" style="color:#F5B041; font-weight:700;">إنشاء حساب</a>.
                <br><span style="font-size:0.8rem; color:#888;">(بعد التسجيل، ستحصل على 20 رسالة مجانية)</span>
            `;
            showNotification('⚠️ يرجى تسجيل الدخول للاستمرار في المحادثة.', 'error');
            chatState.isProcessing = false;
            input.disabled = false;
            input.focus();
            return;
        }

        if (data.requiresPayment) {
            statusDiv.innerHTML = `
                ⚠️ لقد استهلكت جميع رسائلك المجانية (20 رسالة).
                <br>للاستمرار، يرجى <a href="/login.html" style="color:#F5B041; font-weight:700;">تسجيل الدخول</a> أو <a href="/register.html" style="color:#F5B041; font-weight:700;">إنشاء حساب</a>.
                <br><span style="font-size:0.8rem; color:#888;">(المستخدمون المسجلون يحصلون على 20 رسالة مجانية)</span>
            `;
            showNotification('⚠️ انتهت رسائلك المجانية. سجل الدخول للاستمرار.', 'error');
            chatState.isProcessing = false;
            input.disabled = false;
            input.focus();
            return;
        }

        if (data.success) {
            // تحديث عداد الرسائل المتبقية
            const remaining = data.freeMessagesLimit - (data.freeMessagesUsed || 0);
            statusDiv.textContent = `✅ رسائل متبقية: ${remaining}`;
            
            // عرض رد المساعد
            const botDiv = document.createElement('div');
            botDiv.className = 'chat-message bot';
            botDiv.innerHTML = `<div class="message-content">${data.reply}</div>`;
            container.appendChild(botDiv);
            container.scrollTop = container.scrollHeight;

            // تحديث العداد في الأعلى إذا كان موجوداً
            const remainingSpan = document.getElementById('chatRemaining');
            if (remainingSpan) remainingSpan.textContent = remaining;
        } else {
            statusDiv.textContent = '❌ ' + (data.error || 'حدث خطأ');
            showNotification('❌ ' + (data.error || 'حدث خطأ'), 'error');
        }
    } catch (e) {
        console.error('❌ خطأ في المساعد الذكي:', e);
        statusDiv.textContent = '⚠️ خطأ في الاتصال بالخادم. حاول مرة أخرى.';
        showNotification('⚠️ خطأ في الاتصال بالخادم.', 'error');
    }

    chatState.isProcessing = false;
    input.disabled = false;
    input.focus();
}

// ===== إنشاء عنصر حالة المحادثة إذا لم يكن موجوداً =====
function createChatStatus() {
    let status = document.getElementById('chatStatus');
    if (!status) {
        const footer = document.querySelector('.chat-footer');
        status = document.createElement('div');
        status.id = 'chatStatus';
        status.style.cssText = 'margin-top:8px; font-size:0.85rem; color:#6A7A8A; text-align:center;';
        footer.parentNode.insertBefore(status, footer.nextSibling);
    }
    return status;
}

// ===== تحديث رصيد الرسائل =====
async function updateChatCredits() {
    const token = localStorage.getItem('token');
    if (!token) {
        const status = document.getElementById('chatStatus') || createChatStatus();
        status.innerHTML = `
            🔓 غير مسجل. <a href="/login.html" style="color:#F5B041; font-weight:700;">سجل الدخول</a> للحصول على 20 رسالة مجانية.
        `;
        return;
    }
    try {
        const res = await fetch('/api/chat/credits', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            const remainingSpan = document.getElementById('chatRemaining');
            if (remainingSpan) remainingSpan.textContent = data.remaining;
            const status = document.getElementById('chatStatus') || createChatStatus();
            if (data.remaining > 0) {
                status.textContent = `✅ رسائل متبقية: ${data.remaining}`;
            } else {
                status.innerHTML = `
                    ⚠️ انتهت رسائلك المجانية. <a href="/login.html" style="color:#F5B041; font-weight:700;">اشترك الآن</a> للاستمرار.
                `;
            }
        }
    } catch (e) {
        console.error('فشل تحديث رصيد الرسائل:', e);
    }
}

// ===== فتح الدردشة تلقائياً (مرة واحدة) =====
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
            updateChatCredits();
        }
    }, 3000);
}

// ===== إضافة حدث Enter في حقل الإدخال =====
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

// ===== تحميل المقالات والشهادات (الكود القديم) =====
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

// ===== تهيئة الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تم تحميل الصفحة بالكامل...');
    loadArticles();
    loadTestimonials();
    setTimeout(animateCounters, 600);
    setTimeout(autoOpenChat, 2000);
    
    // تحديث رصيد الرسائل كل 30 ثانية
    setInterval(updateChatCredits, 30000);
});
