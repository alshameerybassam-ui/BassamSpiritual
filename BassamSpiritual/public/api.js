/**
 * ملف api.js - النسخة النهائية الشاملة (نظام القيادة والسيطرة)
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

// --- محرك الطلبات (الذي يربط كل شيء ببعضه) ---
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

// --- واجهات الاتصال (كل المهام موجودة هنا) ---
const AuthAPI = {
    login: (e, p) => api('POST', '/auth/login', { email:e, password:p }),
    verify: () => api('GET', '/auth/verify')
};

const UserAPI = {
    getRequest: (id) => api('GET', `/dashboard/request/${id}`)
};

const AdminAPI = {
    getRequests: () => api('GET', '/admin/requests'),
    updatePaymentStatus: (id, status) => api('PUT', `/admin/requests/${id}/financial-status`, { status }),
    diagnose: (id, d, p) => api('PUT', `/admin/requests/${id}/diagnose`, { initial_diagnosis: d, treatment_plan: p }),
    sendMessage: (id, text, isPrivate) => api('POST', `/requests/${id}/messages`, { messageText: text, isPrivate }),
    getArticles: () => api('GET', '/articles'),
    deleteArticle: (id) => api('DELETE', `/admin/articles/${id}`)
};

// --- نظام القيادة والسيطرة الشامل (الذي يدير واجهتك) ---
const AdminModule = {
    currentId: null,
    
    async init() {
        if(!isAdmin()) return;
        this.loadRequests();
        this.loadArticles();
    },

    async loadRequests() {
        const reqs = await AdminAPI.getRequests();
        const list = document.getElementById('adminRequestsList');
        if(list) list.innerHTML = reqs.map(r => `
            <button class="list-group-item" onclick="AdminModule.select('${r.id}')">
                ${r.fullname} - ${r.servicetype} - <strong>${r.status}</strong>
            </button>`).join('');
    },

    async select(id) {
        this.currentId = id;
        const req = await UserAPI.getRequest(id);
        const modal = document.getElementById('detailsModal');
        if(!modal) return;
        
        // النافذة الاحترافية (ملف الحالة)
        modal.innerHTML = `
            <div class="modal-content">
                <h3>ملف المستفيد: ${req.fullname}</h3>
                <div class="sacred-box" style="border:1px solid #ccc; padding:10px;">
                    <p><strong>الطلب:</strong> ${req.description}</p>
                </div>
                <textarea id="diag" class="form-control" placeholder="التشخيص..."> ${req.initial_diagnosis || ''}</textarea>
                <div class="controls">
                    <button onclick="AdminModule.saveDiagnosis()">حفظ التشخيص</button>
                    <button onclick="AdminModule.updatePayment('paid')" style="background:green; color:white;">🟢 تم الاستلام</button>
                </div>
                <div id="msgSection">
                    <textarea id="msgInput" placeholder="اكتب رداً..."></textarea>
                    <button onclick="AdminModule.sendMsg(false)">إرسال للمستفيد</button>
                    <button onclick="AdminModule.sendMsg(true)">ملاحظة سرية</button>
                </div>
            </div>
        `;
        modal.classList.add('show');
    },

    async saveDiagnosis() {
        await AdminAPI.diagnose(this.currentId, document.getElementById('diag').value, '');
        showToast('تم الحفظ');
    },

    async updatePayment(status) {
        await AdminAPI.updatePaymentStatus(this.currentId, status);
        showToast('تم التحديث المالي');
    },

    async sendMsg(isPrivate) {
        await AdminAPI.sendMessage(this.currentId, document.getElementById('msgInput').value, isPrivate);
        showToast('تم الإرسال');
    },

    async loadArticles() {
        const arts = await AdminAPI.getArticles();
        const b = document.getElementById('articlesTableBody');
        if(b) b.innerHTML = arts.map(a => `<tr><td>${a.title}</td><td><button onclick="AdminModule.deleteArticle('${a.id}')">حذف</button></td></tr>`).join('');
    },

    async deleteArticle(id) {
        await AdminAPI.deleteArticle(id);
        this.loadArticles();
    }
};

// تشغيل النظام
document.addEventListener('DOMContentLoaded', () => AdminModule.init());
