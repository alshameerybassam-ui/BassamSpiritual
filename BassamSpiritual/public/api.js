/**
 * ملف api.js - النسخة النهائية الشاملة (نظام القيادة والسيطرة - متوافق بالكامل)
 */

const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

// --- أدوات الجلسة الأساسية ---
function getToken() { return (localStorage.getItem(TOKEN_KEY) || '').trim(); }
function getUser() { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null; } catch(e) { return null; } }
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
    if(res.status === 401) { clearSession(); location.href = '/login.html'; }
    if(!res.ok) throw new Error(data.error || 'خطأ في الاتصال');
    return data;
}

// --- واجهات الاتصال (مربوطة بالخادم الحقيقي) ---
const AuthAPI = {
    login: (e, p) => api('POST', '/auth/login', { email:e, password:p }),
    verify: () => api('GET', '/auth/verify')
};

const UserAPI = {
    getRequest: (id) => api('GET', `/dashboard/request/${id}`)
};

const AdminAPI = {
    getRequests: () => api('GET', '/admin/requests'),
    acceptRequest: (id) => api('PUT', `/admin/requests/${id}/accept-initial`),
    rejectRequest: (id, reason) => api('PUT', `/admin/requests/${id}/reject-initial`, { reason }),
    approvePayment: (id) => api('PUT', `/admin/requests/${id}/approve-payment`),
    rejectPayment: (id, reason) => api('PUT', `/admin/requests/${id}/reject-payment`, { reason }),
    diagnose: (id, d, p) => api('PUT', `/admin/requests/${id}/diagnose`, { initial_diagnosis: d, treatment_plan: p }),
    getMessages: (id) => api('GET', `/requests/${id}/messages`),
    sendMessage: (id, text) => api('POST', `/requests/${id}/messages`, { messageText: text }),
    getArticles: () => api('GET', '/articles'),
    deleteArticle: (id) => api('DELETE', `/admin/articles/${id}`),
    getAIInstructions: () => api('GET', '/admin/ai-instructions'),
    saveAIInstructions: (i) => api('PUT', '/admin/ai-instructions', { instructions: i }),
    sendEngineerCommand: (c) => api('POST', '/admin/engineer-command', { command: c })
};

