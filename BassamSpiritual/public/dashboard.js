// ===== متغيرات عامة =====
let currentUser = null;
let userRequests = [];
let currentRequestId = null;

// ===== الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 6000);
}

// ===== التحقق من الجلسة (نسخة مصلحة تمنع الطرد التلقائي) =====
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    // إذا لم يكن هناك توكن نهائياً، يطرد فوراً
    if (!token) { 
        window.location.href = '/login.html'; 
        return false; 
    }
    
    try {
        // نرسل طلب التحقق للخلفية
        const res = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // إذا كان السيرفر مستيقظاً وأعطى استجابة صريحة بالفشل، نطرد المستخدم
        if (res.status === 401 || res.status === 403) {
            const data = await res.json();
            if (!data.success) {
                localStorage.removeItem('token'); 
                localStorage.removeItem('user');
                window.location.href = '/login.html'; 
                return false;
            }
        }
        
        return true; 
    } catch (e) {
        // في حال حدوث خطأ اتصال (مثل تأخر سيرفر Render في الاستيقاظ)، 
        // لا نطرد المستخدم! نتركه يرى لوحة التحكم والتوكن سيتولى جلب البيانات لاحقاً.
        console.warn("⚠️ الخادم يستغرق وقتاً للاستجابة، تم تجاوز الفحص المؤقت.");
        return true; 
    }
}

// ===== تحميل لوحة التحكم =====
async function loadDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/dashboard/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) { showNotification('⚠️ حدث خطأ في تحميل البيانات.', 'error'); return; }

        currentUser = data.user;
        userRequests = data.requests || [];

        document.getElementById('userName').innerHTML = `مرحباً، <span>${data.user.fullName}</span>`;
        document.getElementById('userEmail').textContent = data.user.email;
        document.getElementById('sidebarName').textContent = data.user.fullName;
        document.getElementById('sidebarEmail').textContent = data.user.email;
        document.getElementById('sidebarPhone').textContent = data.user.phone || 'غير مضاف';
        document.getElementById('sidebarJoined').textContent = new Date(data.user.createdAt).toLocaleDateString('ar-EG');
        document.getElementById('userInitial').textContent = data.user.fullName.charAt(0);

        const total = userRequests.length;
        const pending = userRequests.filter(r => r.status === 'pending' || r.status === 'processing').length;
        const completed = userRequests.filter(r => r.status === 'completed').length;
        const rejected = userRequests.filter(r => r.status === 'rejected').length;
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statRejected').textContent = rejected;

        renderRequests(userRequests);
    } catch (e) { showNotification('⚠️ خطأ في تحميل البيانات.', 'error'); }
}

// ===== عرض الطلبات =====
function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#6A7A8A;">
                <i class="fas fa-inbox" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
                لا توجد طلبات حتى الآن. اضغط على "طلب جديد" لتقديم طلب.
            </div>
        `;
        return;
    }

    const statusMap = {
        'pending': '<span class="status-badge status-pending">⏳ قيد الانتظار</span>',
        'processing': '<span class="status-badge status-processing">⚙️ قيد المعالجة</span>',
        'completed': '<span class="status-badge status-completed">✅ مكتمل</span>',
        'rejected': '<span class="status-badge status-rejected">❌ مرفوض</span>'
    };

    container.innerHTML = requests.map(req => `
        <div class="request-item">
            <div class="top-row">
                <span class="service">${req.serviceType}</span>
                <span class="date">${new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
            </div>
            <div class="top-row" style="margin-top:5px;">
                <span>الحالة: ${statusMap[req.status] || req.status}</span>
                <span>الدفع: ${req.paymentStatus === 'verified' ? '✅ مؤكد' : req.paymentStatus === 'paid' ? '🟡 قيد المراجعة' : '🔴 غير مدفوع'}</span>
            </div>
            <div class="description">${req.description ? req.description.substring(0, 100) + (req.description.length > 100 ? '...' : '') : ''}</div>
            <div class="actions">
                <button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-gold"><i class="fas fa-eye"></i> عرض</button>
            </div>
        </div>
    `).join('');
}

// ===== عرض تفاصيل الطلب =====
async function viewRequest(id) {
    currentRequestId = id;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/dashboard/request/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) { showNotification('⚠️ فشل تحميل التفاصيل.', 'error'); return; }

        const req = data.request;
        const modal = document.getElementById('requestDetailsModal');
        document.getElementById('requestDetailsContent').innerHTML = `
            <div style="background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:15px;">
                <p><strong>📅 التاريخ:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
                <p><strong>🛠 الخدمة:</strong> ${req.serviceType}</p>
                <p><strong>📩 طريقة التواصل:</strong> ${req.contactMethod === 'whatsapp' ? 'واتساب' : 'بريد إلكتروني'}</p>
                <p><strong>💰 حالة الدفع:</strong> ${req.paymentStatus || 'غير مدفوع'}</p>
            </div>
            <div style="background:#FFFBF0; padding:15px; border-radius:12px; border-right:4px solid #F5B041; margin-bottom:15px;">
                <strong>📝 وصف المشكلة:</strong>
                <p style="margin-top:8px; line-height:1.8;">${req.description || 'لا يوجد وصف'}</p>
            </div>
            ${req.status === 'rejected' ? `
                <div style="background:#FEE2E2; padding:15px; border-radius:12px; border-right:4px solid #e74c3c;">
                    <p style="color:#991B1B;">❌ تم رفض الطلب من قبل الشيخ بسام.</p>
                </div>
            ` : ''}
            ${req.status === 'completed' && req.treatmentDetails ? `
                <div style="background:#D1FAE5; padding:15px; border-radius:12px; border-right:4px solid #27ae60; margin-top:15px;">
                    <strong>✅ العلاج:</strong>
                    <p style="margin-top:8px; line-height:1.8;">${req.treatmentDetails.replace(/\n/g, '<br>')}</p>
                </div>
            ` : ''}
        `;
        modal.classList.add('show');
    } catch (e) { showNotification('⚠️ خطأ في تحميل التفاصيل.', 'error'); }
}

// ===== فتح وإغلاق مودال الطلب الجديد =====
function openNewRequestModal() {
    document.getElementById('newRequestModal').classList.add('show');
}
function closeNewRequestModal() {
    document.getElementById('newRequestModal').classList.remove('show');
}
function closeDetailsModal() {
    document.getElementById('requestDetailsModal').classList.remove('show');
}

// ===== تقديم طلب جديد =====
document.getElementById('newRequestForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const serviceType = document.getElementById('reqServiceType').value;
    const contactMethod = document.getElementById('reqContactMethod').value;
    const description = document.getElementById('reqDescription').value.trim();

    if (!description || description.length < 5) {
        showNotification('⚠️ وصف المشكلة قصير جداً (5 أحرف على الأقل).', 'error');
        return;
    }

    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        const res = await fetch('/api/dashboard/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ serviceType, description, contactMethod })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ ' + data.message, 'success');
            closeNewRequestModal();
            loadDashboard();
        } else {
            showNotification('❌ ' + (data.error || 'فشل إرسال الطلب'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال بالخادم.', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
});

// ===== تسجيل الخروج =====
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('token'); localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// ===== تبويبات =====
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('tabRequests').style.display = 'block';
    document.getElementById('tabRequestsBtn').className = 'btn-primary';
}

// ===== تهيئة الصفحة =====
(async function init() {
    const isAuth = await checkAuth();
    if (!isAuth) return;
    await loadDashboard();
    showTab('requests');

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    });
})();
