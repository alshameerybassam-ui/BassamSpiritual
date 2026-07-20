/**
 * api.js – النسخة الشاملة النهائية
 * مركز النور الرباني والنفس الرحماني
 * يحتوي على: AuthAPI, UserAPI, AdminAPI, DashboardModule, AdminModule, HomeModule
 */

const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

// ===================== أدوات الجلسة =====================
function getToken() { return (localStorage.getItem(TOKEN_KEY) || '').trim(); }
function getUser() { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null; } catch(e) { return null; } }
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

function showToast(msg, type='success') {
    const n = document.getElementById('notification');
    if(!n) { alert(msg); return; }
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
    if(res.status === 401) { clearSession(); window.location.href = '/login.html'; throw new Error('انتهت الجلسة'); }
    if(!res.ok) throw new Error(data.error || 'خطأ في الاتصال');
    return data;
}

// ===================== واجهات API =====================
const AuthAPI = {
    login: (email, password) => api('POST', '/auth/login', { email, password }),
    verify: () => api('GET', '/auth/verify'),
    register: (fullName, email, password, phone) => api('POST', '/auth/register', { fullName, email, password, phone }),
    forgotPassword: (email) => api('POST', '/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api('POST', '/auth/reset-password', { token, newPassword })
};

const UserAPI = {
    getDashboard: () => api('GET', '/dashboard/me'),
    submitRequest: (serviceType, description) => api('POST', '/dashboard/request', { serviceType, description }),
    getRequest: (id) => api('GET', `/dashboard/request/${id}`),
    submitPayment: (id, paymentMethod, paymentSenderName, paymentTransferNumber) => api('PUT', `/dashboard/request/${id}/submit-payment`, { paymentMethod, paymentSenderName, paymentTransferNumber }),
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
    saveAIInstructions: (instructions) => api('PUT', '/admin/ai-instructions', { instructions }),
    sendEngineerCommand: (command) => api('POST', '/admin/engineer-command', { command })
};

// ===================== لوحة المستفيد =====================
const DashboardModule = {
    async init() {
        if(!getToken()) { window.location.href = '/login.html'; return; }
        try {
            await AuthAPI.verify();
            await this.load();
        } catch(e) {
            clearSession();
            window.location.href = '/login.html';
        }
    },

    async load() {
        try {
            const data = await UserAPI.getDashboard();
            const user = data.user;
            const requests = data.requests || [];

            // عرض بيانات المستخدم
            document.getElementById('welcomeMessage').innerHTML = `مرحباً، <span>${user.full_name || 'مستفيد'}</span>`;
            document.getElementById('sidebarName').textContent = user.full_name || '—';
            document.getElementById('sidebarEmail').textContent = user.email || '—';
            document.getElementById('sidebarPhone').textContent = user.phone || 'غير مقدم';

            // الإحصائيات
            document.getElementById('statTotal').textContent = requests.length;
            document.getElementById('statPending').textContent = requests.filter(r => r.status === 'pending').length;
            document.getElementById('statCompleted').textContent = requests.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('statRejected').textContent = requests.filter(r => r.status === 'rejected').length;

            // عرض الطلبات
            const container = document.getElementById('requestsContainer');
            if (!requests.length) {
                container.innerHTML = '<p style="text-align:center; color:#888;">لا توجد طلبات حتى الآن.</p>';
                return;
            }

            const badgeClass = {
                'pending': 'badge-pending',
                'accepted_waiting_payment': 'badge-processing',
                'payment_submitted': 'badge-processing',
                'processing': 'badge-processing',
                'diagnosed': 'badge-completed',
                'completed': 'badge-completed',
                'rejected': 'badge-rejected',
                'payment_rejected': 'badge-rejected'
            };

            const statusText = {
                'pending': 'قيد الانتظار',
                'accepted_waiting_payment': 'بانتظار الدفع',
                'payment_submitted': 'تم تقديم الدفع',
                'processing': 'قيد المعالجة',
                'diagnosed': 'تم التشخيص',
                'completed': 'مكتمل',
                'rejected': 'مرفوض',
                'payment_rejected': 'دفع مرفوض'
            };

            container.innerHTML = requests.map(r => {
                let actionsHtml = '';
                if (r.status === 'accepted_waiting_payment') {
                    actionsHtml = `<button class="btn-primary" style="margin-top:8px; padding:6px 12px; font-size:0.8rem;" onclick="DashboardModule.showPaymentForm(${r.id})">💳 تقديم الدفع</button>`;
                }
                if (r.status === 'diagnosed' || r.status === 'completed') {
                    actionsHtml = `<button class="btn-primary" style="margin-top:8px; padding:6px 12px; font-size:0.8rem;" onclick="DashboardModule.viewDiagnosis(${r.id})">📋 عرض التشخيص</button>`;
                }
                return `
                <div class="request-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <strong>${r.serviceType || 'خدمة'}</strong>
                        <span class="badge-status ${badgeClass[r.status] || 'badge-pending'}">${statusText[r.status] || r.status}</span>
                    </div>
                    <p style="font-size:0.85rem; color:#666; margin:8px 0;">${r.description?.substring(0, 80) || ''}...</p>
                    <small style="color:#999;">${new Date(r.createdAt).toLocaleDateString('ar-EG')}</small>
                    ${actionsHtml}
                </div>`;
            }).join('');

        } catch(e) {
            showToast('خطأ في تحميل لوحة التحكم: ' + e.message, 'error');
        }
    },

    async showPaymentForm(requestId) {
        const method = prompt('طريقة الدفع (مثلاً: تحويل بنكي، محفظة إلكترونية):');
        if (!method) return;
        const senderName = prompt('اسم مرسل الدفع:');
        const transferNumber = prompt('رقم عملية التحويل:');
        if (!senderName || !transferNumber) return;
        try {
            await UserAPI.submitPayment(requestId, method, senderName, transferNumber);
            showToast('✅ تم تقديم إثبات الدفع بنجاح.');
            this.load();
        } catch(e) { showToast(e.message, 'error'); }
    },

    async viewDiagnosis(requestId) {
        try {
            const req = await UserAPI.getRequest(requestId);
            alert(`🩺 التشخيص:\n${req.initial_diagnosis || 'لا يوجد'}\n\n📋 الخطة العلاجية:\n${req.treatment_plan || 'لا توجد'}`);
        } catch(e) { showToast(e.message, 'error'); }
    }
};

// ===================== لوحة المدير =====================
const AdminModule = {
    currentId: null,
    async init() {
        if(!getToken()) return (window.location.href = '/login.html');
        try {
            await AuthAPI.verify();
            if(!isAdmin()) throw new Error();
        } catch(e) {
            clearSession();
            window.location.href = '/login.html';
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
            document.getElementById('totalCount').textContent = reqs.length;
            document.getElementById('pendingCount').textContent = reqs.filter(r => r.status === 'pending').length;
            document.getElementById('completedCount').textContent = reqs.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('rejectedCount').textContent = reqs.filter(r => r.status === 'rejected').length;

            const list = document.getElementById('requestsTableBody');
            if (!reqs.length) { list.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات.</td></tr>'; return; }

            const badgeMap = { 'pending': 'warning', 'accepted_waiting_payment': 'info', 'payment_submitted': 'info', 'processing': 'info', 'diagnosed': 'success', 'completed': 'success', 'rejected': 'danger', 'payment_rejected': 'danger' };

            list.innerHTML = reqs.map((r, i) => `
                <tr>
                    <td>${i+1}</td>
                    <td>${r.fullName || '—'}</td>
                    <td>${r.serviceType || '—'}</td>
                    <td><span class="badge badge-${badgeMap[r.status] || 'secondary'}">${r.status}</span></td>
                    <td>${new Date(r.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td><button class="btn btn-sm btn-primary" onclick="AdminModule.select('${r.id}')"><i class="bi bi-eye"></i></button></td>
                </tr>`).join('');
        } catch(e) { showToast('خطأ في جلب الطلبات.', 'error'); }
    },

    async select(id) {
        this.currentId = id;
        try {
            const req = await UserAPI.getRequest(id);
            const modal = document.getElementById('modalBody');
            let html = `<p><strong>👤 المستفيد:</strong> ${req.fullName}</p>
                <p><strong>📧 البريد:</strong> ${req.email}</p>
                <p><strong>📞 الهاتف:</strong> ${req.userPhone || 'غير مقدم'}</p>
                <p><strong>🛠 الخدمة:</strong> ${req.serviceType}</p>
                <p><strong>📅 التاريخ:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:15px 0;"><p><strong>📝 وصف المشكلة:</strong></p><p>${req.description}</p></div>`;

            if (req.status === 'pending') {
                html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button class="btn btn-success" onclick="AdminModule.acceptInitial()">✅ قبول</button>
                    <button class="btn btn-danger" onclick="AdminModule.rejectInitial()">❌ رفض</button>
                </div>`;
            }
            if (req.status === 'payment_submitted') {
                html += `<p style="color:#F59E0B;">⏳ المستفيد قدم إثبات الدفع. <br>طريقة الدفع: ${req.paymentMethod || '—'}<br>المرسل: ${req.payment_sender_name || '—'}<br>رقم العملية: ${req.payment_transfer_number || '—'}</p>
                <div style="display:flex; gap:10px;"><button class="btn btn-success" onclick="AdminModule.approvePayment(${id})">✅ تأكيد الدفع</button><button class="btn btn-danger" onclick="AdminModule.rejectPayment(${id})">❌ رفض الدفع</button></div>`;
            }

            html += `<hr><button class="btn btn-outline" onclick="AdminModule.viewMessages(${id})" style="width:100%; margin-top:10px;">💬 عرض المحادثة</button>`;
            modal.innerHTML = html;
            document.getElementById('detailsModal').classList.add('show');
        } catch(e) { showToast(e.message, 'error'); }
    },

    async acceptInitial() {
        await AdminAPI.acceptRequest(this.currentId);
        showToast('✅ تم القبول');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },
    async rejectInitial() {
        const reason = prompt('سبب الرفض:');
        if(!reason) return;
        await AdminAPI.rejectRequest(this.currentId, reason);
        showToast('تم الرفض');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },
    async approvePayment(id) {
        await AdminAPI.approvePayment(id);
        showToast('✅ تم تأكيد الدفع');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },
    async rejectPayment(id) {
        const reason = prompt('سبب رفض الدفع:');
        if(!reason) return;
        await AdminAPI.rejectPayment(id, reason);
        showToast('تم رفض الدفع');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },
    async saveDiagnosis() {
        const d = document.getElementById('diag')?.value.trim();
        const p = document.getElementById('plan')?.value.trim();
        if(!d) return showToast('اكتب التشخيص.', 'error');
        await AdminAPI.diagnose(this.currentId, d, p);
        showToast('✅ تم التشخيص');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },
    async viewMessages(id) {
        const res = await AdminAPI.getMessages(id);
        const messages = res.messages || [];
        const container = document.getElementById('modalBody');
        let html = `<div style="max-height:250px; overflow-y:auto;">`;
        if(messages.length===0) html += '<p>لا توجد رسائل.</p>';
        else messages.forEach(m => {
            html += `<div style="background:${m.senderRole==='admin'?'#FFFBF0':'#F8FAFC'}; border-right:4px solid ${m.senderRole==='admin'?'#F5B041':'#1B4D3D'}; padding:10px; margin-bottom:8px; border-radius:8px;">
                <strong>${m.senderName} (${m.senderRole==='admin'?'أنت':'المستفيد'})</strong><p>${m.messageText}</p><small>${new Date(m.createdAt).toLocaleString('ar-EG')}</small></div>`;
        });
        html += `</div><textarea id="adminReplyMessage" placeholder="اكتب ردك..." style="width:100%; margin:10px 0; padding:10px; border-radius:8px; border:1px solid #ddd;"></textarea>
        <button class="btn btn-primary" onclick="AdminModule.sendReply('${id}')">إرسال</button>`;
        container.innerHTML = html;
    },
    async sendReply(id) {
        const text = document.getElementById('adminReplyMessage').value.trim();
        if(!text) return showToast('اكتب رسالة', 'error');
        await AdminAPI.sendMessage(id, text);
        showToast('✅ تم الإرسال');
        this.viewMessages(id);
    },
    async loadArticles() {
        try {
            const arts = await AdminAPI.getArticles();
            const body = document.getElementById('articlesTableBody');
            if(!body) return;
            if(!arts.length) { body.innerHTML = '<tr><td colspan="3">لا توجد مقالات.</td></tr>'; return; }
            body.innerHTML = arts.map(a => `<tr><td>${a.title}</td><td>${new Date(a.createdAt).toLocaleDateString('ar-EG')}</td><td><button class="btn btn-danger btn-sm" onclick="AdminModule.deleteArticle(${a.id})">حذف</button></td></tr>`).join('');
        } catch(e) {}
    },
    async deleteArticle(id) {
        if(!confirm('حذف المقال؟')) return;
        await AdminAPI.deleteArticle(id);
        this.loadArticles();
        showToast('تم الحذف');
    },
    showArticleForm() { document.getElementById('articleFormBox').style.display = 'block'; },
    async saveArticle(e) {
        e.preventDefault();
        const id = document.getElementById('editArticleId').value;
        const title = document.getElementById('artTitle').value.trim();
        const summary = document.getElementById('artSummary').value.trim();
        const content = document.getElementById('articleContentEditor').innerHTML;
        if(!title || !summary) return showToast('العنوان والملخص مطلوبان.', 'error');
        if(id) await AdminAPI.updateArticle(id, title, summary, content);
        else await AdminAPI.createArticle(title, summary, content);
        showToast('تم حفظ المقال.');
        this.loadArticles();
        document.getElementById('articleFormBox').style.display = 'none';
    },
    async loadReviews() {
        try {
            const res = await AdminAPI.getReviews();
            const reviews = res.reviews || [];
            const body = document.getElementById('reviewsTableBody');
            if(!body) return;
            if(!reviews.length) { body.innerHTML = '<tr><td colspan="4">لا توجد تقييمات.</td></tr>'; return; }
            body.innerHTML = reviews.map(r => `
                <tr>
                    <td>${r.fullName}</td>
                    <td>${r.comment}</td>
                    <td><span class="badge ${r.isApproved?'badge-success':'badge-warning'}">${r.isApproved?'منشور':'بانتظار الموافقة'}</span></td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="AdminModule.approveReview(${r.id},true)"><i class="bi bi-check"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="AdminModule.deleteReview(${r.id})">حذف</button>
                    </td>
                </tr>`).join('');
        } catch(e) {}
    },
    async approveReview(id, approved) { await AdminAPI.approveReview(id, approved); this.loadReviews(); },
    async deleteReview(id) { if(!confirm('حذف التقييم؟')) return; await AdminAPI.deleteReview(id); this.loadReviews(); },
    async loadAI() {
        try {
            const r = await AdminAPI.getAIInstructions();
            document.getElementById('aiPromptTextarea').value = r.instructions || '';
        } catch(e) {}
    },
    async saveAI() {
        await AdminAPI.saveAIInstructions(document.getElementById('aiPromptTextarea').value);
        showToast('تم حفظ التوجيهات.');
    },
    async sendEngineerCommand() {
        const cmd = document.getElementById('engineerCommand')?.value.trim();
        if(!cmd) return showToast('اكتب أمراً.', 'error');
        const res = await AdminAPI.sendEngineerCommand(cmd);
        document.getElementById('engineerResponse').style.display = 'block';
        document.getElementById('engineerResponse').textContent = res.reply || 'تم';
    }
};

// ===================== الصفحة الرئيسية =====================
const HomeModule = {
    async loadArticles() {
        try {
            const articles = await AdminAPI.getArticles(); // GET /articles عام
            const container = document.getElementById('articlesContainer');
            if(!container) return;
            if(!articles.length) { container.innerHTML = '<p style="text-align:center;">لا توجد مقالات.</p>'; return; }
            container.innerHTML = '<div class="articles-scroll-inner">' + articles.map(a => `
                <div class="article-scroll-card" onclick="HomeModule.openArticle('${a.id}')">
                    <div class="article-icon"><i class="bi bi-file-text-fill"></i></div>
                    <h3>${a.title}</h3>
                    <p>${a.summary || ''}</p>
                    <div class="article-date">${new Date(a.createdAt).toLocaleDateString('ar-EG')}</div>
                    <div class="read-more">اقرأ المزيد ←</div>
                </div>`).join('') + '</div>';
        } catch(e) { console.error(e); }
    },
    async loadReviews() {
        try {
            const res = await fetch('/api/reviews'); // عام
            const reviews = await res.json();
            const container = document.getElementById('testimonialsContainer');
            if(!container) return;
            if(!reviews.length) { container.innerHTML = '<p style="text-align:center;">لا توجد تقييمات.</p>'; return; }
            container.innerHTML = reviews.map(r => `
                <div class="testimonial-card">
                    <div class="testimonial-rating">${'⭐'.repeat(r.rating || 5)}</div>
                    <p class="testimonial-text">${r.comment}</p>
                    <div class="testimonial-author">— ${r.fullName || 'مستفيد'}</div>
                </div>`).join('');
        } catch(e) {}
    },
    async openArticle(id) {
        try {
            const res = await fetch(`/api/dashboard/request/${id}`); // ليس الأمثل لكن يمكن إضافة API للمقال الفردي
            // هنا نكتفي بعرض المقال من القائمة المخزنة أو API خاص
            // للتبسيط سنعرض تنبيهًا للمقال
            alert('سيتم فتح المقال قريباً.');
        } catch(e) {}
    },
    startCounters() {
        const counters = document.querySelectorAll('.counter-number');
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const updateCounter = () => {
                const current = +counter.innerText;
                const increment = target / 100;
                if(current < target) {
                    counter.innerText = Math.ceil(current + increment);
                    setTimeout(updateCounter, 20);
                } else {
                    counter.innerText = target;
                }
            };
            updateCounter();
        });
    },
    initChat() {
        window.toggleChatNew = function() {
            const win = document.getElementById('chatWindowNew');
            win.style.display = win.style.display === 'none' ? 'flex' : 'none';
        };
        window.sendNewMessage = async function() {
            const input = document.getElementById('chatInputNew');
            const msg = input.value.trim();
            if(!msg) return;
            const body = document.getElementById('chatBodyNew');
            body.innerHTML += `<div class="chat-message-m user">${msg}</div>`;
            input.value = '';
            try {
                const res = await fetch('/api/ai-chat', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();
                body.innerHTML += `<div class="chat-message-m bot">${data.reply || '...'}</div>`;
            } catch(e) {
                body.innerHTML += `<div class="chat-message-m bot">عذراً، حدث خطأ.</div>`;
            }
            body.scrollTop = body.scrollHeight;
        };
    },
    init() {
        this.loadArticles();
        this.loadReviews();
        this.startCounters();
        this.initChat();
    }
};

// ===================== دوال عامة للـ admin.html =====================
function closeModal() { document.getElementById('detailsModal').classList.remove('show'); }
function sendEngineerCommand() { AdminModule.sendEngineerCommand(); }

// ===================== تصدير للـ window =====================
window.getToken = getToken; window.getUser = getUser; window.clearSession = clearSession;
window.isAdmin = isAdmin; window.api = api; window.showToast = showToast;
window.AuthAPI = AuthAPI; window.UserAPI = UserAPI; window.AdminAPI = AdminAPI;
window.DashboardModule = DashboardModule; window.AdminModule = AdminModule; window.HomeModule = HomeModule;

// ===================== تشغيل تلقائي حسب الصفحة =====================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin')) {
        if (typeof AdminModule !== 'undefined') AdminModule.init();
    } else if (window.location.pathname.includes('dashboard')) {
        if (typeof DashboardModule !== 'undefined') DashboardModule.init();
    } else if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        if (typeof HomeModule !== 'undefined') HomeModule.init();
    }
});
