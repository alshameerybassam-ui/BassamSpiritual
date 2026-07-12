// =================================================================
// api.js - الدماغ الواحد الموحد للمنصة (v3.0)
// =================================================================

// -------------------------------------------------------------------
// 0. الأدوات المساعدة العامة
// -------------------------------------------------------------------
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

function getToken() {
    return localStorage.getItem('token') || '';
}

function getHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

async function apiRequest(url, method = 'GET', body = null) {
    const options = { method, headers: getHeaders() };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'خطأ في الاتصال بالخادم');
    return data;
}

// -------------------------------------------------------------------
// 1. منطق الصفحة الرئيسية (index.html)
// -------------------------------------------------------------------
const HomePage = {
    articles: [],

    async init() {
        this.handleUI();
        await this.loadArticles();
        await this.loadTestimonials();
        this.animateCounters();
    },

    handleUI() {
        const token = getToken();
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
    },

    async loadArticles() {
        const container = document.getElementById('articlesContainer');
        if (!container) return;

        try {
            const articles = await apiRequest('/api/articles');
            this.articles = Array.isArray(articles) ? articles : [];
        } catch (e) {
            this.articles = [];
        }

        if (this.articles.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">📚 سيتم إضافة مقالات قريباً...</p>';
            return;
        }

        container.innerHTML = this.articles.map(art => `
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
                if (id) HomePage.openArticle(id);
            });
        });
    },

    openArticle(id) {
        const modal = document.getElementById('articleModal');
        const content = document.getElementById('modalArticleContent');
        if (!modal || !content) return;

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        content.innerHTML = '<p style="text-align:center; padding:20px;"><i class="bi bi-arrow-clockwise btn-spin"></i> جاري التحميل...</p>';

        const article = this.articles.find(a => String(a.id) === String(id));
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
    },

    closeArticleModal() {
        const modal = document.getElementById('articleModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    },

    async loadTestimonials() {
        const container = document.getElementById('testimonialsContainer');
        if (!container) return;

        try {
            const data = await apiRequest('/api/admin/reviews');
            const testimonials = (data.success && data.reviews) ? data.reviews.filter(r => r.is_approved) : [];
            if (testimonials.length === 0) throw new Error('لا توجد شهادات');
            this.renderTestimonials(testimonials);
        } catch (e) {
            container.innerHTML = `
                <div class="testimonial-card"><p class="content">"الحمد لله الذي بنعمته تتم الصالحات..."</p><div class="name">- أبو عبدالله</div></div>
                <div class="testimonial-card"><p class="content">"جلسة الرقية غيرت حال بيتي بالكامل..."</p><div class="name">- أم أحمد</div></div>
            `;
        }
    },

    renderTestimonials(testimonials) {
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
    },

    animateCounters() {
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
    },

    toggleChat() {
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
};

// دوال عامة للصفحة الرئيسية
function closeArticleModal() { HomePage.closeArticleModal(); }
function closeArticleModalOnOverlay(e) { if (e.target.id === 'articleModal') closeArticleModal(); }
function toggleChat() { HomePage.toggleChat(); }

// -------------------------------------------------------------------
// 2. منطق لوحة تحكم المستفيد (dashboard.html)
// -------------------------------------------------------------------
const DashboardPage = {
    async init() {
        await this.loadProfile();
    },

    async loadProfile() {
        try {
            const data = await apiRequest('/api/dashboard/me');
            const user = data.user;
            const requests = data.requests || [];

            document.getElementById('userName').innerHTML = `مرحباً، <span>${user.fullName}</span>`;
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('sidebarName').textContent = user.fullName;
            document.getElementById('sidebarEmail').textContent = user.email;
            document.getElementById('sidebarJoined').textContent = new Date().toLocaleDateString('ar-YE');

            this.renderRequests(requests);
            this.updateStats(requests);
        } catch (e) {
            showNotification('⚠️ تعذر تحميل البيانات.', 'error');
        }
    },

    updateStats(requests) {
        document.getElementById('statTotal').textContent = requests.length;
        document.getElementById('statPending').textContent = requests.filter(r => r.status === 'pending').length;
        document.getElementById('statCompleted').textContent = requests.filter(r => r.status === 'completed' || r.status === 'closed').length;
        document.getElementById('statRejected').textContent = requests.filter(r => r.status === 'rejected_by_admin').length;
    },

    renderRequests(requests) {
        const container = document.getElementById('requestsList');
        if (!container) return;
        if (!requests.length) {
            container.innerHTML = '<p style="text-align:center; padding:30px;">📭 لا توجد طلبات بعد.</p>';
            return;
        }

        const map = {
            'pending': 'قيد المراجعة',
            'accepted_waiting_payment': 'بانتظار الدفع',
            'payment_submitted': 'جاري التحقق من الدفع',
            'payment_rejected': 'تم رفض الإيصال',
            'processing': 'قيد العلاج',
            'completed': 'مكتمل',
            'rejected_by_admin': 'تم الاعتذار',
            'closed': 'مغلق'
        };

        container.innerHTML = `
            <table class="table">
                <thead><tr><th>#</th><th>الخدمة</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
                <tbody>
                    ${requests.map(r => `
                        <tr>
                            <td>#${r.id}</td>
                            <td>${r.serviceType || 'استشارة'}</td>
                            <td>${map[r.status] || r.status}</td>
                            <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-YE') : '—'}</td>
                            <td><button class="btn btn-sm btn-primary" onclick="DashboardPage.viewRequest('${r.id}')">فتح</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    async viewRequest(id) {
        try {
            const data = await apiRequest(`/api/dashboard/request/${id}`);
            const req = data.request;
            const modal = document.getElementById('requestDetailsContainer');
            const modalWrapper = document.getElementById('viewRequestModal');
            if (!modal || !modalWrapper) return;

            let html = `<p><strong>الخدمة:</strong> ${req.serviceType}</p><p><strong>الوصف:</strong> ${req.description}</p><hr>`;

            if (req.status === 'accepted_waiting_payment' || req.status === 'payment_rejected') {
                html += `
                    <div class="alert alert-info">الرجاء تحويل مبلغ 100 ريال وإدخال بيانات الإيصال.</div>
                    <form id="paymentForm">
                        <input id="payMethod" class="form-control form-control-sm" placeholder="طريقة التحويل" required>
                        <input id="paySender" class="form-control form-control-sm" placeholder="اسم المحول" required>
                        <input id="payNumber" class="form-control form-control-sm" placeholder="رقم الحوالة" required>
                        <button type="submit" class="btn btn-sm btn-success w-100 mt-2">إرسال</button>
                    </form>
                `;
                setTimeout(() => {
                    document.getElementById('paymentForm')?.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        await apiRequest(`/api/dashboard/request/${id}/submit-payment`, 'PUT', {
                            paymentMethod: document.getElementById('payMethod').value,
                            paymentSenderName: document.getElementById('paySender').value,
                            paymentTransferNumber: document.getElementById('payNumber').value
                        });
                        showNotification('✅ تم إرسال الإيصال.');
                        modalWrapper.classList.remove('show');
                        DashboardPage.loadProfile();
                    });
                }, 100);
            } else if (req.status === 'completed') {
                html += `<p><strong>العلاج:</strong> ${req.treatment_plan || '—'}</p>`;
            }

            modal.innerHTML = html;
            modalWrapper.classList.add('show');
        } catch (e) {
            showNotification('⚠️ تعذر فتح الطلب.', 'error');
        }
    },

    async submitNewRequest(e) {
        e.preventDefault();
        const serviceType = document.getElementById('reqServiceType')?.value;
        const description = document.getElementById('reqDescription')?.value.trim();
        if (!description) return showNotification('⚠️ اكتب وصفاً للحالة.', 'error');
        try {
            await apiRequest('/api/dashboard/request', 'POST', { serviceType, description });
            showNotification('✅ تم تقديم الطلب.');
            this.closeNewRequestModal();
            this.loadProfile();
        } catch (e) {
            showNotification('❌ فشل الإرسال.', 'error');
        }
    },

    openNewRequestModal() {
        document.getElementById('newRequestModal')?.classList.add('show');
    },
    closeNewRequestModal() {
        document.getElementById('newRequestModal')?.classList.remove('show');
    }
};

// -------------------------------------------------------------------
// 3. منطق لوحة تحكم الشيخ (admin.html)
// -------------------------------------------------------------------
const AdminPage = {
    allRequests: [],

    async init() {
        await this.checkAdmin();
        this.switchTab('requests');
    },

    async checkAdmin() {
        try {
            const data = await apiRequest('/api/auth/verify');
            if (data.user.role !== 'admin') {
                showNotification('⛔ غير مصرح.', 'error');
                setTimeout(() => window.location.href = '/dashboard.html', 2000);
                return;
            }
        } catch (e) {
            window.location.href = '/login.html';
        }
    },

    switchTab(tab) {
        ['requestsSection', 'articlesSection', 'reviewsSection', 'aiSection'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const section = document.getElementById(`${tab}Section`);
        if (section) section.style.display = 'block';

        if (tab === 'requests') this.loadRequests();
        if (tab === 'articles') this.loadAdminArticles();
    },

    async loadRequests() {
        try {
            this.allRequests = await apiRequest('/api/admin/requests');
            this.renderTable(this.allRequests);
            this.updateStats(this.allRequests);
        } catch (e) {
            showNotification('❌ تعذر تحميل الطلبات.', 'error');
        }
    },

    updateStats(list) {
        document.getElementById('totalCount').textContent = list.length;
        document.getElementById('pendingCount').textContent = list.filter(r => r.status === 'pending').length;
        document.getElementById('completedCount').textContent = list.filter(r => r.status === 'completed' || r.status === 'closed').length;
        document.getElementById('rejectedCount').textContent = list.filter(r => r.status === 'rejected_by_admin').length;
    },

    renderTable(list) {
        const tbody = document.getElementById('requestsBody');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">لا توجد طلبات.</td></tr>';
            return;
        }

        const map = {
            'pending': 'قيد الانتظار',
            'accepted_waiting_payment': 'بانتظار الدفع',
            'payment_submitted': 'مراجعة الدفع',
            'processing': 'قيد العلاج',
            'completed': 'مكتمل',
            'rejected_by_admin': 'مرفوض',
            'closed': 'مغلق'
        };

        tbody.innerHTML = list.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${r.fullName || '—'}</td>
                <td>${r.email || '—'}</td>
                <td>${r.serviceType || '—'}</td>
                <td>${map[r.status] || r.status}</td>
                <td>${(r.totalPaidAmount || 0) > 0 ? '💰 مدفوع' : '—'}</td>
                <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-YE') : '—'}</td>
                <td>
                    <button class="action-btn edit" onclick="AdminPage.viewDetails('${r.id}')">فتح</button>
                    <button class="action-btn delete" onclick="AdminPage.deleteRequest('${r.id}')">حذف</button>
                </td>
            </tr>
        `).join('');
    },

    async viewDetails(id) {
        const modal = document.getElementById('detailsModal');
        const body = document.getElementById('modalBody');
        if (!modal || !body) return;

        modal.classList.add('show');
        modal.style.display = 'flex';
        body.innerHTML = '<p>جاري التحميل...</p>';

        const req = this.allRequests.find(r => String(r.id) === String(id)) || {};
        let html = `
            <p><strong>المستفيد:</strong> ${req.fullName}</p>
            <p><strong>الخدمة:</strong> ${req.serviceType}</p>
            <p><strong>الحالة:</strong> ${req.status}</p>
            <p><strong>الوصف:</strong> ${req.description || '—'}</p>
            <hr>
        `;

        if (req.status === 'pending') {
            html += `
                <button onclick="AdminPage.acceptRequest('${req.id}')" style="background:#2ecc71; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">قبول</button>
                <button onclick="AdminPage.rejectRequest('${req.id}')" style="background:#e74c3c; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">رفض</button>
            `;
        } else if (req.status === 'payment_submitted') {
            html += `
                <p><strong>الإيصال:</strong> ${req.paymentSenderName} - ${req.paymentTransferNumber}</p>
                <button onclick="AdminPage.approvePayment('${req.id}')" style="background:#2ecc71; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">اعتماد الدفع</button>
                <button onclick="AdminPage.rejectPayment('${req.id}')" style="background:#e74c3c; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">رفض الدفع</button>
            `;
        }

        body.innerHTML = html;
    },

    closeModal() {
        const modal = document.getElementById('detailsModal');
        if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
    },

    async acceptRequest(id) { await apiRequest(`/api/admin/requests/${id}/accept-initial`, 'PUT'); this.closeModal(); this.loadRequests(); },
    async rejectRequest(id) {
        const reason = prompt('سبب الرفض:'); if (!reason) return;
        await apiRequest(`/api/admin/requests/${id}/reject-initial`, 'PUT', { reason });
        this.closeModal(); this.loadRequests();
    },
    async approvePayment(id) { await apiRequest(`/api/admin/requests/${id}/approve-payment`, 'PUT'); this.closeModal(); this.loadRequests(); },
    async rejectPayment(id) {
        const reason = prompt('سبب رفض الدفع:'); if (!reason) return;
        await apiRequest(`/api/admin/requests/${id}/reject-payment`, 'PUT', { reason });
        this.closeModal(); this.loadRequests();
    },
    async deleteRequest(id) {
        if (!confirm('متأكد من حذف الطلب؟')) return;
        await apiRequest(`/api/admin/requests/${id}`, 'DELETE');
        this.loadRequests();
    },

    async loadAdminArticles() {
        const container = document.getElementById('articlesSection');
        if (!container) return;
        try {
            const articles = await apiRequest('/api/articles');
            container.innerHTML = `
                <h2>المقالات</h2>
                <table><thead><tr><th>العنوان</th><th>التاريخ</th></tr></thead>
                    <tbody>${articles.map(a => `<tr><td>${a.title}</td><td>${a.date || '—'}</td></tr>`).join('')}</tbody>
                </table>
            `;
        } catch (e) {
            container.innerHTML = '<p>تعذر تحميل المقالات.</p>';
        }
    }
};

// -------------------------------------------------------------------
// 4. التهيئة التلقائية حسب الصفحة
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    if (path === '/' || path.endsWith('index.html')) {
        HomePage.init();
    } else if (path.includes('dashboard')) {
        DashboardPage.init();
    } else if (path.includes('admin')) {
        AdminPage.init();
    }
});

console.log('✅ الدماغ الواحد (api.js) جاهز لإدارة المنصة بالكامل.');
