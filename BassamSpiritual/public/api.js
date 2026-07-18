/**
 * ملف api.js - النسخة الكاملة والمستقرة
 * تم تعديل دوال التحقق لضمان استقرار جلسة المدير
 */

const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

// --- أدوات الجلسة ---
function getToken() { 
    return (localStorage.getItem(TOKEN_KEY) || '').trim(); 
}

function getUser() { 
    try { 
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null; 
    } catch(e) { 
        return null; 
    } 
}

function setSession(token, user) { 
    localStorage.setItem(TOKEN_KEY, token.trim()); 
    localStorage.setItem(USER_KEY, JSON.stringify(user)); 
}

function clearSession() { 
    localStorage.removeItem(TOKEN_KEY); 
    localStorage.removeItem(USER_KEY); 
}

// التأكد من أن الدور هو admin (بالحرف الصغير كما في بياناتك)
function isAdmin() { 
    const u = getUser(); 
    return u && u.role === 'admin'; 
}

function showToast(msg, type = 'success') {
    const n = document.getElementById('notification'); 
    if (!n) return;
    n.textContent = msg; 
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

// --- محرك الطلبات الأساسي ---
async function api(method, endpoint, body = null) {
    const opts = { 
        method, 
        headers: { 'Content-Type': 'application/json' } 
    };
    
    const token = getToken(); 
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    
    if (body) opts.body = JSON.stringify(body);
    
    try {
        const res = await fetch(API_BASE + endpoint, opts);
        const data = await res.json();
        
        if (res.status === 401) {
            clearSession();
            location.href = '/login.html';
            throw new Error('انتهت الجلسة');
        }
        
        if (!res.ok) throw new Error(data.error || 'حدث خطأ في الاتصال');
        return data;
    } catch (err) {
        throw err;
    }
}

// --- واجهات التعامل ---
const AuthAPI = {
    login: (email, password) => api('POST', '/auth/login', { email, password }),
    verify: () => api('GET', '/auth/verify'),
    logout: () => { clearSession(); location.href = '/login.html'; }
};

const UserAPI = {
    getDashboard: () => api('GET', '/dashboard/me'),
    getRequest: (id) => api('GET', `/dashboard/request/${id}`),
    submitRequest: (type, desc) => api('POST', '/dashboard/request', { serviceType: type, description: desc }),
    submitReview: (comment, rating) => api('POST', '/dashboard/review', { comment, rating })
};

const AdminAPI = {
    getRequests: () => api('GET', '/admin/requests'),
    acceptRequest: (id) => api('PUT', `/admin/requests/${id}/accept-initial`),
    rejectRequest: (id, reason) => api('PUT', `/admin/requests/${id}/reject-initial`, { reason }),
    approvePayment: (id) => api('PUT', `/admin/requests/${id}/approve-payment`),
    diagnose: (id, diagnosis, plan) => api('PUT', `/admin/requests/${id}/diagnose`, { initial_diagnosis: diagnosis, treatment_plan: plan }),
    getArticles: () => api('GET', '/articles'),
    createArticle: (title, summary, content) => api('POST', '/admin/articles', { title, summary, content }),
    deleteArticle: (id) => api('DELETE', `/admin/articles/${id}`)
};

// --- وحدة إدارة المدير ---
const AdminModule = {
    currentId: null,

    async init() {
        // التحقق من وجود توكن
        if (!getToken()) {
            location.href = '/login.html';
            return;
        }

        try {
            // التحقق من الصلاحية مع السيرفر
            await AuthAPI.verify();
            
            // التحقق المحلي من الرتبة
            if (!isAdmin()) {
                console.warn("محاولة دخول غير مصرح بها.");
                location.href = '/index.html';
                return;
            }

            // تحميل البيانات الأساسية
            this.loadRequests();
            this.loadArticles();
        } catch (e) {
            console.error("خطأ في تهيئة لوحة المدير:", e);
            // لا نطرد المدير فوراً، نكتفي بالتنبيه
            showToast('خطأ في الاتصال بالخادم، جاري التحديث...', 'error');
        }
    },

    async loadRequests() {
        try {
            const reqs = await AdminAPI.getRequests();
            const list = document.getElementById('adminRequestsList');
            if (!list) return;

            list.innerHTML = reqs.length ? reqs.map(r => `
                <div class="request-card">
                    <strong>${r.fullname || 'بدون اسم'}</strong> - ${r.servicetype}
                    <span class="badge-status badge-${r.status}">${r.status}</span>
                    <button onclick="AdminModule.select('${r.id}')" class="btn-primary" style="padding:5px 10px; font-size:0.7rem;">عرض</button>
                </div>
            `).join('') : '<p>لا توجد طلبات حالياً.</p>';
        } catch (e) {
            showToast('فشل تحميل الطلبات', 'error');
        }
    },

    async select(id) {
        this.currentId = id;
        try {
            const req = await UserAPI.getRequest(id);
            alert(`تفاصيل الطلب: ${req.description}`);
            // هنا يمكنك فتح المودال الخاص بالتفاصيل
        } catch(e) {
            showToast('خطأ في جلب تفاصيل الطلب', 'error');
        }
    },

    async loadArticles() {
        try {
            const arts = await AdminAPI.getArticles();
            const container = document.getElementById('articlesList');
            if(container) {
                container.innerHTML = arts.map(a => `<div>${a.title}</div>`).join('');
            }
        } catch(e) {}
    }
};
