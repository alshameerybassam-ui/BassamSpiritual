// ========== api.js - مصحح ومعرب بالكامل ==========
const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

// ---------- الأدوات الأساسية ----------
function getToken() { return (localStorage.getItem(TOKEN_KEY) || '').trim(); }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch(e) { return null; } }
function setSession(token, user) { localStorage.setItem(TOKEN_KEY, token.trim()); localStorage.setItem(USER_KEY, JSON.stringify(user)); }
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

// ---------- واجهات API ----------
const AuthAPI = {
    login: (email, password) => api('POST', '/auth/login', { email, password }),
    register: (fullName, email, password, phone) => api('POST', '/auth/register', { fullName, email, password, phone }),
    verify: () => api('GET', '/auth/verify'),
    logout: () => { clearSession(); location.href = '/login.html'; }
};
const UserAPI = {
    getDashboard: () => api('GET', '/dashboard/me'),
    getRequest: (id) => api('GET', `/dashboard/request/${id}`),
    submitPayment: (id, payMethod, paySender, payNumber) => api('PUT', `/dashboard/request/${id}/submit-payment`, { paymentMethod: payMethod, paymentSenderName: paySender, paymentTransferNumber: payNumber })
};
const AdminAPI = {
    getRequests: () => api('GET', '/admin/requests'),
    acceptRequest: (id) => api('PUT', `/admin/requests/${id}/accept-initial`),
    rejectRequest: (id, reason) => api('PUT', `/admin/requests/${id}/reject-initial`, { reason }),
    approvePayment: (id) => api('PUT', `/admin/requests/${id}/approve-payment`),
    rejectPayment: (id, reason) => api('PUT', `/admin/requests/${id}/reject-payment`, { reason }),
    diagnose: (id, diagnosis, plan) => api('PUT', `/admin/requests/${id}/diagnose`, { initial_diagnosis: diagnosis, treatment_plan: plan }),
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
    saveAIInstructions: (instructions) => api('PUT', '/admin/ai-instructions', { instructions }),
    sendEngineerCommand: (command) => api('POST', '/admin/engineer-command', { command })
};

// ---------- لوحة المدير (المُصححة) ----------
const AdminModule = {
    currentId: null,
    async init() {
        if(!getToken()){ location.href='/login.html'; return; }
        try { await AuthAPI.verify(); if(!isAdmin()) throw new Error(); } catch(e) { clearSession(); location.href='/login.html'; return; }
        this.loadRequests(); this.loadAI(); this.loadArticles(); this.loadReviews();
    },
    async loadRequests() {
        try {
            const reqs = await AdminAPI.getRequests();
            const list = document.getElementById('adminRequestsList'); if(!list) return;
            document.getElementById('totalCount').textContent = reqs.length;
            document.getElementById('pendingCount').textContent = reqs.filter(r => r.status === 'pending').length;
            document.getElementById('completedCount').textContent = reqs.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('rejectedCount').textContent = reqs.filter(r => r.status === 'rejected').length;
            list.innerHTML = reqs.length ? reqs.map(r => `<button class="list-group-item list-group-item-action" onclick="AdminModule.select('${r.id}')">${r.fullname || 'بدون اسم'} - ${r.servicetype} <span class="badge ${r.status==='pending'?'badge-warning':'badge-success'}">${r.status}</span></button>`).join('') : '<p>لا توجد طلبات.</p>';
        } catch(e) { showToast('خطأ في جلب الطلبات.','error'); }
    },
    async select(id) {
        this.currentId = id;
        try {
            const req = await UserAPI.getRequest(id);
            const modalBody = document.getElementById('modalBody');
            let html = `<p><strong>المستفيد:</strong> ${req.fullname}</p><p><strong>الخدمة:</strong> ${req.servicetype}</p><p><strong>الوصف:</strong> ${req.description}</p><p><strong>الحالة:</strong> ${req.status}</p>`;
            if(req.status === 'pending') html += `<div style="margin:15px 0;"><button onclick="AdminModule.acceptInitial()" class="btn-primary">قبول</button></div>`;
            if(req.status === 'payment_submitted') { html += `<p><strong>طريقة الدفع:</strong> ${req.paymentmethod}</p><p><strong>المحول:</strong> ${req.payment_sender_name}</p><p><strong>رقم الحوالة:</strong> ${req.payment_transfer_number}</p><div style="margin:15px 0;"><button onclick="AdminModule.approvePayment()" class="btn-primary">اعتماد الدفع</button></div>`; }
            html += `<div style="margin-top:20px;"><strong>التشخيص والعلاج:</strong><textarea id="diagnosisInput" class="form-control" style="width:100%; margin:10px 0;">${req.initial_diagnosis||''}</textarea><textarea id="planInput" class="form-control" style="width:100%; margin-bottom:10px;">${req.treatment_plan||''}</textarea><button onclick="AdminModule.saveDiagnosis()" class="btn-primary">حفظ التشخيص</button></div>`;
            modalBody.innerHTML = html;
            document.getElementById('detailsModal').classList.add('show');
        } catch(e) { showToast(e.message,'error'); }
    },
    async saveDiagnosis() { 
        const d = document.getElementById('diagnosisInput').value; 
        const p = document.getElementById('planInput').value;
        await AdminAPI.diagnose(this.currentId, d, p);
        showToast('تم الحفظ'); closeModal(); 
    },
    async loadArticles() { 
        try { 
            const arts = await AdminAPI.getArticles(); 
            const tbody = document.getElementById('articlesTableBody');
            tbody.innerHTML = arts.map(a => `<tr><td>${a.title}</td><td>${a.createdat ? new Date(a.createdat).toLocaleDateString() : ''}</td><td><button onclick="AdminModule.deleteArticle('${a.id}')">حذف</button></td></tr>`).join('');
        } catch(e) {}
    },
    async deleteArticle(id) { await AdminAPI.deleteArticle(id); this.loadArticles(); }
};
