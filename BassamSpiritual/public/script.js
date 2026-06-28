// ===== الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

// ===== جلب وعرض المقالات (نسخة قوية مع تصحيح الأخطاء) =====
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

    } catch (e) {
        console.error('❌ خطأ في تحميل المقالات:', e.message);
        const container = document.getElementById('articlesContainer');
        if (container) {
            container.innerHTML = `<p style="text-align:center; color:#e74c3c; padding:30px;">⚠️ حدث خطأ في تحميل المقالات: ${e.message}</p>`;
        }
    }
}

// ===== فتح المقال وعرض محتواه الكامل =====
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

// ===== إغلاق المودال =====
function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// ===== إغلاق المودال عند النقر خارج المحتوى =====
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeArticleModal();
        });
    }
});

// ===== إغلاق المودال عند الضغط على زر Escape =====
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeArticleModal();
});

// ===== جلب وعرض الشهادات =====
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

// ===== إرسال نموذج الطلب =====
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('requestForm');
    if (!form) return;
    form.onsubmit = async function(e) {
        e.preventDefault();
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
                form.reset();
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
});

// ===== تأكيد الدفع =====
async function confirmPayment() {
    const code = document.getElementById('transferCode').value;
    if (!code.trim()) return showNotification('رقم الحوالة إجباري!', 'error');
    showNotification('✅ تم تأكيد التحويل. سيتم التحقق من قبل الشيخ.', 'success');
    document.getElementById('bankDetails').style.display = 'none';
    document.getElementById('requestForm').reset();
}

// ===== إظهار/إخفاء حقل العلاقة =====
document.addEventListener('DOMContentLoaded', function() {
    const beneficiary = document.getElementById('beneficiary');
    if (beneficiary) {
        beneficiary.addEventListener('change', function() {
            const div = document.getElementById('relationDiv');
            if (this.value === 'غيري') div.classList.remove('hidden');
            else div.classList.add('hidden');
        });
    }
});

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

// ===== تحميل البيانات عند فتح الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تم تحميل الصفحة بالكامل، جاري تهيئة الموقع...');
    loadArticles();
    loadTestimonials();
    setTimeout(animateCounters, 600);
});
