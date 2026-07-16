// ========== api.js - الدماغ الواحد النهائي ==========
const API_BASE = '/api';
const TOKEN_KEY = 'bassam_auth_token';
const USER_KEY = 'bassam_user';

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
    saveAIInstructions: (instructions) => api('PUT', '/admin/ai-instructions', { instructions }),
    sendEngineerCommand: (command) => api('POST', '/admin/engineer-command', { command })
};

const PublicAPI = {
    getArticles: () => fetch(API_BASE + '/articles').then(r => r.json()),
    getReviews: () => fetch(API_BASE + '/reviews').then(r => r.json()),
    aiChat: (message) => api('POST', '/ai-chat', { message })
};

// ========== الصفحة الرئيسية ==========
const HomeModule = {
    articles: [],
    async init() { this.updateUI(); await this.loadArticles(); await this.loadTestimonials(); this.initCounters(); this.initChat(); },
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
        const container = document.getElementById('articlesContainer');
        if (!container) return;
        const inner = container.querySelector('.articles-scroll-inner');
        if (!inner) return;
        try { this.articles = await PublicAPI.getArticles(); } catch(e) { this.articles = []; }
        if (!this.articles.length) { inner.innerHTML = '<p style="text-align:center;width:100%;padding:30px;">📚 لا توجد مقالات حالياً.</p>'; return; }
        inner.innerHTML = this.articles.map(a => `
            <div class="article-scroll-card" onclick="HomeModule.openArticle('${a.id}')">
                <div class="article-icon"><i class="${a.icon || 'bi bi-book'}"></i></div>
                <h3>${a.title}</h3>
                <p>${a.summary || ''}</p>
                <div class="article-date"><i class="bi bi-calendar3"></i> ${a.createdAt ? new Date(a.createdAt).toLocaleDateString('ar-YE') : ''}</div>
                <span class="read-more">اقرأ المزيد <i class="bi bi-arrow-left"></i></span>
            </div>
        `).join('');
    },
    openArticle(id) {
        const art = this.articles.find(a => String(a.id) === String(id));
        if(!art) return;
        const modal = document.getElementById('articleModal'), content = document.getElementById('modalArticleContent');
        if(!modal||!content) return;
        modal.style.display = 'flex'; setTimeout(() => modal.classList.add('show'), 10);
        content.innerHTML = `<div style="direction:rtl;text-align:right;font-family:'Cairo';"><h2 style="color:#0A1628;">${art.title}</h2><p style="color:#94a3b8;"><i class="bi bi-calendar3"></i> ${new Date(art.createdAt).toLocaleDateString('ar-YE')}</p><div style="font-size:1.1rem;line-height:1.9;color:#334155;margin-top:20px;">${art.content || ''}</div></div>`;
    },
    closeArticleModal() { const m = document.getElementById('articleModal'); if(m){ m.classList.remove('show'); setTimeout(()=>m.style.display='none',300); } },
    async loadTestimonials() {
        const container = document.getElementById('testimonialsContainer'); if(!container) return;
        try { const reviews = await PublicAPI.getReviews(); if(!reviews.length) throw new Error(); container.innerHTML = reviews.map(r => `<div class="testimonial-card"><div class="stars">${'★'.repeat(r.rating||5)}</div><p class="content">${r.comment}</p><div class="name">- ${r.fullName||'مستفيد'}</div></div>`).join(''); } catch(e) { container.innerHTML = '<div class="testimonial-card"><p class="content">"الحمد لله الذي بنعمته تتم الصالحات..."</p><div class="name">- أبو عبدالله</div></div>'; }
    },
    initCounters() { document.querySelectorAll('.counter-number').forEach(c => { const target = +c.getAttribute('data-target'), speed = target/50; const update = () => { const cur = +c.innerText; if(cur<target){ c.innerText = Math.ceil(cur+speed); setTimeout(update,20); } else c.innerText = target; }; update(); }); },
    initChat() { document.getElementById('chatInputNew')?.addEventListener('keypress', e => { if(e.key==='Enter') HomeModule.sendChat(); }); },
    toggleChat() { const w = document.getElementById('chatWindowNew'); if(w) w.style.display = w.style.display==='flex'?'none':'flex'; },
    async sendChat() {
        const input = document.getElementById('chatInputNew'), msg = input?.value.trim(); if(!msg) return;
        const body = document.getElementById('chatBodyNew'); if(!body) return;
        body.innerHTML += `<div class="chat-message-m user">${msg}</div>`; input.value = ''; body.scrollTop = body.scrollHeight;
        try { const res = await PublicAPI.aiChat(msg); body.innerHTML += `<div class="chat-message-m bot">${res.reply}</div>`; } catch(e) { body.innerHTML += '<div class="chat-message-m bot">عذراً، حدث خطأ. حاول لاحقاً.</div>'; }
        body.scrollTop = body.scrollHeight;
    }
};

