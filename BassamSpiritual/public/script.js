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
