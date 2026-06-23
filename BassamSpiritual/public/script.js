// ===== الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

// ===== جلب وعرض المقالات =====
async function loadArticles() {
    try {
        const res = await fetch('/api/articles');
        const articles = await res.json();
        const container = document.getElementById('articlesContainer');
        if (!container) return;
        if (articles.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999;">سيتم إضافة مقالات قريباً...</p>';
            return;
        }
        container.innerHTML = articles.map(article => `
            <div class="article-card" onclick="openArticle(${article.id})" style="cursor:pointer;">
                <i class="${article.icon || 'fa-solid fa-book'} icon"></i>
                <h3>${article.title}</h3>
                <p>${article.summary || article.content.substring(0, 80) + '...'}</p>
                <span class="date"><i class="far fa-calendar-alt"></i> ${article.date}</span>
                <span style="display:block; margin-top:12px; color:var(--primary-gold); font-weight:600; font-size:0.85rem;">
                    <i class="fas fa-arrow-left"></i> اضغط لقراءة المزيد
                </span>
            </div>
        `).join('');
    } catch (e) {
        console.error('خطأ في تحميل المقالات', e);
    }
}

// ===== فتح المقال وعرض محتواه الكامل في المودال =====
async function openArticle(articleId) {
    try {
        const res = await fetch('/api/articles');
        const articles = await res.json();
        const article = articles.find(a => a.id === articleId);
        if (!article) {
            showNotification('⚠️ المقال غير موجود', 'error');
            return;
        }

        document.getElementById('modalArticleTitle').innerHTML = `<i class="fas fa-feather-alt"></i> ${article.title}`;
        document.getElementById('modalArticleContent').innerHTML = `
            ${article.content ? article.content.replace(/\n/g, '<br>') : '<p>لا يوجد محتوى مكتوب لهذا المقال بعد.</p>'}
            <span class="article-date"><i class="far fa-calendar-alt"></i> نشر في: ${article.date}</span>
        `;
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

document.getElementById('articleModal').addEventListener('click', function(e) {
    if (e.target === this) closeArticleModal();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeArticleModal();
});

// ===== جلب وعرض الشهادات =====
async function loadTestimonials() {
    try {
        const res = await fetch('/api/testimonials');
        const testimonials = await res.json();
        const container = document.getElementById('testimonialsContainer');
        if (!container) return;
        if (testimonials.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999;">لا توجد آراء بعد، كن أنت الأول!</p>';
            return;
        }
        container.innerHTML = testimonials.map(t => {
            const stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
            return `
                <div class="testimonial-card">
                    <div class="stars">${stars}</div>
                    <p class="content">"${t.content}"</p>
                    <div class="name">- ${t.name}</div>
                    <span class="date">${t.date}</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('خطأ في تحميل الشهادات', e);
    }
}

// ===== إرسال نموذج الطلب =====
document.getElementById('requestForm').onsubmit = async function (e) {
    e.preventDefault();
    const btn = document.querySelector('.btn-submit');
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
        phone: document.getElementById('phone').value,
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
            showNotification('✅ تم استلام طلبك بنجاح. سيتم إشعارك لاحقاً بالموافقة على طلبك أو الرفض.', 'success');
            document.getElementById('requestForm').reset();
            document.getElementById('bankDetails').style.display = 'none';
            document.getElementById('relationDiv').classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showNotification('❌ خطأ في الإرسال', 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال بالخادم', 'error');
    }
    btn.classList.remove('loading');
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
};

// ===== تأكيد الدفع =====
async function confirmPayment() {
    const code = document.getElementById('transferCode').value;
    if (!code.trim()) return showNotification('رقم الحوالة إجباري!', 'error');
    showNotification('✅ تم تأكيد التحويل. سيتم التحقق من قبل الشيخ.', 'success');
    document.getElementById('bankDetails').style.display = 'none';
    document.getElementById('requestForm').reset();
}

// ===== إظهار/إخفاء حقل العلاقة =====
document.getElementById('beneficiary').addEventListener('change', function () {
    const div = document.getElementById('relationDiv');
    if (this.value === 'غيري') div.classList.remove('hidden');
    else div.classList.add('hidden');
});

// ===== عداد الثقة =====
function animateCounters() {
    const counters = document.querySelectorAll('.counter-number');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
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

document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    loadTestimonials();
    setTimeout(animateCounters, 500);
});
