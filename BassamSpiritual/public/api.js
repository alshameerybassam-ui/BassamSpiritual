// =================================================================
// api.js - الدماغ الواحد المطلق (الإصدار النهائي الكامل)
// =================================================================

// --------------- 0. الأدوات الأساسية ---------------
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

function getToken() { return localStorage.getItem('token') || ''; }

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

// --------------- 1. الصفحة الرئيسية + المستشار الذكي (HomePage) ---------------
const HomePage = {
    articles: [],
    chatState: { step: 'intro', userData: {}, isProcessing: false },

    async init() {
        this.handleUI();
        await this.loadArticles();
        await this.loadTestimonials();
        this.animateCounters();
        this.initChat();
    },

    handleUI() {
        const token = getToken();
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const registerBtn = document.getElementById('registerBtn');
        const loginBtn = document.getElementById('loginBtn');
        const dashboardLink = document.getElementById('dashboardLink');
        const requestBtn = document.getElementById('requestBtn');
        const serviceButtons = document.querySelectorAll('.btn-service-request');

        if (token && user) {
            if (registerBtn) registerBtn.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'none';
            if (dashboardLink) {
                dashboardLink.style.display = 'inline-flex';
                dashboardLink.innerHTML = `<i class="bi bi-person-circle"></i> مرحباً، ${(user.fullName || '').split(' ')[0]}`;
            }
            if (requestBtn) { requestBtn.href = '/dashboard'; requestBtn.innerHTML = '<i class="bi bi-pencil-square"></i> حسابي ولوحة التحكم'; }
            serviceButtons.forEach(btn => btn.setAttribute('href', '/dashboard'));
        } else {
            if (registerBtn) registerBtn.style.display = 'inline-flex';
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (dashboardLink) dashboardLink.style.display = 'none';
            if (requestBtn) { requestBtn.href = '/login'; requestBtn.innerHTML = '<i class="bi bi-pencil-square"></i> قدم طلبك الآن'; }
            serviceButtons.forEach(btn => btn.setAttribute('href', '/login'));
        }
    },

    // --- المقالات ---
    async loadArticles() {
        const container = document.getElementById('articlesContainer');
        if (!container) return;
        try {
            const articles = await apiRequest('/api/articles');
            this.articles = Array.isArray(articles) ? articles : [];
        } catch (e) { this.articles = []; }
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
                <span style="display:block; margin-top:12px; color:#F5B041; font-weight:600; font-size:0.85rem;"><i class="bi bi-arrow-left-short"></i> اضغط لقراءة المزيد</span>
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
                <div style="direction:rtl; text-align:right; line-height:1.8; color:#334155; font-size:1.05rem; font-family:'Cairo';">${(article.content || '').replace(/\n/g, '<br>')}</div>
            `;
        } else {
            content.innerHTML = '<p style="text-align:center; color:#e74c3c; padding:20px;">عذراً، لم يتم العثور على المقال.</p>';
        }
    },

    closeArticleModal() {
        const modal = document.getElementById('articleModal');
        if (modal) { modal.classList.remove('show'); setTimeout(() => modal.style.display = 'none', 300); }
    },

    // --- الشهادات ---
    async loadTestimonials() {
        const container = document.getElementById('testimonialsContainer');
        if (!container) return;
        try {
            const data = await apiRequest('/api/admin/reviews');
            const testimonials = (data.success && data.reviews) ? data.reviews.filter(r => r.is_approved) : [];
            if (testimonials.length === 0) throw new Error('لا توجد شهادات');
            this.renderTestimonials(testimonials);
        } catch (e) {
            container.innerHTML = `<div class="testimonial-card"><p class="content">"الحمد لله الذي بنعمته تتم الصالحات..."</p><div class="name">- أبو عبدالله</div></div><div class="testimonial-card"><p class="content">"جلسة الرقية غيرت حال بيتي بالكامل..."</p><div class="name">- أم أحمد</div></div>`;
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

    // --- العدادات ---
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
                } else c.innerText = target;
            };
            update();
        });
    },

    // --- المستشار الذكي (مدمج) ---
    initChat() {
        const input = document.getElementById('chatInput');
        if (input) {
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendChatMessage(); });
        }
    },

    toggleChat() {
        const win = document.getElementById('chatWindow');
        if (!win) return;
        if (win.classList.contains('show')) win.classList.remove('show');
        else { win.classList.add('show'); document.getElementById('chatInput')?.focus(); }
    },

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input?.value.trim();
        if (!message || this.chatState.isProcessing) return;

        this.chatState.isProcessing = true;
        input.disabled = true;
        this.addChatBubble('user', message);
        input.value = '';

        let reply = '';
        const step = this.chatState.step;

        if (step === 'intro') {
            this.chatState.userData.problem = message;
            this.chatState.step = 'analyze';
            reply = await this.analyzeProblem(message);
        } else {
            reply = await this.analyzeProblem(message);
        }

        setTimeout(() => {
            this.addChatBubble('bot', reply);
            this.chatState.isProcessing = false;
            input.disabled = false;
            input.focus();
        }, 600);
    },

    async analyzeProblem(text) {
        const lower = text.toLowerCase();
        if (/وسواس|خوف|قلق|توتر|اكتئاب/i.test(lower)) return '🕊️ أفهم أنك تعاني من مشاعر نفسية صعبة. هذه المشاعر يمكن علاجها بإذن الله. أنصحك بتقديم طلب استشارة عبر لوحة التحكم ليتمكن الشيخ بسام من تشخيص حالتك بدقة.';
        if (/سحر|عين|حسد|مس|جن/i.test(lower)) return '🛡️ هذه أعراض روحانية تحتاج إلى تشخيص دقيق. أنصحك بتقديم طلب علاج روحي عبر لوحة التحكم.';
        if (/زواج|طلاق|أسرة|زوج/i.test(lower)) return '💑 المشاكل الأسرية تحتاج إلى حكمة. يمكنك تقديم طلب استشارة أسرية عبر لوحة التحكم.';
        return '🌙 شكراً لمشاركتك. للحصول على تشخيص دقيق وخطة علاجية، يرجى تقديم طلب عبر لوحة التحكم. حفظك الله.';
    },

    addChatBubble(role, text) {
        const body = document.getElementById('chatBody');
        if (!body) return;
        const div = document.createElement('div');
        div.className = `chat-message ${role}`;
        div.innerHTML = `<div class="message-content">${text.replace(/\n/g, '<br>')}</div>`;
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
    }
};

// دوال عامة للصفحة الرئيسية
function toggleChat() { HomePage.toggleChat(); }
function sendMessage() { HomePage.sendChatMessage(); }
function closeArticleModal() { HomePage.closeArticleModal(); }
function closeArticleModalOnOverlay(e) { if (e.target.id === 'articleModal') closeArticleModal(); }

// --------------- 2. لوحة تحكم المستفيد (DashboardPage) ---------------
const DashboardPage = {
    async init() { await this.loadProfile(); },

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
        } catch (e) { showNotification('⚠️ تعذر تحميل البيانات.', 'error'); }
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
        if (!requests.length) { container.innerHTML = '<p style="text-align:center; padding:30px;">📭 لا توجد طلبات بعد.</p>'; return; }
        const map = { 'pending': 'قيد المراجعة', 'accepted_waiting_payment': 'بانتظار الدفع', 'payment_submitted': 'جاري التحقق من الدفع', 'payment_rejected': 'تم رفض الإيصال', 'processing': 'قيد العلاج', 'completed': 'مكتمل', 'rejected_by_admin': 'تم الاعتذار', 'closed': 'مغلق' };
        container.innerHTML = `<table class="table"><thead><tr><th>#</th><th>الخدمة</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>${requests.map(r => `<tr><td>#${r.id}</td><td>${r.serviceType || 'استشارة'}</td><td>${map[r.status] || r.status}</td><td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-YE') : '—'}</td><td><button class="btn btn-sm btn-primary" onclick="DashboardPage.viewRequest('${r.id}')">فتح</button></td></tr>`).join('')}</tbody></table>`;
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
                html += `<div class="alert alert-info">الرجاء تحويل مبلغ 100 ريال وإدخال بيانات الإيصال.</div><form id="paymentForm"><input id="payMethod" class="form-control form-control-sm" placeholder="طريقة التحويل" required><input id="paySender" class="form-control form-control-sm" placeholder="اسم المحول" required><input id="payNumber" class="form-control form-control-sm" placeholder="رقم الحوالة" required><button type="submit" class="btn btn-sm btn-success w-100 mt-2">إرسال</button></form>`;
                setTimeout(() => { document.getElementById('paymentForm')?.addEventListener('submit', async (e) => { e.preventDefault(); await apiRequest(`/api/dashboard/request/${id}/submit-payment`, 'PUT', { paymentMethod: document.getElementById('payMethod').value, paymentSenderName: document.getElementById('paySender').value, paymentTransferNumber: document.getElementById('payNumber').value }); showNotification('✅ تم إرسال الإيصال.'); modalWrapper.classList.remove('show'); DashboardPage.loadProfile(); }); }, 100);
            } else if (req.status === 'completed') html += `<p><strong>العلاج:</strong> ${req.treatmentPlan || '—'}</p>`;
            modal.innerHTML = html;
            modalWrapper.classList.add('show');
        } catch (e) { showNotification('⚠️ تعذر فتح الطلب.', 'error'); }
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
        } catch (e) { showNotification('❌ فشل الإرسال.', 'error'); }
    },

    openNewRequestModal() { document.getElementById('newRequestModal')?.classList.add('show'); },
    closeNewRequestModal() { document.getElementById('newRequestModal')?.classList.remove('show'); }
};