function toggleChatNew() { HomeModule.toggleChat(); }
function sendNewMessage() { HomeModule.sendChat(); }
function closeArticleModal() { HomeModule.closeArticleModal(); }
function closeArticleModalOnOverlay(e) { if(e.target.id==='articleModal') closeArticleModal(); }

// ========== لوحة المستفيد التفاعلية ==========
const DashboardModule = {
    async init() {
        if(!getToken()){ location.href='/login.html'; return; }
        try { await AuthAPI.verify(); } catch(e) { clearSession(); location.href='/login.html'; return; }
        await this.load();
    },
    async load() {
        try {
            const data = await UserAPI.getDashboard();
            document.getElementById('welcomeMessage').innerHTML = `أهلاً بك يا <span>${data.user?.full_name||''}</span>`;
            const reqs = data.requests||[];
            const container = document.getElementById('requestsContainer');
            
            // إحصائيات
            document.getElementById('statTotal').textContent = reqs.length;
            document.getElementById('statPending').textContent = reqs.filter(r => r.status === 'pending').length;
            document.getElementById('statCompleted').textContent = reqs.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('statRejected').textContent = reqs.filter(r => r.status === 'rejected').length;
            
            if(!reqs.length) { container.innerHTML = '<p style="text-align:center;padding:30px;color:#888;">📭 لا توجد طلبات بعد.</p>'; return; }
            container.innerHTML = reqs.map(req => {
                let badge = '', text = '';
                if(req.status==='pending') { badge='badge-pending'; text='قيد المراجعة'; }
                else if(req.status==='processing'||req.status==='accepted_waiting_payment'||req.status==='payment_submitted') { badge='badge-processing'; text='تحت المعالجة'; }
                else { badge='badge-completed'; text='مكتمل'; }
                
                let diagnosisHtml = '';
                if(req.initial_diagnosis) {
                    diagnosisHtml = `<div style="margin-top:10px;background:#f0f4f8;padding:10px;border-radius:8px;"><strong>التشخيص:</strong> ${req.initial_diagnosis}<br><strong>العلاج:</strong> ${req.treatment_plan||'—'}</div>`;
                }
                
                let paymentHtml = '';
                if(req.status === 'accepted_waiting_payment') {
                    paymentHtml = `<div style="margin-top:10px;"><button onclick="DashboardModule.showPaymentForm('${req.id}')" style="background:#F5B041; color:#0A1628; border:none; padding:8px 16px; border-radius:20px; cursor:pointer; font-weight:600;">إرسال إيصال الدفع</button></div>`;
                }
                
                return `<div class="request-card"><div style="display:flex;justify-content:space-between;"><div><strong>${req.serviceType}</strong><p>${req.description?.substring(0,80)}...</p></div><span class="badge-status ${badge}">${text}</span></div>${diagnosisHtml}${paymentHtml}</div>`;
            }).join('');
        } catch(e) { showToast('تعذر تحميل البيانات.','error'); }
    },
    showPaymentForm(requestId) {
        const method = prompt('طريقة التحويل (مثال: الكريمي، جيب):');
        if(!method) return;
        const sender = prompt('اسم المحول:');
        if(!sender) return;
        const number = prompt('رقم الحوالة:');
        if(!number) return;
        
        UserAPI.submitPayment(requestId, method, sender, number)
            .then(() => { showToast('تم إرسال الإيصال.'); this.load(); })
            .catch(e => showToast(e.message, 'error'));
    }
};