// --- نظام القيادة والسيطرة الشامل (متوافق مع admin.html) ---
const AdminModule = {
    currentId: null,
    
    async init() {
        if(!getToken()) return (location.href = '/login.html');
        try { await AuthAPI.verify(); if(!isAdmin()) throw new Error(); } catch(e) { clearSession(); location.href = '/login.html'; return; }
        this.loadRequests();
        this.loadAI();
        this.loadArticles();
    },

    async loadRequests() {
        try {
            const reqs = await AdminAPI.getRequests();
            const list = document.getElementById('adminRequestsList');
            if(!list) return;
            
            // تحديث الإحصائيات
            document.getElementById('totalCount').textContent = reqs.length;
            document.getElementById('pendingCount').textContent = reqs.filter(r => r.status === 'pending').length;
            document.getElementById('completedCount').textContent = reqs.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('rejectedCount').textContent = reqs.filter(r => r.status === 'rejected').length;

            if (!reqs.length) { list.innerHTML = '<p>لا توجد طلبات.</p>'; return; }
            list.innerHTML = reqs.map(r => {
                // استخدام الأسماء الصحيحة من الخادم (fullName, serviceType)
                const badgeColor = r.status === 'pending' ? 'warning' : r.status === 'diagnosed' ? 'success' : 'info';
                return `<button class="list-group-item list-group-item-action" onclick="AdminModule.select('${r.id}')">
                    <div class="d-flex justify-content-between">
                        <strong>${r.fullName || '—'}</strong>
                        <span class="badge bg-${badgeColor}">${r.status}</span>
                    </div>
                    <small>${r.serviceType || '—'}</small>
                </button>`;
            }).join('');
        } catch(e) { showToast('خطأ في جلب الطلبات.', 'error'); }
    },

    async select(id) {
        this.currentId = id;
        try {
            const req = await UserAPI.getRequest(id);
            const modal = document.getElementById('modalBody');
            if(!modal) return;

            // بناء نافذة التفاصيل الاحترافية (ملف الحالة)
            let html = `
                <p><strong>المستفيد:</strong> ${req.fullName}</p>
                <p><strong>الخدمة:</strong> ${req.serviceType}</p>
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:15px 0;">
                    <p><strong>نص الطلب:</strong></p>
                    <p>${req.description}</p>
                </div>
            `;

            if (req.status === 'pending') {
                html += `
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button class="btn btn-success" onclick="AdminModule.acceptInitial()">✅ قبول</button>
                    <button class="btn btn-danger" onclick="AdminModule.rejectInitial()">❌ رفض</button>
                </div>`;
            }

            if (req.status === 'payment_submitted') {
                html += `
                <p><strong>طريقة الدفع:</strong> ${req.paymentMethod || '—'}</p>
                <p><strong>المحول:</strong> ${req.payment_sender_name || '—'}</p>
                <p><strong>رقم الحوالة:</strong> ${req.payment_transfer_number || '—'}</p>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button class="btn btn-success" onclick="AdminModule.approvePayment()">💰 اعتماد الدفع</button>
                    <button class="btn btn-danger" onclick="AdminModule.rejectPayment()">🚫 رفض الدفع</button>
                </div>`;
            }

            html += `
                <textarea id="diag" class="form-control" placeholder="التشخيص..." style="margin-bottom:10px;">${req.initial_diagnosis || ''}</textarea>
                <textarea id="plan" class="form-control" placeholder="الخطة العلاجية..." style="margin-bottom:10px;">${req.treatment_plan || ''}</textarea>
                <button class="btn btn-primary" onclick="AdminModule.saveDiagnosis()">💾 حفظ التشخيص والعلاج</button>
            `;

            modal.innerHTML = html;
            document.getElementById('detailsModal').classList.add('show');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async acceptInitial() { await AdminAPI.acceptRequest(this.currentId); showToast('تم القبول.'); this.loadRequests(); document.getElementById('detailsModal').classList.remove('show'); },
    async rejectInitial() { const r = prompt('سبب الرفض:'); if(!r) return; await AdminAPI.rejectRequest(this.currentId, r); showToast('تم الرفض.'); this.loadRequests(); document.getElementById('detailsModal').classList.remove('show'); },
    async approvePayment() { await AdminAPI.approvePayment(this.currentId); showToast('تم اعتماد الدفع.'); this.loadRequests(); document.getElementById('detailsModal').classList.remove('show'); },
    async rejectPayment() { const r = prompt('سبب الرفض:'); if(!r) return; await AdminAPI.rejectPayment(this.currentId, r); showToast('تم رفض الدفع.'); this.loadRequests(); document.getElementById('detailsModal').classList.remove('show'); },
    async saveDiagnosis() {
        const d = document.getElementById('diag')?.value.trim();
        const p = document.getElementById('plan')?.value.trim();
        if(!d) return showToast('اكتب التشخيص.');
        await AdminAPI.diagnose(this.currentId, d, p);
        showToast('تم الحفظ.');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },

    async loadArticles() {
        try {
            const arts = await AdminAPI.getArticles();
            const b = document.getElementById('articlesTableBody');
            if(b) b.innerHTML = arts.length ? arts.map(a => `<tr><td>${a.title}</td><td>${new Date(a.createdAt).toLocaleDateString('ar-YE')}</td><td><button class="btn btn-outline btn-sm" onclick="AdminModule.editArticle('${a.id}','${a.title}','${a.summary}','${a.content}')">تعديل</button> <button class="btn btn-danger btn-sm" onclick="AdminModule.deleteArticle('${a.id}')">حذف</button></td></tr>`).join('') : '<tr><td colspan="3">لا توجد مقالات.</td></tr>';
        } catch(e) {}
    },
    showArticleForm() { document.getElementById('articleFormBox').style.display='block'; },
    editArticle(id, t, s, c) { this.showArticleForm(); document.getElementById('editArticleId').value=id; document.getElementById('artTitle').value=t; document.getElementById('artSummary').value=s; document.getElementById('articleContentEditor').innerHTML=c; },
    async saveArticle(e) {
        e.preventDefault();
        const id = document.getElementById('editArticleId').value;
        const t = document.getElementById('artTitle').value;
        const s = document.getElementById('artSummary').value;
        const c = document.getElementById('articleContentEditor').innerHTML;
        try { id ? await AdminAPI.updateArticle(id,t,s,c) : await AdminAPI.createArticle(t,s,c); this.loadArticles(); document.getElementById('articleFormBox').style.display='none'; } catch(err) { showToast(err.message,'error'); }
    },
    async deleteArticle(id) { if(confirm('حذف؟')) { await AdminAPI.deleteArticle(id); this.loadArticles(); } },

    async loadAI() { try { const r = await AdminAPI.getAIInstructions(); document.getElementById('aiPromptTextarea').value = r.instructions||''; } catch(e) {} },
    async saveAI() { try { await AdminAPI.saveAIInstructions(document.getElementById('aiPromptTextarea').value); showToast('تم الحفظ.'); } catch(e) { showToast(e.message,'error'); } },
    async sendEngineerCommand() {
        const cmd = document.getElementById('engineerCommand')?.value.trim();
        if (!cmd) return showToast('اكتب أمرًا.');
        try {
            const res = await AdminAPI.sendEngineerCommand(cmd);
            const div = document.getElementById('engineerResponse'); div.style.display='block'; div.textContent = res.reply;
        } catch(e) { showToast(e.message,'error'); }
    }
};

// دوال عامة لربط الأزرار
function sendEngineerCommand() { AdminModule.sendEngineerCommand(); }
function closeModal() { document.getElementById('detailsModal').classList.remove('show'); }

document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname;
    if(path === '/' || path.endsWith('index.html')) {
        // homeModule.init(); // قم بإلغاء التعليق عندما يكون HomeModule جاهزاً
    } else if(path.includes('dashboard')) {
        // dashboardModule.init(); // قم بإلغاء التعليق عندما يكون DashboardModule جاهزاً
    } else if(path.includes('admin')) {
        AdminModule.init();
    }
});
