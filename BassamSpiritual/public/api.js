/**
 * api.js – النسخة النهائية مع مودال مخصص للمقالات (يدعم HTML وتنسيق جميل)
 * مركز النور الرباني والنفس الرحماني
 */
const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

// =============== أدوات الجلسة ===============
function getToken() { return (localStorage.getItem(TOKEN_KEY) || '').trim(); }
function getUser() { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null; } catch (e) { return null; } }
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

function showToast(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) { alert(msg); return; }
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

async function api(method, endpoint, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const token = getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();
    if (res.status === 401) { clearSession(); window.location.href = '/login.html'; throw new Error('انتهت الجلسة'); }
    if (!res.ok) throw new Error(data.error || 'خطأ في الاتصال');
    return data;
}

// =============== المودال الموحد (للتطبيقات العامة) ===============
function createModal() {
    const old = document.getElementById('unifiedModal');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'unifiedModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;width:100%;max-width:400px;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;';
    const header = document.createElement('div');
    header.style.cssText = 'background:#0A1628;color:#F5B041;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;';
    const title = document.createElement('h3');
    title.style.cssText = 'margin:0;font-size:1.1rem;';
    header.appendChild(title);
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;';
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);
    box.appendChild(header);
    const body = document.createElement('div');
    body.style.cssText = 'padding:20px;';
    box.appendChild(body);
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:15px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:10px;';
    box.appendChild(footer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return { overlay, title, body, footer, close: () => overlay.remove() };
}

function showModal(titleText, message, buttons) {
    const modal = createModal();
    modal.title.textContent = titleText;
    modal.body.innerHTML = message;
    modal.footer.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.style.cssText = 'padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-family:Cairo;' + (btn.style || '');
        button.onclick = () => {
            modal.close();
            if (btn.callback) btn.callback();
        };
        modal.footer.appendChild(button);
    });
}

function showAlert(titleText, message) {
    return new Promise(resolve => {
        showModal(titleText, message, [
            { text: 'حسناً', style: 'background:#F5B041;color:#0A1628;', callback: resolve }
        ]);
    });
}

function showPrompt(titleText, message, defaultValue = '') {
    return new Promise(resolve => {
        const modal = createModal();
        modal.title.textContent = titleText;
        modal.body.innerHTML = `<p style="margin-bottom:12px;">${message}</p><input id="promptInput" value="${defaultValue}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:Cairo;">`;
        modal.footer.innerHTML = '';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'إلغاء';
        cancelBtn.style.cssText = 'padding:8px 20px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;font-weight:600;font-family:Cairo;';
        cancelBtn.onclick = () => { modal.close(); resolve(null); };
        const okBtn = document.createElement('button');
        okBtn.textContent = 'موافق';
        okBtn.style.cssText = 'padding:8px 20px;border-radius:8px;border:none;background:#F5B041;color:#0A1628;cursor:pointer;font-weight:600;font-family:Cairo;';
        okBtn.onclick = () => {
            const val = document.getElementById('promptInput').value;
            modal.close();
            resolve(val);
        };
        modal.footer.appendChild(cancelBtn);
        modal.footer.appendChild(okBtn);
    });
}

function showConfirm(titleText, message) {
    return new Promise(resolve => {
        showModal(titleText, message, [
            { text: 'إلغاء', style: 'background:#fff;border:1px solid #ddd;', callback: () => resolve(false) },
            { text: 'موافق', style: 'background:#F5B041;color:#0A1628;', callback: () => resolve(true) }
        ]);
    });
}

