// =================================================================
// script.js - المنطق الأمامي للصفحة الرئيسية (v2.0 - موحد)
// =================================================================

// -------------------------------------------------------------------
// 1. الإشعارات
// -------------------------------------------------------------------
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

// -------------------------------------------------------------------
// 2. واجهة المستخدم (الأزرار والجلسة)
// -------------------------------------------------------------------
(function handleUI() {
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
            dashboardLink.innerHTML = `<i class="bi bi-person-circle"></i> مرحباً، ${(user.fullName || '').split(' ')[0]}`;
        }
        if (requestBtn) {
            requestBtn.href = '/dashboard';
            requestBtn.innerHTML = '<i class="bi bi-pencil-square"></i> حسابي ولوحة التحكم';
        }
    } else {
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (requestBtn) {
            requestBtn.href = '/login';
            requestBtn.innerHTML = '<i class="bi bi-pencil-square"></i> قدم طلبك الآن';
        }
    }
})();

// -------------------------------------------------------------------
// 3. المقالات (مرتبطة بـ API)
// -------------------------------------------------------------------
let allArticles = [];

async function displayBlogArticles() {
    const container = document.getElementById('articlesContainer');
    if (!container) return;

    try {
        const articles = await API.articles.getAll();
        allArticles = Array.isArray(articles) ? articles : [];
    } catch (e) {
        console.warn('تعذر جلب المقالات من الخادم، سيتم استخدام المحتوى الاحتياطي.');
        allArticles = [];
    }

    if (allArticles.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">📚 سيتم إضافة مقالات قريباً...</p>';
        return;
    }

    container.innerHTML = allArticles.map(art => `
        <div class="article-card" data-id="${art.id}" style="cursor:pointer;">
            <i class="${art.icon || 'bi bi-book'} icon"></i>
            <h3>${art.title}</h3>
            <p>${art.summary || ''}</p>
            <span class="date"><i class="bi bi-calendar3"></i> ${art.date || ''}</span>
            <span style="display:block; margin-top:12px; color:#F5B041; font-weight:600; font-size:0.85rem;">
                <i class="bi bi-arrow-left-short"></i> اضغط لقراءة المزيد
            </span>
        </div>
    `).join('');

    container.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            if (id) openArticle(id);
        });
    });
}

async function openArticle(id) {
    const modal = document.getElementById('articleModal');
    const content = document.getElementById('modalArticleContent');
    if (!modal || !content) return;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    content.innerHTML = '<p style="text-align:center; padding:20px;"><i class="bi bi-arrow-clockwise btn-spin"></i> جاري التحميل...</p>';

    const article = allArticles.find(a => String(a.id) === String(id));

    if (article) {
        content.innerHTML = `
            <div class="modal-article-header">
                <div class="badge-icon"><i class="${article.icon || 'bi bi-feather'}"></i></div>
                <h2>${article.title}</h2>
                <div style="font-size:0.85rem; color:#94a3b8; margin-top:8px;"><i class="bi bi-calendar3"></i> ${article.date || ''}</div>
            </div>
            <div style="direction:rtl; text-align:right; line-height:1.8; color:#334155; font-size:1.05rem; font-family:'Cairo';">
                ${(article.content || '').replace(/\n/g, '<br>')}
            </div>
        `;
    } else {
        content.innerHTML = '<p style="text-align:center; color:#e74c3c; padding:20px;">عذراً، لم يتم العثور على المقال.</p>';
    }
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function closeArticleModalOnOverlay(e) {
    if (e.target.id === 'articleModal') closeArticleModal();
}

// -------------------------------------------------------------------
// 4. الشهادات (مرتبطة بـ API)
// -------------------------------------------------------------------
async function loadTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;

    try {
        const res = await fetch('/api/admin/reviews');
        const data = await res.json();
        const testimonials = (data.success && data.reviews) ? data.reviews.filter(r => r.is_approved) : [];
        if (testimonials.length === 0) throw new Error('لا توجد شهادات');
        renderTestimonials(testimonials);
    } catch (e) {
        // احتياطي بسيط
        container.innerHTML = `
            <div class="testimonial-card">
                <p class="content">"الحمد لله الذي بنعمته تتم الصالحات، بفضل الله ثم توجيهات الشيخ بسام تخلصت من ضيق الصدر."</p>
                <div class="name">- أبو عبدالله</div>
            </div>
            <div class="testimonial-card">
                <p class="content">"جلسة الرقية والتحصين غيرت حال بيتي بالكامل، جزاكم الله كل خير."</p>
                <div class="name">- أم أحمد</div>
            </div>
        `;
    }
}

function renderTestimonials(testimonials) {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;
    container.innerHTML = testimonials.map(t => `
        <div class="testimonial-card">
            <div class="stars" style="color:#F5B041;">${'★'.repeat(t.rating || 5)}</div>
            <p class="content">"${t.content || t.comment}"</p>
            <div class="name">- ${t.name || t.full_name}</div>
            <span class="date">${t.date || ''}</span>
        </div>
    `).join('');
}

// -------------------------------------------------------------------
// 5. العدادات
// -------------------------------------------------------------------
function animateCounters() {
    const counters = document.querySelectorAll('.counter-number');
    counters.forEach(c => {
        const target = +c.getAttribute('data-target');
        const speed = target / 50;
        const update = () => {
            const cur = +c.innerText;
            if (cur < target) {
                c.innerText = Math.ceil(cur + speed);
                setTimeout(update, 20);
            } else {
                c.innerText = target;
            }
        };
        update();
    });
}

// -------------------------------------------------------------------
// 6. الدردشة (مربوطة بـ chat-engine.js)
// -------------------------------------------------------------------
function toggleChat() {
    const win = document.getElementById('chatWindow');
    if (!win) return;
    if (win.classList.contains('show')) {
        win.classList.remove('show');
    } else {
        win.classList.add('show');
        const input = document.getElementById('chatInput');
        if (input) input.focus();
    }
}

// -------------------------------------------------------------------
// 7. التهيئة
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    displayBlogArticles();
    loadTestimonials();
    setTimeout(animateCounters, 600);
});