// ========== لوحة المدير الكاملة ==========
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
            
            // تحديث الإحصائيات
            document.getElementById('totalCount').textContent = reqs.length;
            document.getElementById('pendingCount').textContent = reqs.filter(r => r.status === 'pending').length;
            document.getElementById('completedCount').textContent = reqs.filter(r => r.status === 'diagnosed' || r.status === 'completed').length;
            document.getElementById('rejectedCount').textContent = reqs.filter(r => r.status === 'rejected').length;
            
            list.innerHTML = reqs.length ? reqs.map(r => `<button class="list-group-item list-group-item-action" onclick="AdminModule.select('${r.id}')">${r.fullName} - ${r.serviceType} <span class="badge bg-${r.status==='pending'?'warning':r.status==='processing'?'primary':'success'}">${r.status}</span></button>`).join('') : '<p>لا توجد طلبات.</p>';
        } catch(e) { showToast('خطأ في جلب الطلبات.','error'); }
    },
    async select(id) {
        this.currentId = id;
        try {
            const req = await UserAPI.getRequest(id);
            const modalBody = document.getElementById('modalBody');
            
            let html = `
                <p><strong>المستفيد:</strong> ${req.fullName}</p>
                <p><strong>الخدمة:</strong> ${req.serviceType}</p>
                <p><strong>الوصف:</strong> ${req.description}</p>
                <p><strong>الحالة:</strong> ${req.status}</p>
            `;
            
            // أزرار الإجراءات
            if(req.status === 'pending') {
                html += `<div style="margin:15px 0;"><button onclick="AdminModule.acceptInitial()" style="background:#2ecc71; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; margin-left:10px;">قبول</button><button onclick="AdminModule.rejectInitial()" style="background:#e74c3c; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">رفض</button></div>`;
            }
            
            if(req.status === 'payment_submitted') {
                html += `<p><strong>طريقة الدفع:</strong> ${req.paymentMethod}</p><p><strong>المحول:</strong> ${req.payment_sender_name}</p><p><strong>رقم الحوالة:</strong> ${req.payment_transfer_number}</p>`;
                html += `<div style="margin:15px 0;"><button onclick="AdminModule.approvePayment()" style="background:#2ecc71; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; margin-left:10px;">اعتماد الدفع</button><button onclick="AdminModule.rejectPayment()" style="background:#e74c3c; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">رفض الدفع</button></div>`;
            }
            
            // سجل المراسلات
            html += `<div style="margin-top:20px;"><strong>المراسلات:</strong><div id="adminChatBox" style="max-height:200px; overflow-y:auto; border:1px solid #ddd; padding:10px; border-radius:8px; margin:10px 0;">جاري التحميل...</div>`;
            html += `<input type="text" id="adminMessageInput" placeholder="اكتب رداً..." style="width:100%; padding:8px; border-radius:6px; border:1px solid #ddd; margin-bottom:10px;">`;
            html += `<button onclick="AdminModule.sendMessage()" style="background:#3498db; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">إرسال</button></div>`;
            
            // نموذج التشخيص
            html += `<div style="margin-top:20px;"><strong>التشخيص والعلاج:</strong><textarea id="diagnosisInput" placeholder="التشخيص..." style="width:100%; padding:8px; border-radius:6px; border:1px solid #ddd; margin:10px 0; min-height:60px;">${req.initial_diagnosis||''}</textarea><textarea id="planInput" placeholder="الخطة العلاجية..." style="width:100%; padding:8px; border-radius:6px; border:1px solid #ddd; margin-bottom:10px; min-height:60px;">${req.treatment_plan||''}</textarea><button onclick="AdminModule.saveDiagnosis()" style="background:#27ae60; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">حفظ التشخيص</button></div>`;
            
            modalBody.innerHTML = html;
            document.getElementById('detailsModal').classList.add('show');
            
            // تحميل المراسلات
            this.loadMessages();
        } catch(e) { showToast(e.message,'error'); }
    },
    async loadMessages() {
        if(!this.currentId) return;
        try {
            const data = await AdminAPI.getMessages(this.currentId);
            const box = document.getElementById('adminChatBox');
            if(!box) return;
            box.innerHTML = data.messages.length ? data.messages.map(m => `<div style="margin-bottom:5px; padding:5px; background:${m.senderRole==='admin'?'#e8f5e9':'#f5f5f5'}; border-radius:4px;"><small>${m.senderName}:</small> ${m.messageText}</div>`).join('') : '<p style="color:#999;">لا توجد مراسلات بعد.</p>';
            box.scrollTop = box.scrollHeight;
        } catch(e) {}
    },
    async sendMessage() {
        const text = document.getElementById('adminMessageInput')?.value.trim();
        if(!text) return;
        try {
            await AdminAPI.sendMessage(this.currentId, text);
            document.getElementById('adminMessageInput').value = '';
            this.loadMessages();
        } catch(e) { showToast(e.message,'error'); }
    },
    async saveDiagnosis() {
        const diagnosis = document.getElementById('diagnosisInput')?.value.trim();
        const plan = document.getElementById('planInput')?.value.trim();
        if(!diagnosis) return showToast('يرجى كتابة التشخيص.','error');
        try {
            await AdminAPI.diagnose(this.currentId, diagnosis, plan||'');
            showToast('تم حفظ التشخيص.');
            this.loadRequests();
            closeModal();
        } catch(e) { showToast(e.message,'error'); }
    },
    async acceptInitial() { await AdminAPI.acceptRequest(this.currentId); showToast('تم القبول.'); this.loadRequests(); closeModal(); },
    async rejectInitial() { const r = prompt('سبب الرفض:'); if(!r) return; await AdminAPI.rejectRequest(this.currentId, r); showToast('تم الرفض.'); this.loadRequests(); closeModal(); },
    async approvePayment() { await AdminAPI.approvePayment(this.currentId); showToast('تم اعتماد الدفع.'); this.loadRequests(); closeModal(); },
    async rejectPayment() { const r = prompt('سبب الرفض:'); if(!r) return; await AdminAPI.rejectPayment(this.currentId, r); showToast('تم رفض الدفع.'); this.loadRequests(); closeModal(); },
    async loadAI() { try { const r = await AdminAPI.getAIInstructions(); document.getElementById('aiPromptTextarea').value = r.instructions||''; } catch(e) {} },
    async saveAI() { try { await AdminAPI.saveAIInstructions(document.getElementById('aiPromptTextarea').value); showToast('تم الحفظ.'); } catch(e) { showToast(e.message,'error'); } },
    async loadArticles() {
        try {
            const arts = await AdminAPI.getArticles();
            const tbody = document.getElementById('articlesTableBody'); if(!tbody) return;
            tbody.innerHTML = arts.length ? arts.map(a => `<tr><td>${a.title}</td><td>${a.createdAt?new Date(a.createdAt).toLocaleDateString('ar-YE'):''}</td><td><button onclick="AdminModule.editArticle('${a.id}','${a.title}','${a.summary}','${a.content}')">تعديل</button> <button onclick="AdminModule.deleteArticle('${a.id}')">حذف</button></td></tr>`).join('') : '<tr><td colspan="3">لا توجد مقالات.</td></tr>';
        } catch(e) {}
    },
    showArticleForm() { document.getElementById('articleFormContainer').style.display='block'; document.getElementById('editArticleId').value=''; document.getElementById('artTitle').value=''; document.getElementById('artSummary').value=''; document.getElementById('articleContentEditor').innerHTML = ''; },
    async saveArticle(e) {
        e.preventDefault();
        const id = document.getElementById('editArticleId').value;
        const title = document.getElementById('artTitle').value;
        const summary = document.getElementById('artSummary').value;
        const content = document.getElementById('articleContentEditor').innerHTML;
        try {
            if(id) await AdminAPI.updateArticle(id, title, summary, content);
            else await AdminAPI.createArticle(title, summary, content);
            showToast('تم الحفظ.'); this.loadArticles(); document.getElementById('articleFormContainer').style.display='none';
        } catch(err) { showToast(err.message,'error'); }
    },
    editArticle(id, title, summary, content) {
        document.getElementById('articleFormContainer').style.display='block';
        document.getElementById('editArticleId').value = id;
        document.getElementById('artTitle').value = title;
        document.getElementById('artSummary').value = summary;
        document.getElementById('articleContentEditor').innerHTML = content;
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
    async deleteReview(id) { if(!confirm('حذف؟')) return; await AdminAPI.deleteReview(id); showToast('تم الحذف.'); this.loadReviews(); },
    async sendEngineerCommand() {
        const command = document.getElementById('engineerCommand')?.value.trim();
        if (!command) return showToast('الرجاء كتابة أمر.', 'error');
        try {
            const res = await AdminAPI.sendEngineerCommand(command);
            const responseDiv = document.getElementById('engineerResponse');
            if(responseDiv) {
                responseDiv.style.display = 'block';
                responseDiv.textContent = res.reply;
            }
            document.getElementById('engineerCommand').value = '';
        } catch (e) { showToast(e.message, 'error'); }
    }
};

function sendEngineerCommand() { AdminModule.sendEngineerCommand(); }
function closeModal() { document.getElementById('detailsModal').classList.remove('show'); }

document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname;
    if(path==='/'||path.endsWith('index.html')) HomeModule.init();
    else if(path.includes('dashboard')) DashboardModule.init();
    else if(path.includes('admin')) AdminModule.init();
});