// =============== مودال المقالات (خاص) ===============
function showArticleModal(titleText, contentHtml) {
    const old = document.getElementById('articleModalOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'articleModalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:20px;width:100%;max-width:700px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;';
    const header = document.createElement('div');
    header.style.cssText = 'background:#0A1628;color:#F5B041;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:20px 20px 0 0;';
    const titleEl = document.createElement('h3');
    titleEl.style.cssText = 'margin:0;font-size:1.3rem;';
    titleEl.textContent = titleText;
    header.appendChild(titleEl);
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:1.8rem;cursor:pointer;';
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);
    box.appendChild(header);
    const body = document.createElement('div');
    body.style.cssText = 'padding:25px;overflow-y:auto;flex:1;font-family:Cairo;line-height:1.8;color:#0A1628;';
    body.innerHTML = contentHtml;
    box.appendChild(body);
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:15px 20px;border-top:1px solid #eee;text-align:left;';
    const closeBtn2 = document.createElement('button');
    closeBtn2.textContent = 'إغلاق المقال';
    closeBtn2.style.cssText = 'padding:10px 25px;border-radius:8px;border:none;background:#F5B041;color:#0A1628;cursor:pointer;font-weight:700;font-family:Cairo;';
    closeBtn2.onclick = () => overlay.remove();
    footer.appendChild(closeBtn2);
    box.appendChild(footer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    // إغلاق عند النقر على الخلفية
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

// =============== واجهات API ===============
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
    submitPayment: (id, paymentMethod, paymentSenderName, paymentTransferNumber) =>
        api('PUT', `/dashboard/request/${id}/submit-payment`, { paymentMethod, paymentSenderName, paymentTransferNumber }),
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

// =============== دوال عرض البطاقات والجدول ===============
function renderMobileCards(containerId, items, columns, rowActions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">لا توجد بيانات.</p>';
        return;
    }
    container.innerHTML = items.map((item, idx) => {
        let html = '<div class="mobile-card">';
        columns.forEach(col => {
            let value = item[col.key] || '—';
            if (col.key === 'createdAt' || col.key === 'createdat') {
                value = new Date(value).toLocaleDateString('ar-EG');
            }
            if (col.type === 'badge') {
                const badgeClass = col.badgeMap ? (col.badgeMap[value] || 'secondary') : 'secondary';
                value = `<span class="badge badge-${badgeClass}">${value}</span>`;
            }
            html += `<div class="card-row"><span class="card-label">${col.label}</span><span class="card-value">${value}</span></div>`;
        });
        if (rowActions) {
            html += '<div class="card-row" style="justify-content:flex-end; gap:5px; margin-top:8px;">';
            rowActions.forEach(action => {
                const onclick = action.onclick.replace(/\{id\}/g, item.id).replace(/\{idx\}/g, idx);
                html += `<button class="btn btn-sm ${action.class || 'btn-primary'}" onclick="${onclick}">${action.html || action.label}</button>`;
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    }).join('');
}

function renderDesktopTable(tableBodyId, items, columns, rowActions) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length + (rowActions ? 1 : 0)}" style="text-align:center;">لا توجد بيانات.</td></tr>`;
        return;
    }
    tbody.innerHTML = items.map((item, idx) => {
        let html = '<tr>';
        columns.forEach(col => {
            let value = item[col.key] || '—';
            if (col.key === 'createdAt' || col.key === 'createdat') {
                value = new Date(value).toLocaleDateString('ar-EG');
            }
            if (col.type === 'badge') {
                const badgeClass = col.badgeMap ? (col.badgeMap[value] || 'secondary') : 'secondary';
                value = `<span class="badge badge-${badgeClass}">${value}</span>`;
            }
            html += `<td>${value}</td>`;
        });
        if (rowActions) {
            html += '<td>';
            rowActions.forEach(action => {
                const onclick = action.onclick.replace(/\{id\}/g, item.id).replace(/\{idx\}/g, idx);
                html += `<button class="btn btn-sm ${action.class || 'btn-primary'}" onclick="${onclick}" style="margin-left:4px;">${action.html || action.label}</button>`;
            });
            html += '</td>';
        }
        html += '</tr>';
        return html;
    }).join('');
}

// =============== DashboardModule ===============
const DashboardModule = {
    async init() {
        if (!getToken()) { window.location.href = '/login.html'; return; }
        try {
            await AuthAPI.verify();
            await this.load();
        } catch (e) {
            clearSession();
            window.location.href = '/login.html';
        }
    },
    async load() {
        try {
            const data = await UserAPI.getDashboard();
            const user = data.user;
            const requests = data.requests || [];

            document.getElementById('welcomeMessage').innerHTML = `مرحباً، <span>${user.full_name || 'مستفيد'}</span>`;
            document.getElementById('sidebarName').textContent = user.full_name || '—';
            document.getElementById('sidebarEmail').textContent = user.email || '—';
            document.getElementById('sidebarPhone').textContent = user.phone || 'غير مقدم';

            document.getElementById('statTotal').textContent = requests.length;
            document.getElementById('statPending').textContent = requests.filter(r => r.status === 'pending').length;
            document.getElementById('statCompleted').textContent = requests.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('statRejected').textContent = requests.filter(r => r.status === 'rejected').length;

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
                    <p style="font-size:0.85rem; color:#666; margin:8px 0;">${(r.description || '').substring(0, 80)}...</p>
                    <small style="color:#999;">${new Date(r.createdAt).toLocaleDateString('ar-EG')}</small>
                    ${actionsHtml}
                </div>`;
            }).join('');

        } catch (e) {
            showToast('خطأ في تحميل لوحة التحكم: ' + e.message, 'error');
        }
    },
    async showPaymentForm(requestId) {
        const method = await showPrompt('طريقة الدفع', 'أدخل طريقة الدفع (مثلاً: تحويل بنكي، محفظة إلكترونية):');
        if (!method) return;
        const senderName = await showPrompt('اسم المرسل', 'أدخل اسم مرسل الدفع:');
        if (!senderName) return;
        const transferNumber = await showPrompt('رقم العملية', 'أدخل رقم عملية التحويل:');
        if (!transferNumber) return;
        try {
            await UserAPI.submitPayment(requestId, method, senderName, transferNumber);
            showToast('✅ تم تقديم إثبات الدفع بنجاح.');
            this.load();
        } catch (e) { showToast(e.message, 'error'); }
    },
    async viewDiagnosis(requestId) {
        try {
            const req = await UserAPI.getRequest(requestId);
            await showAlert('التشخيص', `🩺 التشخيص:\n${req.initial_diagnosis || 'لا يوجد'}\n\n📋 الخطة العلاجية:\n${req.treatment_plan || 'لا توجد'}`);
        } catch (e) { showToast(e.message, 'error'); }
    }
};

// =============== AdminModule ===============
const AdminModule = {
    currentId: null,
    async init() {
        if (!getToken()) { window.location.href = '/login.html'; return; }
        try {
            await AuthAPI.verify();
            if (!isAdmin()) throw new Error('غير مصرح');
        } catch (e) {
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

            const badgeMap = {
                'pending': 'warning', 'accepted_waiting_payment': 'info', 'payment_submitted': 'info',
                'processing': 'info', 'diagnosed': 'success', 'completed': 'success', 'rejected': 'danger', 'payment_rejected': 'danger'
            };

            const columns = [
                { key: 'fullName', label: 'المستفيد' },
                { key: 'serviceType', label: 'الخدمة' },
                { key: 'status', label: 'الحالة', type: 'badge', badgeMap },
                { key: 'createdAt', label: 'التاريخ' }
            ];

            renderDesktopTable('requestsTableBodyDesktop', reqs, columns, [
                { html: '<i class="bi bi-eye"></i>', class: 'btn-primary', onclick: 'AdminModule.select(\'{id}\')' }
            ]);
            renderMobileCards('requestsMobileCards', reqs, columns, [
                { html: '<i class="bi bi-eye"></i> عرض', class: 'btn-primary', onclick: 'AdminModule.select(\'{id}\')' }
            ]);
        } catch (e) { showToast('خطأ في جلب الطلبات.', 'error'); }
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
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin:15px 0;"><p><strong>📝 وصف المشكلة:</strong></p><p>${req.description || ''}</p></div>`;

            if (req.status === 'pending') {
                html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button class="btn btn-success" onclick="AdminModule.acceptInitial()">✅ قبول</button>
                    <button class="btn btn-danger" onclick="AdminModule.rejectInitial()">❌ رفض</button>
                </div>`;
            }
            if (req.status === 'payment_submitted') {
                html += `<p style="color:#F59E0B;">⏳ المستفيد قدم إثبات الدفع.<br>
                طريقة الدفع: ${req.paymentMethod || '—'}<br>
                المرسل: ${req.payment_sender_name || '—'}<br>
                رقم العملية: ${req.payment_transfer_number || '—'}</p>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-success" onclick="AdminModule.approvePayment(${id})">✅ تأكيد الدفع</button>
                    <button class="btn btn-danger" onclick="AdminModule.rejectPayment(${id})">❌ رفض الدفع</button>
                </div>`;
            }
            if (req.status === 'accepted_waiting_payment') {
                html += `<p style="color:#F59E0B;">⏳ في انتظار تأكيد الدفع من المستفيد.</p>`;
            }
            if (req.status === 'diagnosed' || req.status === 'processing') {
                html += `<div style="background:#f0f7f4; padding:15px; border-radius:8px; margin:15px 0;">
                    <p><strong>🩺 التشخيص:</strong></p><p>${req.initial_diagnosis || 'لم يتم بعد'}</p>
                    ${req.treatment_plan ? `<p><strong>📋 الخطة العلاجية:</strong></p><p>${req.treatment_plan}</p>` : ''}
                </div>`;
            }
            html += `<textarea id="diag" placeholder="التشخيص..." style="width:100%; margin-bottom:8px; padding:10px; border-radius:8px; border:1px solid #ddd;">${req.initial_diagnosis || ''}</textarea>
                <textarea id="plan" placeholder="الخطة العلاجية..." style="width:100%; margin-bottom:8px; padding:10px; border-radius:8px; border:1px solid #ddd;">${req.treatment_plan || ''}</textarea>
                <button class="btn btn-primary" onclick="AdminModule.saveDiagnosis()" style="width:100%; padding:10px;">💾 حفظ التشخيص والعلاج</button>
                <hr>
                <button class="btn btn-outline" onclick="AdminModule.viewMessages('${id}')" style="width:100%; margin-top:10px;">💬 عرض المحادثة</button>`;

            modal.innerHTML = html;
            document.getElementById('detailsModal').classList.add('show');
        } catch (e) { showToast(e.message, 'error'); }
    },

    async acceptInitial() {
        await AdminAPI.acceptRequest(this.currentId);
        showToast('✅ تم القبول');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },
    async rejectInitial() {
        const reason = await showPrompt('سبب الرفض', 'أدخل سبب الرفض:');
        if (reason === null || reason === '') return;
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
        const reason = await showPrompt('سبب رفض الدفع', 'أدخل سبب رفض الدفع:');
        if (reason === null || reason === '') return;
        await AdminAPI.rejectPayment(id, reason);
        showToast('تم رفض الدفع');
        this.loadRequests();
        document.getElementById('detailsModal').classList.remove('show');
    },
    async saveDiagnosis() {
        const d = document.getElementById('diag')?.value.trim();
        const p = document.getElementById('plan')?.value.trim();
        if (!d) return showToast('اكتب التشخيص.', 'error');
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
        if (messages.length === 0) html += '<p>لا توجد رسائل.</p>';
        else messages.forEach(m => {
            html += `<div style="background:${m.senderRole === 'admin' ? '#FFFBF0' : '#F8FAFC'}; border-right:4px solid ${m.senderRole === 'admin' ? '#F5B041' : '#1B4D3D'}; padding:10px; margin-bottom:8px; border-radius:8px;">
                <strong>${m.senderName} (${m.senderRole === 'admin' ? 'أنت' : 'المستفيد'})</strong>
                <p>${m.messageText}</p>
                <small>${new Date(m.createdAt).toLocaleString('ar-EG')}</small>
            </div>`;
        });
        html += `</div>
        <textarea id="adminReplyMessage" placeholder="اكتب ردك..." style="width:100%; margin:10px 0; padding:10px; border-radius:8px; border:1px solid #ddd;"></textarea>
        <button class="btn btn-primary" onclick="AdminModule.sendReply('${id}')">إرسال</button>`;
        container.innerHTML = html;
    },
    async sendReply(id) {
        const text = document.getElementById('adminReplyMessage')?.value.trim();
        if (!text) return showToast('اكتب رسالة', 'error');
        await AdminAPI.sendMessage(id, text);
        showToast('✅ تم الإرسال');
        this.viewMessages(id);
    },

    async loadArticles() {
        try {
            const arts = await AdminAPI.getArticles();
            const columns = [
                { key: 'title', label: 'العنوان' },
                { key: 'createdAt', label: 'التاريخ' }
            ];
            renderDesktopTable('articlesTableBodyDesktop', arts, columns, [
                { html: 'حذف', class: 'btn-danger', onclick: 'AdminModule.deleteArticle(\'{id}\')' }
            ]);
            renderMobileCards('articlesMobileCards', arts, columns, [
                { html: '🗑️', class: 'btn-danger', onclick: 'AdminModule.deleteArticle(\'{id}\')' }
            ]);
        } catch (e) {}
    },
    async deleteArticle(id) {
        const confirmed = await showConfirm('تأكيد الحذف', 'هل أنت متأكد من حذف المقال؟');
        if (!confirmed) return;
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
        if (!title || !summary) return showToast('العنوان والملخص مطلوبان.', 'error');
        if (id) await AdminAPI.updateArticle(id, title, summary, content);
        else await AdminAPI.createArticle(title, summary, content);
        showToast('تم حفظ المقال.');
        this.loadArticles();
        document.getElementById('articleFormBox').style.display = 'none';
    },

    async loadReviews() {
        try {
            const res = await AdminAPI.getReviews();
            const reviews = res.reviews || [];
            const columns = [
                { key: 'fullName', label: 'المستفيد' },
                { key: 'comment', label: 'التعليق' },
                { key: 'isApproved', label: 'الحالة', type: 'badge', badgeMap: { true: 'success', false: 'warning' } }
            ];
            renderDesktopTable('reviewsTableBodyDesktop', reviews, columns, [
                { html: '<i class="bi bi-check"></i>', class: 'btn-success', onclick: 'AdminModule.approveReview(\'{id}\', true)' },
                { html: '<i class="bi bi-trash"></i>', class: 'btn-danger', onclick: 'AdminModule.deleteReview(\'{id}\')' }
            ]);
            renderMobileCards('reviewsMobileCards', reviews, columns, [
                { html: '✅', class: 'btn-success', onclick: 'AdminModule.approveReview(\'{id}\', true)' },
                { html: '🗑️', class: 'btn-danger', onclick: 'AdminModule.deleteReview(\'{id}\')' }
            ]);
        } catch (e) {}
    },
    async approveReview(id, approved) { await AdminAPI.approveReview(id, approved); this.loadReviews(); },
    async deleteReview(id) {
        const confirmed = await showConfirm('تأكيد الحذف', 'هل أنت متأكد من حذف التقييم؟');
        if (!confirmed) return;
        await AdminAPI.deleteReview(id);
        this.loadReviews();
        showToast('تم الحذف');
    },

    async loadAI() {
        try {
            const r = await AdminAPI.getAIInstructions();
            document.getElementById('aiPromptTextarea').value = r.instructions || '';
        } catch (e) {}
    },
    async saveAI() {
        await AdminAPI.saveAIInstructions(document.getElementById('aiPromptTextarea').value);
        showToast('تم حفظ التوجيهات.');
    },
    async sendEngineerCommand() {
        const cmd = document.getElementById('engineerCommand')?.value.trim();
        if (!cmd) return showToast('اكتب أمراً.', 'error');
        const res = await AdminAPI.sendEngineerCommand(cmd);
        document.getElementById('engineerResponse').style.display = 'block';
        document.getElementById('engineerResponse').textContent = res.reply || 'تم';
    }
};

// =============== HomeModule (مع استخدام showArticleModal) ===============
const HomeModule = {
    articlesCache: [],
    async loadArticles() {
        try {
            const articles = await AdminAPI.getArticles();
            this.articlesCache = articles;
            const container = document.getElementById('articlesContainer');
            if (!container) return;
            if (!articles.length) { container.innerHTML = '<p style="text-align:center;">لا توجد مقالات.</p>'; return; }
            container.innerHTML = '<div class="articles-scroll-inner">' + articles.map(a => `
                <div class="article-scroll-card" onclick="HomeModule.openArticle('${a.id}')">
                    <div class="article-icon"><i class="bi bi-file-text-fill"></i></div>
                    <h3>${a.title}</h3>
                    <p>${a.summary || ''}</p>
                    <div class="article-date">${new Date(a.createdAt).toLocaleDateString('ar-EG')}</div>
                    <div class="read-more">اقرأ المزيد ←</div>
                </div>`).join('') + '</div>';
        } catch (e) { console.error(e); }
    },
    async loadReviews() {
        try {
            const res = await fetch('/api/reviews');
            const reviews = await res.json();
            const container = document.getElementById('testimonialsContainer');
            if (!container) return;
            if (!reviews.length) { container.innerHTML = '<p style="text-align:center;">لا توجد تقييمات.</p>'; return; }
            container.innerHTML = reviews.map(r => `
                <div class="testimonial-card">
                    <div class="testimonial-rating">${'⭐'.repeat(r.rating || 5)}</div>
                    <p class="testimonial-text">${r.comment}</p>
                    <div class="testimonial-author">— ${r.fullName || 'مستفيد'}</div>
                </div>`).join('');
        } catch (e) {}
    },
    openArticle(id) {
        const article = this.articlesCache.find(a => a.id == id);
        if (article) {
            // استخدام المودال المخصص للمقالات مع دعم HTML
            showArticleModal(article.title, article.content || article.summary);
        } else {
            showAlert('خطأ', 'المقال غير متوفر حالياً.');
        }
    },
    startCounters() {
        const counters = document.querySelectorAll('.counter-number');
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const updateCounter = () => {
                const current = +counter.innerText;
                const increment = target / 100;
                if (current < target) {
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
        window.toggleChatNew = function () {
            const win = document.getElementById('chatWindowNew');
            win.style.display = win.style.display === 'none' ? 'flex' : 'none';
        };
        window.sendNewMessage = async function () {
            const input = document.getElementById('chatInputNew');
            const msg = input.value.trim();
            if (!msg) return;
            const body = document.getElementById('chatBodyNew');
            body.innerHTML += `<div class="chat-message-m user">${msg}</div>`;
            input.value = '';
            try {
                const res = await fetch('/api/ai-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();
                body.innerHTML += `<div class="chat-message-m bot">${data.reply || '...'}</div>`;
            } catch (e) {
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

// =============== دوال عامة ===============
function closeModal() { document.getElementById('detailsModal').classList.remove('show'); }
function sendEngineerCommand() { AdminModule.sendEngineerCommand(); }

window.getToken = getToken;
window.getUser = getUser;
window.clearSession = clearSession;
window.isAdmin = isAdmin;
window.api = api;
window.showToast = showToast;
window.AuthAPI = AuthAPI;
window.UserAPI = UserAPI;
window.AdminAPI = AdminAPI;
window.DashboardModule = DashboardModule;
window.AdminModule = AdminModule;
window.HomeModule = HomeModule;

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin')) AdminModule.init();
    else if (window.location.pathname.includes('dashboard')) DashboardModule.init();
    else if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) HomeModule.init();
});