// --------------- 3. لوحة تحكم المدير (AdminPage) ---------------
const AdminPage = {
    allRequests: [], allArticles: [],
    currentFilter: 'all',

    async init() { await this.checkAdmin(); this.switchTab('requests'); },

    async checkAdmin() {
        try {
            const data = await apiRequest('/api/auth/verify');
            if (data.user.role !== 'admin') { showNotification('⛔ غير مصرح.', 'error'); setTimeout(() => window.location.href = '/dashboard.html', 2000); return; }
        } catch (e) { window.location.href = '/login.html'; }
    },

    switchTab(tab) {
        const sidebar = document.getElementById('sidebarPanel'); if (sidebar) sidebar.classList.remove('active');
        ['requestsSection', 'articlesSection', 'reviewsSection', 'aiSection'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        const section = document.getElementById(`${tab}Section`); if (section) section.style.display = 'block';
        document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
        const activeNav = document.getElementById(`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`); if (activeNav) activeNav.classList.add('active');
        if (tab === 'requests') this.loadRequests();
        if (tab === 'articles') this.loadAdminArticles();
        if (tab === 'reviews') this.loadAdminReviews();
        if (tab === 'ai') this.loadAiInstructions();
    },

    // --- الطلبات ---
    async loadRequests() { try { this.allRequests = await apiRequest('/api/admin/requests'); this.renderFilteredTable(); this.updateStats(this.allRequests); } catch (e) { showNotification('❌ تعذر تحميل الطلبات.', 'error'); } },
    updateStats(list) { document.getElementById('totalCount').textContent = list.length; document.getElementById('pendingCount').textContent = list.filter(r => r.status === 'pending').length; document.getElementById('completedCount').textContent = list.filter(r => r.status === 'completed' || r.status === 'closed').length; document.getElementById('rejectedCount').textContent = list.filter(r => r.status === 'rejected_by_admin').length; },
    filterRequests(status, btn) { this.currentFilter = status; document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); this.renderFilteredTable(); },
    searchTable() { this.renderFilteredTable(); },
    renderFilteredTable() { const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase(); let filtered = this.allRequests; if (this.currentFilter !== 'all') { if (this.currentFilter === 'processing') filtered = filtered.filter(r => r.status === 'processing' || r.status === 'completed'); else filtered = filtered.filter(r => r.status === this.currentFilter); } if (searchTerm) filtered = filtered.filter(r => (r.fullName || '').toLowerCase().includes(searchTerm) || (r.serviceType || '').toLowerCase().includes(searchTerm)); this.renderTable(filtered); },
    renderTable(list) { const tbody = document.getElementById('requestsBody'); if (!tbody) return; if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">لا توجد طلبات.</td></tr>'; return; } const map = { 'pending': 'قيد الانتظار', 'accepted_waiting_payment': 'بانتظار الدفع', 'payment_submitted': 'مراجعة الدفع', 'processing': 'قيد العلاج', 'completed': 'مكتمل', 'rejected_by_admin': 'مرفوض', 'closed': 'مغلق' }; tbody.innerHTML = list.map((r, i) => `<tr><td>${i + 1}</td><td><strong style="color:#2C3E50; cursor:pointer; text-decoration:underline;" onclick="AdminPage.viewDetails('${r.id}')">👤 ${r.fullName || '—'}</strong></td><td>${r.email || '—'}</td><td>${r.serviceType || '—'}</td><td>${map[r.status] || r.status}</td><td>${(r.totalPaidAmount || 0) > 0 ? '💰 مدفوع' : '—'}</td><td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-YE') : '—'}</td><td><button class="action-btn edit" onclick="AdminPage.viewDetails('${r.id}')">فتح</button> <button class="action-btn delete" onclick="AdminPage.deleteRequest('${r.id}')">حذف</button></td></tr>`).join(''); },
    async viewDetails(id) { const modal = document.getElementById('detailsModal'); const body = document.getElementById('modalBody'); if (!modal || !body) return; modal.classList.add('show'); modal.style.display = 'flex'; body.innerHTML = '<p>جاري تحميل التفاصيل...</p>'; const req = this.allRequests.find(r => String(r.id) === String(id)) || {}; let html = `<div style="text-align: right; direction: rtl; line-height: 1.8;"><p><strong>👤 المستفيد:</strong> ${req.fullName || '—'}</p><p><strong>📧 البريد:</strong> ${req.email || '—'}</p><p><strong>🛠 الخدمة:</strong> ${req.serviceType || '—'}</p><p><strong>📌 الحالة:</strong> ${req.status || '—'}</p><p><strong>📝 الوصف:</strong></p><div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:12px;">${req.description || '—'}</div>`; try { const messagesRes = await apiRequest(`/api/requests/${id}/messages`); const messages = messagesRes.messages || []; if (messages.length > 0) { html += `<strong>💬 سجل المراسلات:</strong><div style="max-height:200px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:8px; margin-bottom:12px;">${messages.map(msg => { const isAdmin = msg.senderRole === 'admin'; return `<div style="margin-bottom:6px; padding:6px; background:${isAdmin ? '#e8f5e9' : '#f5f5f5'}; border-radius:6px;"><small style="color:#64748b;">${isAdmin ? 'الشيخ' : 'المستفيد'} - ${new Date(msg.createdAt).toLocaleString('ar-YE')}</small><p style="margin:4px 0 0;">${msg.messageText}</p></div>`; }).join('')}</div>`; } } catch (e) {} html += `<div style="margin-top:15px; display:flex; gap:8px; flex-wrap:wrap;">`; if (req.status === 'pending') { html += `<button onclick="AdminPage.acceptRequest('${req.id}')" style="background:#2ecc71; color:#fff; padding:10px 20px; border:none; border-radius:6px; cursor:pointer; font-family:'Cairo';">✅ قبول</button> <button onclick="AdminPage.rejectRequest('${req.id}')" style="background:#e74c3c; color:#fff; padding:10px 20px; border:none; border-radius:6px; cursor:pointer; font-family:'Cairo';">❌ رفض</button>`; } else if (req.status === 'payment_submitted') { html += `<button onclick="AdminPage.approvePayment('${req.id}')" style="background:#2ecc71; color:#fff; padding:10px 20px; border:none; border-radius:6px; cursor:pointer; font-family:'Cairo';">💰 اعتماد الدفع</button> <button onclick="AdminPage.rejectPayment('${req.id}')" style="background:#e74c3c; color:#fff; padding:10px 20px; border:none; border-radius:6px; cursor:pointer; font-family:'Cairo';">🚫 رفض الدفع</button>`; } html += `</div></div>`; body.innerHTML = html; },
    closeModal() { const modal = document.getElementById('detailsModal'); if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; } },
    async acceptRequest(id) { await apiRequest(`/api/admin/requests/${id}/accept-initial`, 'PUT'); showNotification('✅ تم قبول الطلب.'); this.closeModal(); this.loadRequests(); },
    async rejectRequest(id) { const reason = prompt('سبب الرفض (اختياري):'); await apiRequest(`/api/admin/requests/${id}/reject-initial`, 'PUT', { reason: reason || 'بدون سبب' }); showNotification('🔴 تم رفض الطلب.'); this.closeModal(); this.loadRequests(); },
    async approvePayment(id) { await apiRequest(`/api/admin/requests/${id}/approve-payment`, 'PUT'); showNotification('✅ تم اعتماد الدفع.'); this.closeModal(); this.loadRequests(); },
    async rejectPayment(id) { const reason = prompt('سبب رفض الدفع (اختياري):'); await apiRequest(`/api/admin/requests/${id}/reject-payment`, 'PUT', { reason: reason || 'بدون سبب' }); showNotification('🔴 تم رفض الدفع.'); this.closeModal(); this.loadRequests(); },
    async deleteRequest(id) { if (!confirm('متأكد من حذف الطلب نهائياً؟')) return; await apiRequest(`/api/admin/requests/${id}`, 'DELETE'); showNotification('🗑️ تم حذف الطلب.'); this.loadRequests(); },

    // --- المقالات ---
    async loadAdminArticles() { const container = document.getElementById('adminArticlesContainer'); if (!container) return; try { const articles = await apiRequest('/api/articles'); this.allArticles = articles; container.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>إدارة المقالات</h2><button onclick="AdminPage.openArticleForm()" style="background:#2ecc71; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-family:'Cairo'; font-weight:600;"><i class="bi bi-plus"></i> إضافة مقال جديد</button></div><div id="articleFormContainer" style="display:none; background:#f8fafc; padding:20px; border-radius:8px; margin-bottom:20px; border:1px solid #e2e8f0;"><form id="articleForm" onsubmit="AdminPage.saveArticle(event)"><input type="hidden" id="adminArticleId"><input id="adminArticleTitle" class="form-control" placeholder="عنوان المقال" required style="margin-bottom:10px; width:100%; padding:8px;"><input id="adminArticleSummary" class="form-control" placeholder="ملخص المقال" required style="margin-bottom:10px; width:100%; padding:8px;"><textarea id="adminArticleContent" class="form-control" placeholder="محتوى المقال" required style="margin-bottom:10px; width:100%; padding:8px; height:150px;"></textarea><button type="submit" style="background:#3498db; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-family:'Cairo'; font-weight:600;">حفظ المقال</button> <button type="button" onclick="AdminPage.closeArticleForm()" style="background:#95a5a6; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-family:'Cairo';">إلغاء</button></form></div><table><thead><tr><th>العنوان</th><th>التاريخ</th><th>الإجراءات</th></tr></thead><tbody>${articles.map(a => `<tr><td>${a.title}</td><td>${a.date || '—'}</td><td><button onclick="AdminPage.editArticle(${a.id})" style="background:#f39c12; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-left:4px;"><i class="bi bi-pencil"></i></button> <button onclick="AdminPage.deleteArticle(${a.id})" style="background:#e74c3c; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table>`; } catch (e) { container.innerHTML = '<p>تعذر تحميل المقالات.</p>'; } },
    openArticleForm(id = null) { document.getElementById('articleFormContainer').style.display = 'block'; if (id) { const art = this.allArticles.find(a => a.id == id); if (art) { document.getElementById('adminArticleId').value = art.id; document.getElementById('adminArticleTitle').value = art.title; document.getElementById('adminArticleSummary').value = art.summary; document.getElementById('adminArticleContent').value = art.content; } } else { document.getElementById('adminArticleId').value = ''; document.getElementById('adminArticleTitle').value = ''; document.getElementById('adminArticleSummary').value = ''; document.getElementById('adminArticleContent').value = ''; } },
    closeArticleForm() { document.getElementById('articleFormContainer').style.display = 'none'; },
    async saveArticle(e) { e.preventDefault(); const id = document.getElementById('adminArticleId').value; const title = document.getElementById('adminArticleTitle').value; const summary = document.getElementById('adminArticleSummary').value; const content = document.getElementById('adminArticleContent').value; const url = id ? `/api/admin/articles/${id}` : '/api/admin/articles'; const method = id ? 'PUT' : 'POST'; try { await apiRequest(url, method, { title, summary, content }); showNotification('✅ تم حفظ المقال.'); this.closeArticleForm(); this.loadAdminArticles(); } catch (e) { showNotification('❌ فشل في حفظ المقال.', 'error'); } },
    async editArticle(id) { this.openArticleForm(id); },
    async deleteArticle(id) { if (!confirm('حذف المقال؟')) return; try { await apiRequest(`/api/admin/articles/${id}`, 'DELETE'); showNotification('🗑️ تم حذف المقال.'); this.loadAdminArticles(); } catch (e) { showNotification('❌ فشل في حذف المقال.', 'error'); } },

    // --- آراء المستفيدين ---
    async loadAdminReviews() { const container = document.getElementById('adminReviewsContainer'); if (!container) return; try { const data = await apiRequest('/api/admin/reviews'); const reviews = data.reviews || []; container.innerHTML = `<h2>إدارة الآراء</h2><div style="display:flex; flex-direction:column; gap:10px;">${reviews.map(r => `<div style="background:#fff; padding:15px; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;"><div><strong>${r.full_name || 'مجهول'}</strong><p style="margin:4px 0;">${r.comment}</p><small>${r.is_approved ? '✅ منشور' : '⏳ قيد الانتظار'}</small></div><div>${!r.is_approved ? `<button onclick="AdminPage.approveReview(${r.id})" style="background:#2ecc71; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-left:4px;">نشر</button>` : ''}<button onclick="AdminPage.deleteReview(${r.id})" style="background:#e74c3c; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">حذف</button></div></div>`).join('')}</div>`; } catch (e) { container.innerHTML = '<p>تعذر تحميل الآراء.</p>'; } },
    async approveReview(id) { try { await apiRequest(`/api/admin/reviews/${id}`, 'PUT', { is_approved: true }); showNotification('✅ تم نشر الرأي.'); this.loadAdminReviews(); } catch (e) { showNotification('❌ فشل.', 'error'); } },
    async deleteReview(id) { if (!confirm('حذف الرأي؟')) return; try { await apiRequest(`/api/admin/reviews/${id}`, 'DELETE'); showNotification('🗑️ تم حذف الرأي.'); this.loadAdminReviews(); } catch (e) { showNotification('❌ فشل.', 'error'); } },

    // --- توجيه الذكاء الاصطناعي ---
    async loadAiInstructions() { const container = document.getElementById('adminAiContainer'); if (!container) return; try { const data = await apiRequest('/api/admin/ai-instructions'); const instructions = data.instructions || ''; container.innerHTML = `<h2>توجيه الذكاء الاصطناعي</h2><textarea id="aiInstructions" style="width:100%; height:200px; padding:10px; border-radius:8px; font-family:'Cairo';">${instructions}</textarea><button onclick="AdminPage.saveAiInstructions()" style="margin-top:10px; background:#2ecc71; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-family:'Cairo'; font-weight:600;">حفظ التوجيه</button>`; } catch (e) { container.innerHTML = '<p>تعذر تحميل التوجيهات.</p>'; } },
    async saveAiInstructions() { const instructions = document.getElementById('aiInstructions').value; try { await apiRequest('/api/admin/ai-instructions', 'PUT', { instructions }); showNotification('✅ تم حفظ توجيه الذكاء الاصطناعي.'); } catch (e) { showNotification('❌ فشل في الحفظ.', 'error'); } }
};

// --------------- 4. التشغيل التلقائي ---------------
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path === '/' || path.endsWith('index.html')) HomePage.init();
    else if (path.includes('dashboard')) DashboardPage.init();
    else if (path.includes('admin')) AdminPage.init();
});

console.log('✅ الدماغ الواحد (api.js) جاهز لإدارة المنصة بالكامل.');
