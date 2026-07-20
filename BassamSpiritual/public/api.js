/**
 * ملف api.js - النسخة النهائية الشاملة (نظام القيادة والسيطرة - متوافق بالكامل مع server.js)
 */

const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

// ==============================================
// أدوات الجلسة الأساسية
// ==============================================
function getToken() { return (localStorage.getItem(TOKEN_KEY) || '').trim(); }
function getUser() { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null; } catch(e) { return null; } }
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

function showToast(msg, type='success') {
    const n = document.getElementById('notification');
    if(!n) return;
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

async function api(method, endpoint, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const token = getToken();
    if(token) opts.headers['Authorization'] = `Bearer ${token}`;
    if(body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();
    if(res.status === 401) { clearSession(); location.href = '/login.html'; }
    if(!res.ok) throw new Error(data.error || 'خطأ في الاتصال');
    return data;
}

// ==============================================
// واجهات الاتصال (مربوطة بالخادم الحقيقي)
// ==============================================
const AuthAPI = {
    login: (e, p) => api('POST', '/auth/login', { email:e, password:p }),
    verify: () => api('GET', '/auth/verify'),
    register: (fullName, email, password, phone) => api('POST', '/auth/register', { fullName, email, password, phone })
};

const UserAPI = {
    getDashboard: () => api('GET', '/dashboard/me'),
    submitRequest: (serviceType, description) => api('POST', '/dashboard/request', { serviceType, description }),
    getRequest: (id) => api('GET', `/dashboard/request/${id}`),
    getMessages: (id) => api('GET', `/requests/${id}/messages`),
    sendMessage: (id, text) => api('POST', `/requests/${id}/messages`, { messageText: text }),
    submitReview: (comment, rating) => api('POST', '/dashboard/reviews', { comment, rating })
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
    approveReview: (id, approved) => api('PUT', `/admin/reviews/${id}`, { isApproved: approved }),
    deleteReview: (id) => api('DELETE', `/admin/reviews/${id}`),
    getAIInstructions: () => api('GET', '/admin/ai-instructions'),
    saveAIInstructions: (instructions) => api('PUT', '/admin/ai-instructions', { instructions: instructions }),
    sendEngineerCommand: (command) => api('POST', '/admin/engineer-command', { command: command })
};

// ==============================================
// نظام القيادة والسيطرة (متوافق مع admin.html)
// ==============================================
const AdminModule = {
    currentId: null,
    
    async init() {
        if(!getToken()) return (location.href = '/login.html');
        try {
            await AuthAPI.verify();
            if(!isAdmin()) throw new Error();
        } catch(e) {
            clearSession();
            location.href = '/login.html';
            return;
        }
        this.loadRequests();
        this.loadArticles();
        this.loadReviews();
        this.loadAI();
    },

    async loadRequests() {
        try {
            const reqs = await AdminAPI.getRequests();
            const list = document.getElementById('requestsTableBody');
            if(!list) return;
            
            // تحديث الإحصائيات
            document.getElementById('totalCount').textContent = reqs.length;
            document.getElementById('pendingCount').textContent = reqs.filter(r => r.status === 'pending').length;
            document.getElementById('completedCount').textContent = reqs.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('rejectedCount').textContent = reqs.filter(r => r.status === 'rejected').length;

            if (!reqs.length) {
                list.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات.</td></tr>';
                return;
            }
            
            const badgeMap = {
                'pending': 'warning',
                'accepted_waiting_payment': 'info',
                'diagnosed': 'success',
                'completed': 'success',
                'rejected': 'danger'
            };

            list.innerHTML = reqs.map((r, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${r.fullName || '—'}</strong></td>
                    <td>${r.serviceType || '—'}</td>
                    <td><span class="badge badge-${badgeMap[r.status] || 'secondary'}">${r.status}</span></td>
                    <td>${new Date(r.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="AdminModule.select('${r.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch(e) {
            showToast('خطأ في جلب الطلبات.', 'error');
        }
    },

    async select(id) {
        this.currentId = id;
        try {
            const req = await UserAPI.getRequest(id);
            const modal = document.getElementById('modalBody');
            if(!modal) return;

            let html = `
                <p><strong>👤 المستفيد:</strong> ${req.fullName}</p>
                <p><strong>📧 البريد:</strong> ${req.email}</p>
                <p><strong>📞 الهاتف:</strong> ${req.userPhone || 'غير مقدم'}</p>
                <p><strong>🛠 الخدمة:</strong> ${req.serviceType}</p>
                <p><strong>📅 التاريخ:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:15px 0;">
                    <p><strong>📝 وصف المشكلة:</strong></p>
                    <p>${req.description || 'لا يوجد وصف'}</p>
                </div>
            `;

            if (req.status === 'pending') {
                html += `
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button class="btn btn-success" onclick="AdminModule.acceptInitial()">✅ قبول</button>
                    <button class="btn btn-danger" onclick="AdminModule.rejectInitial()">❌ رفض</button>
                </div>`;
            }

            if (req.status === 'accepted_waiting_payment') {
                html += `<p style="color:#F59E0B;">⏳ في انتظار تأكيد الدفع من المستفيد.</p>`;
            }

            if (req.status === 'diagnosed' || req.status === 'processing') {
                html += `
                <div style="background:#f0f7f4; padding:15px; border-radius:8px; margin:15px 0;">
                    <p><strong>🩺 التشخيص:</strong></p>
                    <p>${req.initial_diagnosis || 'لم يتم بعد'}</p>
                    ${req.treatment_plan ? `<p><strong>📋 الخطة العلاجية:</strong></p><p>${req.treatment_plan}</p>` : ''}
                </div>`;
            }

            if (req.status === 'pending' || req.status === 'accepted_waiting_payment') {
                html += `
                <textarea id="diag" placeholder="التشخيص..." style="width:100%; margin-bottom:8px; padding:10px; border-radius:8px; border:1px solid #ddd; font-family:'Cairo';">${req.initial_diagnosis || ''}</textarea>
                <textarea id="plan" placeholder="الخطة العلاجية..." style="width:100%; margin-bottom:8px; padding:10px; border-radius:8px; border:1px solid #ddd; font-family:'Cairo';">${req.treatment_plan || ''}</textarea>
                <button class="btn btn-primary" onclick="AdminModule.saveDiagnosis()" style="width:100%; padding:10px;">
                    💾 حفظ التشخيص والعلاج
                </button>
                `;
            }

            // زر عرض المحادثة
            html += `
                <hr>
                <button class="btn btn-outline" onclick="AdminModule.viewMessages('${req.id}')" style="width:100%; margin-top:10px;">
                    💬 عرض المحادثة
                </button>
            `;

            modal.innerHTML = html;
            document.getElementById('detailsModal').classList.add('show');
        } catch(e) {
            showToast(e.message, 'error');
        }
    },

    // ===== عرض الرسائل =====
    async viewMessages(requestId) {
        try {
            const res = await AdminAPI.getMessages(requestId);
            const messages = res.messages || [];
            const container = document.getElementById('modalBody');

            let html = `<div style="max-height:300px; overflow-y:auto; margin:10px 0;">`;
            if (messages.length === 0) {
                html += `<p style="color:#999;">لا توجد رسائل بعد.</p>`;
            } else {
                messages.forEach(m => {
                    const isAdmin = m.senderRole === 'admin';
                    html += `
                    <div style="background:${isAdmin ? '#FFFBF0' : '#F8FAFC'};
                                border-right:4px solid ${isAdmin ? '#F5B041' : '#1B4D3D'};
                                padding:12px; margin-bottom:10px; border-radius:8px;">
                        <strong>${m.senderName} (${isAdmin ? 'أنت' : 'المستفيد'})</strong>
                        <p style="margin:5px 0; white-space:pre-wrap;">${m.messageText}</p>
                        <small style="color:#999;">${new Date(m.createdAt).toLocaleString('ar-EG')}</small>
                    </div>`;
                });
            }
            html += `</div>
                <div style="display:flex; gap:10px;">
                    <textarea id="adminReplyMessage" placeholder="اكتب ردك..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #ddd; font-family:'Cairo';"></textarea>
                    <button class="btn btn-primary" onclick="AdminModule.sendReply('${requestId}')">إرسال</button>
                </div>
                <button class="btn btn-outline" onclick="document.getElementById('detailsModal').classList.remove('show')" style="margin-top:10px;">إغلاق</button>
            `;

            container.innerHTML = html;
        } catch(e) {
            showToast('فشل تحميل الرسائل', 'error');
        }
    },

    // ===== إرسال رد =====
    async sendReply(requestId) {
        const text = document.getElementById('adminReplyMessage').value.trim();
        if (!text) return showToast('اكتب الرسالة', 'error');
        try {
            await AdminAPI.sendMessage(requestId, text);
            showToast('✅ تم الإرسال');
            this.viewMessages(requestId);
        } catch(e) {
            showToast(e.message, 'error');
        }
    },

    async acceptInitial() {
        await AdminAPI.acceptRequest(this.currentId);
        showToast('تم القبول.');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },

    async rejectInitial() {
        const r = prompt('سبب الرفض:');
        if(r === null) return;
        await AdminAPI.rejectRequest(this.currentId, r);
        showToast('تم الرفض.');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },

    async saveDiagnosis() {
        const d = document.getElementById('diag')?.value.trim();
        const p = document.getElementById('plan')?.value.trim();
        if(!d) return showToast('اكتب التشخيص.', 'error');
        try {
            await AdminAPI.diagnose(this.currentId, d, p);
            showToast('✅ تم التشخيص وإرسال رسالة للمستفيد.');
            this.loadRequests();
            document.getElementById('detailsModal').classList.remove('show');
        } catch(e) {
            showToast(e.message, 'error');
        }
    },

    // ===== المقالات =====
    async loadArticles() {
        try {
            const arts = await AdminAPI.getArticles();
            const body = document.getElementById('articlesTableBody');
            if(!body) return;
            if(!arts.length) {
                body.innerHTML = '<tr><td colspan="3" style="text-align:center;">لا توجد مقالات.</td></tr>';
                return;
            }
            body.innerHTML = arts.map(a => `
                <tr>
                    <td>${a.title}</td>
                    <td>${new Date(a.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="AdminModule.deleteArticle('${a.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch(e) { showToast('خطأ في تحميل المقالات', 'error'); }
    },

    async deleteArticle(id) {
        if(!confirm('حذف المقال نهائياً؟')) return;
        try {
            await AdminAPI.deleteArticle(id);
            this.loadArticles();
            showToast('تم الحذف');
        } catch(e) { showToast(e.message, 'error'); }
    },

    showArticleForm() {
        document.getElementById('articleFormBox').style.display = 'block';
    },

    async saveArticle(e) {
        e.preventDefault();
        const id = document.getElementById('editArticleId').value;
        const title = document.getElementById('artTitle').value.trim();
        const summary = document.getElementById('artSummary').value.trim();
        const content = document.getElementById('articleContentEditor').innerHTML;
        if(!title || !summary) return showToast('العنوان والملخص مطلوبان.', 'error');
        try {
            if(id) {
                await AdminAPI.updateArticle(id, title, summary, content);
            } else {
                await AdminAPI.createArticle(title, summary, content);
            }
            showToast('تم حفظ المقال.');
            this.loadArticles();
            document.getElementById('articleFormBox').style.display = 'none';
            document.getElementById('editArticleId').value = '';
            document.getElementById('artTitle').value = '';
            document.getElementById('artSummary').value = '';
            document.getElementById('articleContentEditor').innerHTML = '';
        } catch(e) { showToast(e.message, 'error'); }
    },

    // ===== التقييمات =====
    async loadReviews() {
        try {
            const { reviews } = await AdminAPI.getReviews();
            const body = document.getElementById('reviewsTableBody');
            if(!body) return;
            if(!reviews?.length) {
                body.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد تقييمات.</td></tr>';
                return;
            }
            body.innerHTML = reviews.map(r => `
                <tr>
                    <td>${r.fullName}</td>
                    <td>${r.comment}</td>
                    <td><span class="badge ${r.isApproved ? 'badge-success' : 'badge-warning'}">${r.isApproved ? 'منشور' : 'بانتظار الموافقة'}</span></td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="AdminModule.approveReview(${r.id}, true)"><i class="bi bi-check"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="AdminModule.approveReview(${r.id}, false)"><i class="bi bi-x"></i></button>
                        <button class="btn btn-outline btn-sm" onclick="AdminModule.deleteReview(${r.id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch(e) { showToast('خطأ في تحميل التقييمات', 'error'); }
    },

    async approveReview(id, approved) {
        try {
            await AdminAPI.approveReview(id, approved);
            this.loadReviews();
            showToast('تم التحديث');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async deleteReview(id) {
        if(!confirm('حذف التقييم؟')) return;
        try {
            await AdminAPI.deleteReview(id);
            this.loadReviews();
            showToast('تم الحذف');
        } catch(e) { showToast(e.message, 'error'); }
    },

    // ===== الذكاء الاصطناعي =====
    async loadAI() {
        try {
            const r = await AdminAPI.getAIInstructions();
            document.getElementById('aiPromptTextarea').value = r.instructions || '';
        } catch(e) {}
    },

    async saveAI() {
        try {
            await AdminAPI.saveAIInstructions(document.getElementById('aiPromptTextarea').value);
            showToast('تم حفظ التوجيهات.');
        } catch(e) { showToast(e.message, 'error'); }
    },

    // ===== مهندس المنصة =====
    async sendEngineerCommand() {
        const cmd = document.getElementById('engineerCommand')?.value.trim();
        if(!cmd) return showToast('اكتب أمراً.', 'error');
        try {
            const res = await AdminAPI.sendEngineerCommand(cmd);
            const div = document.getElementById('engineerResponse');
            div.style.display = 'block';
            div.textContent = res.reply || 'تم تنفيذ الأمر.';
        } catch(e) { showToast(e.message, 'error'); }
    }
};

// ==============================================
// دوال عامة لربط الأزرار في admin.html
// ==============================================
function sendEngineerCommand() { AdminModule.sendEngineerCommand(); }
function closeModal() { document.getElementById('detailsModal').classList.remove('show'); }

// ==============================================
// تهيئة الصفحة حسب المسار
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname;
    if(path === '/' || path.endsWith('index.html')) {
        // homeModule.init(); // يبقى للاستخدام المستقبلي
    } else if(path.includes('dashboard')) {
        // DashboardModule.init(); // يتم استدعاؤه من dashboard.js
    } else if(path.includes('admin')) {
        if(typeof AdminModule !== 'undefined' && AdminModule.init) {
            AdminModule.init();
        }
    }
});

// ==============================================
// تصدير الدوال للنطاق العام (لضمان التوافق)
// ==============================================
window.getToken = getToken;
window.getUser = getUser;
window.clearSession = clearSession;
window.isAdmin = isAdmin;
window.api = api;
window.showToast = showToast;
window.AuthAPI = AuthAPI;
window.UserAPI = UserAPI;
window.AdminAPI = AdminAPI;
window.AdminModule = AdminModule;
