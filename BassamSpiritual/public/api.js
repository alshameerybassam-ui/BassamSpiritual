// ========== api.js - الدماغ الواحد الكامل ==========
const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch(e) { return null; } }
function setSession(token, user) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); }
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }
function showToast(msg, type='success') {
    const n = document.getElementById('notification'); if(!n) return;
    n.textContent = msg; n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

async function api(method, endpoint, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const token = getToken(); if(token) opts.headers['Authorization'] = `Bearer ${token}`;
    if(body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();
    if(res.status === 401) { clearSession(); if(!location.pathname.includes('/login')) location.href = '/login.html'; throw new Error(data.error || 'انتهت الجلسة'); }
    if(!res.ok) throw new Error(data.error || 'خطأ');
    return data;
}

// ========== وحدات API ==========
const AuthAPI = {
    login: (email, password) => api('POST', '/auth/login', { email, password }),
    register: (fullName, email, password, phone) => api('POST', '/auth/register', { fullName, email, password, phone }),
    verify: () => api('GET', '/auth/verify'),
    logout: () => { clearSession(); location.href = '/login.html'; }
};

const UserAPI = {
    getDashboard: () => api('GET', '/dashboard/me'),
    submitRequest: (serviceType, description) => api('POST', '/dashboard/request', { serviceType, description }),
    getRequest: (id) => api('GET', `/dashboard/request/${id}`),
    submitPayment: (id, payMethod, paySender, payNumber) => api('PUT', `/dashboard/request/${id}/submit-payment`, { paymentMethod: payMethod, paymentSenderName: paySender, paymentTransferNumber: payNumber }),
    submitReview: (comment, rating) => api('POST', '/dashboard/reviews', { comment, rating })
};

const AdminAPI = {
    getRequests: () => api('GET', '/admin/requests'),
    acceptRequest: (id) => api('PUT', `/admin/requests/${id}/accept-initial`),
    rejectRequest: (id, reason) => api('PUT', `/admin/requests/${id}/reject-initial`, { reason }),
    approvePayment: (id) => api('PUT', `/admin/requests/${id}/approve-payment`),
    rejectPayment: (id, reason) => api('PUT', `/admin/requests/${id}/reject-payment`, { reason }),
    diagnose: (id, diagnosis, plan) => api('PUT', `/admin/requests/${id}/diagnose`, { initialDiagnosis: diagnosis, treatmentPlan: plan }),
    getMessages: (id) => api('GET', `/requests/${id}/messages`),
    sendMessage: (id, text) => api('POST', `/requests/${id}/messages`, { messageText: text }),
    getArticles: () => api('GET', '/articles'),
    createArticle: (title, summary, content) => api('POST', '/admin/articles', { title, summary, content }),
    updateArticle: (id, title, summary, content) => api('PUT', `/admin/articles/${id}`, { title, summary, content }),
    deleteArticle: (id) => api('DELETE', `/admin/articles/${id}`),
    getReviews: () => api('GET', '/admin/reviews'),
    approveReview: (id) => api('PUT', `/admin/reviews/${id}`, { isApproved: true }),
    deleteReview: (id) => api('DELETE', `/admin/reviews/${id}`),
    getAIInstructions: () => api('GET', '/admin/ai-instructions'),
    saveAIInstructions: (instructions) => api('PUT', '/admin/ai-instructions', { instructions })
};

const PublicAPI = {
    getArticles: () => fetch(API_BASE + '/articles').then(r => r.json()),
    getReviews: () => fetch(API_BASE + '/reviews').then(r => r.json()),
    aiChat: (message) => api('POST', '/ai-chat', { message })
};

// ========== الصفحة الرئيسية ==========
const HomeModule = {
    articles: [],
    async init() {
        this.updateUI();
        await this.loadArticles();
        await this.loadTestimonials();
        this.initCounters();
        this.initChat();
    },
    updateUI() {
        const token = getToken(), user = getUser();
        const reg = document.getElementById('registerBtn'), log = document.getElementById('loginBtn');
        const dash = document.getElementById('dashboardLink'), req = document.getElementById('requestBtn');
        if(token && user) {
            if(reg) reg.style.display = 'none'; if(log) log.style.display = 'none';
            if(dash) { dash.style.display = 'inline-flex'; dash.innerHTML = `<i class="bi bi-person-circle"></i> مرحباً، ${(user.full_name||'').split(' ')[0]}`; }
            if(req) { req.href = '/dashboard.html'; req.innerHTML = '<i class="bi bi-pencil-square"></i> حسابي'; }
        } else {
            if(reg) reg.style.display = 'inline-flex'; if(log) log.style.display = 'inline-flex';
            if(dash) dash.style.display = 'none';
            if(req) { req.href = '/login.html'; req.innerHTML = '<i class="bi bi-pencil-square"></i> قدم طلبك الآن'; }
        }
    },
    async loadArticles() {
        const container = document.getElementById('articlesContainer'); if(!container) return;
        try { this.articles = await PublicAPI.getArticles(); } catch(e) { this.articles = []; }
        if(!this.articles.length) { container.innerHTML = '<p style="text-align:center;padding:30px;">📚 لا توجد مقالات حالياً.</p>'; return; }
        container.innerHTML = this.articles.map(a => `
            <div class="article-card" data-id="${a.id}" style="cursor:pointer;" onclick="HomeModule.openArticle('${a.id}')">
                <i class="${a.icon||'bi bi-book'} icon"></i><h3>${a.title}</h3><p>${a.summary||''}</p>
                <span class="date"><i class="bi bi-calendar3"></i> ${a.createdAt?new Date(a.createdAt).toLocaleDateString('ar-YE'):''}</span>
            </div>
        `).join('');
    },
    openArticle(id) {
        const art = this.articles.find(a => String(a.id) === String(id));
        if(!art) return;
        const modal = document.getElementById('articleModal'), content = document.getElementById('modalArticleContent');
        if(!modal||!content) return;
        modal.style.display = 'flex'; setTimeout(() => modal.classList.add('show'), 10);
        content.innerHTML = `<h2>${art.title}</h2><p>${new Date(art.createdAt).toLocaleDateString('ar-YE')}</p><div>${(art.content||'').replace(/\n/g,'<br>')}</div>`;
    },
    closeArticleModal() { const m = document.getElementById('articleModal'); if(m){ m.classList.remove('show'); setTimeout(()=>m.style.display='none',300); } },
    async loadTestimonials() {
        const container = document.getElementById('testimonialsContainer'); if(!container) return;
        try {
            const reviews = await PublicAPI.getReviews();
            if(!reviews.length) throw new Error();
            container.innerHTML = reviews.map(r => `
                <div class="testimonial-card"><div class="stars">${'★'.repeat(r.rating||5)}</div><p class="content">${r.comment}</p><div class="name">- ${r.fullName||r.name||'مستفيد'}</div></div>
            `).join('');
        } catch(e) {
            container.innerHTML = '<div class="testimonial-card"><p class="content">"الحمد لله الذي بنعمته تتم الصالحات..."</p><div class="name">- أبو عبدالله</div></div>';
        }
    },
    initCounters() {
        const counters = document.querySelectorAll('.counter-number');
        counters.forEach(c => {
            const target = +c.getAttribute('data-target'), speed = target/50;
            const update = () => { const cur = +c.innerText; if(cur<target){ c.innerText = Math.ceil(cur+speed); setTimeout(update,20); } else c.innerText = target; };
            update();
        });
    },
    initChat() { document.getElementById('chatInputNew')?.addEventListener('keypress', e => { if(e.key==='Enter') HomeModule.sendChat(); }); },
    toggleChat() { const w = document.getElementById('chatWindowNew'); if(w) w.style.display = w.style.display==='flex'?'none':'flex'; },
    async sendChat() {
        const input = document.getElementById('chatInputNew'), msg = input?.value.trim(); if(!msg) return;
        const body = document.getElementById('chatBodyNew'); if(!body) return;
        body.innerHTML += `<div class="chat-message-m user">${msg}</div>`;
        input.value = ''; body.scrollTop = body.scrollHeight;
        try {
            const res = await PublicAPI.aiChat(msg);
            body.innerHTML += `<div class="chat-message-m bot">${res.reply}</div>`;
        } catch(e) { body.innerHTML += '<div class="chat-message-m bot">عذراً، حدث خطأ. حاول لاحقاً.</div>'; }
        body.scrollTop = body.scrollHeight;
    }
};

// دوال عامة
function toggleChatNew() { HomeModule.toggleChat(); }
function sendNewMessage() { HomeModule.sendChat(); }
function closeArticleModal() { HomeModule.closeArticleModal(); }
function closeArticleModalOnOverlay(e) { if(e.target.id==='articleModal') closeArticleModal(); }

// ========== لوحة المستفيد ==========
const DashboardModule = {
    async init() { if(!getToken()){ location.href='/login.html'; return; } await this.load(); },
    async load() {
        try {
            const data = await UserAPI.getDashboard();
            document.getElementById('welcomeMessage').innerHTML = `أهلاً بك يا <span>${data.user?.full_name||''}</span>`;
            const reqs = data.requests||[];
            const container = document.getElementById('requestStatusContainer');
            if(!reqs.length) { container.innerHTML = '<p style="text-align:center;">لم تقدم أي طلب بعد. <a href="/login.html">قدم طلبك الأول</a></p>'; return; }
            const req = reqs[0];
            let badge = '', desc = '';
            if(req.status==='pending') { badge='<span class="badge bg-warning">قيد المراجعة</span>'; desc='طلبك قيد المراجعة.'; }
            else if(req.status==='processing') { badge='<span class="badge bg-primary">تحت العلاج</span>'; desc='طلبك تحت العلاج.'; }
            else { badge='<span class="badge bg-success">مكتمل</span>'; desc='تم العلاج.'; document.getElementById('feedbackCard').style.display='block'; }
            container.innerHTML = `<div class="status-box"><div>${badge}<p>${req.serviceType}</p><p>${desc}</p></div></div>`;
            if(req.initial_diagnosis) container.innerHTML += `<div class="sheikh-notes"><h5>التشخيص:</h5><p>${req.initial_diagnosis}</p><h5>العلاج:</h5><p>${req.treatment_plan||'—'}</p></div>`;
        } catch(e) { showToast('تعذر تحميل البيانات.', 'error'); }
    }
};

document.getElementById('testimonialForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try { await UserAPI.submitReview(document.getElementById('testFeedback').value, document.getElementById('testRating').value); showToast('تم الإرسال.'); e.target.reset(); } catch(err) { showToast(err.message,'error'); }
});

// ========== لوحة المدير ==========
const AdminModule = {
    currentId: null,
    async init() {
        try { await AuthAPI.verify(); if(!isAdmin()) throw new Error(); } catch(e) { location.href='/login.html'; return; }
        await this.loadRequests();
        this.loadAI();
        this.loadArticles();
        this.loadReviews();
    },
    async loadRequests() {
        try {
            const reqs = await AdminAPI.getRequests();
            const list = document.getElementById('adminRequestsList'); if(!list) return;
            list.innerHTML = reqs.length ? reqs.map(r => `<button class="list-group-item list-group-item-action" onclick="AdminModule.select('${r.id}')">${r.fullName} - ${r.serviceType} <span class="badge bg-${r.status==='pending'?'warning':r.status==='processing'?'primary':'success'}">${r.status}</span></button>`).join('') : '<p>لا توجد طلبات.</p>';
        } catch(e) { showToast('خطأ في جلب الطلبات.', 'error'); }
    },
    async select(id) {
        this.currentId = id;
        try {
            const req = await UserAPI.getRequest(id);
            document.getElementById('adminEmptyState').classList.add('d-none');
            document.getElementById('adminDetailsCard').classList.remove('d-none');
            document.getElementById('admDetServiceType').innerText = req.serviceType;
            document.getElementById('admDetDescription').innerText = req.description;
            document.getElementById('admDetStatus').innerText = req.status;
            document.getElementById('admActionsSection').classList.toggle('d-none', req.status!=='pending');
            if(req.status==='payment_submitted') {
                document.getElementById('admPaymentReviewSection').classList.remove('d-none');
                document.getElementById('payDetMethod').innerText = req.paymentMethod||'';
                document.getElementById('payDetName').innerText = req.payment_sender_name||'';
                document.getElementById('payDetNumber').innerText = req.payment_transfer_number||'';
            } else document.getElementById('admPaymentReviewSection').classList.add('d-none');
            await this.loadMessages();
        } catch(e) { showToast(e.message,'error'); }
    },
    async loadMessages() {
        if(!this.currentId) return;
        try {
            const data = await AdminAPI.getMessages(this.currentId);
            const box = document.getElementById('admChatBox'); if(!box) return;
            box.innerHTML = data.messages.map(m => `<div class="msg-bubble ${m.senderRole==='admin'?'msg-admin':'msg-sender'}">${m.messageText}</div>`).join('');
            box.scrollTop = box.scrollHeight;
        } catch(e) {}
    },
    async acceptInitial() { await AdminAPI.acceptRequest(this.currentId); showToast('تم القبول.'); this.loadRequests(); },
    async rejectInitial() { const r = prompt('سبب الرفض:'); if(!r) return; await AdminAPI.rejectRequest(this.currentId, r); showToast('تم الرفض.'); this.loadRequests(); },
    async approvePayment() { await AdminAPI.approvePayment(this.currentId); showToast('تم اعتماد الدفع.'); this.loadRequests(); },
    async rejectPayment() { const r = prompt('سبب الرفض:'); if(!r) return; await AdminAPI.rejectPayment(this.currentId, r); showToast('تم رفض الدفع.'); this.loadRequests(); },
    async loadAI() {
        try { const r = await AdminAPI.getAIInstructions(); document.getElementById('aiPromptTextarea').value = r.instructions||''; } catch(e) {}
    },
    async saveAI() {
        try { await AdminAPI.saveAIInstructions(document.getElementById('aiPromptTextarea').value); showToast('تم الحفظ.'); } catch(e) { showToast(e.message,'error'); }
    },
    async loadArticles() {
        try {
            const arts = await AdminAPI.getArticles();
            const tbody = document.getElementById('articlesTableBody'); if(!tbody) return;
            tbody.innerHTML = arts.length ? arts.map(a => `<tr><td>${a.title}</td><td>${a.summary}</td><td><button onclick="AdminModule.editArticle('${a.id}','${a.title}','${a.summary}','${a.content}')">تعديل</button> <button onclick="AdminModule.deleteArticle('${a.id}')">حذف</button></td></tr>`).join('') : '<tr><td colspan="3">لا توجد مقالات.</td></tr>';
        } catch(e) {}
    },
    editArticle(id, title, summary, content) {
        document.getElementById('editArticleId').value = id;
        document.getElementById('artTitle').value = title;
        document.getElementById('artSummary').value = summary;
        document.getElementById('artContent').value = content;
    },
    async saveArticle(e) {
        e.preventDefault();
        const id = document.getElementById('editArticleId').value;
        const title = document.getElementById('artTitle').value;
        const summary = document.getElementById('artSummary').value;
        const content = document.getElementById('artContent').value;
        try {
            if(id) await AdminAPI.updateArticle(id, title, summary, content);
            else await AdminAPI.createArticle(title, summary, content);
            showToast('تم الحفظ.'); this.loadArticles(); e.target.reset(); document.getElementById('editArticleId').value = '';
        } catch(err) { showToast(err.message,'error'); }
    },
    async deleteArticle(id) { if(!confirm('حذف؟')) return; await AdminAPI.deleteArticle(id); showToast('تم الحذف.'); this.loadArticles(); },
    async loadReviews() {
        try {
            const data = await AdminAPI.getReviews();
            const tbody = document.getElementById('reviewsTableBody'); if(!tbody) return;
            tbody.innerHTML = data.reviews.length ? data.reviews.map(r => `<tr><td>${r.fullName}</td><td>${r.comment}</td><td>${r.isApproved?'منشور':'معلق'}</td><td><button onclick="AdminModule.approveReview(${r.id})">نشر</button> <button onclick="AdminModule.deleteReview(${r.id})">حذف</button></td></tr>`).join('') : '<tr><td colspan="4">لا توجد تقييمات.</td></tr>';
        } catch(e) {}
    },
    async approveReview(id) { await AdminAPI.approveReview(id); showToast('تم النشر.'); this.loadReviews(); },
    async deleteReview(id) { if(!confirm('حذف؟')) return; await AdminAPI.deleteReview(id); showToast('تم الحذف.'); this.loadReviews(); }
};

// أحداث عامة
document.getElementById('articleForm')?.addEventListener('submit', e => AdminModule.saveArticle(e));
document.getElementById('aiPromptForm')?.addEventListener('submit', e => { e.preventDefault(); AdminModule.saveAI(); });
document.getElementById('admMessageForm')?.addEventListener('submit', async e => {
    e.preventDefault(); const t = document.getElementById('admMessageText').value; if(!t.trim()) return;
    await AdminAPI.sendMessage(AdminModule.currentId, t); document.getElementById('admMessageText').value = ''; AdminModule.loadMessages();
});
document.getElementById('diagnoseForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    await AdminAPI.diagnose(AdminModule.currentId, document.getElementById('admDiagnosis').value, document.getElementById('admPlan').value);
    showToast('تم التشخيص.'); AdminModule.loadRequests();
});

// التشغيل التلقائي
document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname;
    if(path==='/'||path.endsWith('index.html')) HomeModule.init();
    else if(path.includes('dashboard')) DashboardModule.init();
    else if(path.includes('admin')) AdminModule.init();
});
