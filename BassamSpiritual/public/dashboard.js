// ===== متغيرات عامة =====
let currentUser = null;
let userRequests = [];
let currentRequestId = null;

// ===== الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) {
        alert(msg); // حماية بديلة في حال غياب عنصر الـ HTML
        return;
    }
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
        const res = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
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
        console.warn("⚠️ الخادم يستغرق وقتاً للاستجابة، تم تجاوز الفحص المؤقت لضمان استمرارية الخدمة للمستفيد.");
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
        if (!data.success) { showNotification('⚠️ حدث خطأ في تحميل البيانات من السيرفر.', 'error'); return; }

        currentUser = data.user;
        userRequests = data.requests || [];

        if(document.getElementById('userName')) document.getElementById('userName').innerHTML = `مرحباً، <span>${data.user.fullName}</span>`;
        if(document.getElementById('userEmail')) document.getElementById('userEmail').textContent = data.user.email;
        if(document.getElementById('sidebarName')) document.getElementById('sidebarName').textContent = data.user.fullName;
        if(document.getElementById('sidebarEmail')) document.getElementById('sidebarEmail').textContent = data.user.email;
        if(document.getElementById('sidebarPhone')) document.getElementById('sidebarPhone').textContent = data.user.phone || 'غير مضاف';
        if(document.getElementById('sidebarJoined') && data.user.createdAt) document.getElementById('sidebarJoined').textContent = new Date(data.user.createdAt).toLocaleDateString('ar-EG');
        if(document.getElementById('userInitial')) document.getElementById('userInitial').textContent = data.user.fullName.charAt(0);

        const total = userRequests.length;
        const pending = userRequests.filter(r => r.status === 'pending' || r.status === 'processing').length;
        const completed = userRequests.filter(r => r.status === 'completed').length;
        const rejected = userRequests.filter(r => r.status === 'rejected').length;
        
        if(document.getElementById('statTotal')) document.getElementById('statTotal').textContent = total;
        if(document.getElementById('statPending')) document.getElementById('statPending').textContent = pending;
        if(document.getElementById('statCompleted')) document.getElementById('statCompleted').textContent = completed;
        if(document.getElementById('statRejected')) document.getElementById('statRejected').textContent = rejected;

        renderRequests(userRequests);
    } catch (e) { showNotification('⚠️ خطأ في الاتصال بالخادم وتحميل بيانات اللوحة.', 'error'); }
}

// ===== عرض الطلبات بالاعتماد على التمييز الذكي للمعرف المتاح =====
function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!container) return;
    
    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#6A7A8A;">
                <i class="bi bi-inbox" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
                لا توجد طلبات حتى الآن. اضغط على "طلب جديد" لتقديم طلبك للشيخ بسام.
            </div>
        `;
        return;
    }

    const statusMap = {
        'pending': '<span class="status-badge status-pending">⏳ قيد الانتظار</span>',
        'processing': '<span class="status-badge status-processing">⚙️ قيد المعالجة الروحية</span>',
        'completed': '<span class="status-badge status-completed">✅ مكتمل (تم الرد)</span>',
        'rejected': '<span class="status-badge status-rejected">❌ مستبعد</span>'
    };

    container.innerHTML = requests.map(req => {
        // حماية ذكية لاختيار المعرف الصحيح المسترجع سواء كان id أو _id لضمان عدم توقف الزر
        const targetId = req._id || req.id;
        
        return `
            <div class="request-item" style="border-right: 4px solid var(--gold, #D4AF37); margin-bottom: 12px; padding: 15px; background: #fff; border-radius: 8px;">
                <div class="top-row">
                    <strong class="service" style="color: #0A1628;">🌿 ${req.serviceType}</strong>
                    <span class="date" style="font-size: 0.85rem; color: #6A7A8A;">${new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                <div class="top-row" style="margin-top:8px; font-size: 0.9rem;">
                    <span>الحالة: ${statusMap[req.status] || req.status}</span>
                    <span>الدفع: ${req.paymentStatus === 'verified' ? '<span style="color:#22C55E; font-weight:700;">🟢 مؤكد</span>' : req.paymentStatus === 'paid' ? '<span style="color:#F5B041; font-weight:700;">🟡 قيد المراجعة</span>' : '<span style="color:#EF4444; font-weight:700;">🔴 غير مدفوع</span>'}</span>
                </div>
                <div class="description" style="margin-top: 10px; color: #4A5A6A; font-size: 0.9rem;">${req.description ? req.description.substring(0, 100) + (req.description.length > 100 ? '...' : '') : ''}</div>
                <div class="actions" style="margin-top: 12px; text-align: left;">
                    <button onclick="viewRequest('${targetId}')" class="btn-sm btn-sm-gold"><i class="bi bi-eye"></i> عرض وتتبع الخطة</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== عرض تفاصيل الطلب وحقن البرنامج العلاجي الحقيقي للمريض =====
async function viewRequest(id) {
    if (!id || id === 'undefined') {
        showNotification('⚠️ خطأ داخلي في معرف الطلب المسترجع.', 'error');
        return;
    }
    
    currentRequestId = id;
    const token = localStorage.getItem('token');
    try {
        // الاتصال بالمسار لطلب تفاصيل الكود من السيرفر
        const res = await fetch(`/api/dashboard/request/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) { showNotification('⚠️ فشل تحميل تفاصيل الرد من الخادم الإلكتروني.', 'error'); return; }

        const req = data.request;
        const modal = document.getElementById('requestDetailsModal');
        if (!modal) return;
        
        document.getElementById('requestDetailsContent').innerHTML = `
            <div style="background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:15px; text-align: right;">
                <p><strong>📅 تاريخ تقديم الطلب:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
                <p><strong>🛠 نوع الخدمة:</strong> ${req.serviceType}</p>
                <p><strong>📩 طريقة التواصل المعتمدة:</strong> ${req.contactMethod === 'whatsapp' ? 'الواتساب المباشر' : 'البريد الإلكتروني'}</p>
                <p><strong>💰 حالة التدقيق المالي للوصول:</strong> ${req.paymentStatus === 'verified' ? '🟢 تم التأكيد مالياً' : '🔴 في انتظار التحقق'}</p>
            </div>
            <div style="background:#FFFBF0; padding:15px; border-radius:12px; border-right:4px solid #F5B041; margin-bottom:15px; text-align: right;">
                <strong>📝 شرح الحالة المعروضة للشيخ بسام:</strong>
                <p style="margin-top:8px; line-height:1.8; white-space: pre-wrap; color: #4A5A6A;">${req.description || 'لا يوجد وصف متاح'}</p>
            </div>
            ${req.status === 'rejected' ? `
                <div style="background:#FEE2E2; padding:15px; border-radius:12px; border-right:4px solid #e74c3c; text-align: right;">
                    <p style="color:#991B1B; font-weight:700;">❌ تم استبعاد هذا الملف من قبل الإدارة لعدم اكتمال الشروط الماليّة أو البيانات.</p>
                </div>
            ` : ''}
            ${(req.status === 'completed' || req.treatmentDetails || req.adminReply) ? `
                <div style="background:#D1FAE5; padding:20px; border-radius:12px; border-right:4px solid #22C55E; margin-top:15px; text-align: right;">
                    <strong style="color: #065F46; font-size: 1.1rem;"><i class="bi bi-patch-check"></i> الخطة الروحية والعلاج الشرعي المخصص لك:</strong>
                    <p style="margin-top:10px; line-height:1.8; font-weight: 600; color: #111; white-space: pre-wrap;">${req.treatmentDetails || req.adminReply || 'جاري كتابة السطور والآيات المخصصة لك، يرجى مراجعة اللوحة لاحقاً...'}</p>
                </div>
            ` : `
                <div style="background:#E0F2FE; padding:15px; border-radius:12px; border-right:4px solid #0EA5E9; margin-top:15px; text-align: right;">
                    <p style="color:#0369A1; font-weight:600;"><i class="bi bi-info-circle"></i> طلبك معروض حالياً على فضيلة الشيخ بسام الشميري للمراجعة والكشف الشرعي.</p>
                </div>
            `}
        `;
        modal.classList.add('show');
    } catch (e) { showNotification('⚠️ خطأ تقني غير معروف عند استحضار تفاصيل الخطة.', 'error'); }
}

// ===== فتح وإغلاق المودالات =====
function openNewRequestModal() {
    const modal = document.getElementById('newRequestModal');
    if (modal) modal.classList.add('show');
}
function closeNewRequestModal() {
    const modal = document.getElementById('newRequestModal');
    if (modal) modal.classList.remove('show');
}
function closeDetailsModal() {
    const modal = document.getElementById('requestDetailsModal');
    if (modal) modal.classList.remove('show');
}

// ===== تقديم طلب جديد مؤمن وحي ومربوط بالهيدرز المعتمدة =====
document.getElementById('newRequestForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const serviceType = document.getElementById('reqServiceType').value;
    const contactMethod = document.getElementById('reqContactMethod').value;
    const description = document.getElementById('reqDescription').value.trim();

    if (!description || description.length < 5) {
        showNotification('⚠️ يرجى تفصيل المشكلة بوصف لا يقل عن 5 أحرف.', 'error');
        return;
    }

    const btn = this.querySelector('button[type="submit"]');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> جاري إرسال البيانات للسيرفر الحركي...';
    }

    try {
        const res = await fetch('/api/dashboard/request', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ serviceType, description, contactMethod })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ ' + (data.message || 'تم رفع طلبك للمركز بنجاح!'), 'success');
            closeNewRequestModal();
            await loadDashboard(); // إعادة تحميل حي وفوري للبيانات
            this.reset(); 
        } else {
            showNotification('❌ ' + (data.error || 'يرجى مراجعة مسؤول الموقع لفحص صلاحيات الإرسال.'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ انقطع الاتصال اللحظي بالسيرفر الرئيسي، يرجى المحاولة مرة أخرى.', 'error');
    }
    
    if(btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send"></i> إرسال الطلب الشرعي';
    }
});

// ===== تسجيل الخروج الآمن وبدء تنظيف التوكن المتقادم =====
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج من مركز النور الروحاني؟')) {
        localStorage.removeItem('token'); 
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// ===== تبويبات اللوحة الرسمية =====
function showTab(tab) {
    const tabReq = document.getElementById('tabRequests');
    const tabBtn = document.getElementById('tabRequestsBtn');
    if (tabReq) tabReq.style.display = 'block';
    if (tabBtn) tabBtn.className = 'btn-primary';
}

// ===== تهيئة وإقلاع اللوحة البرمجية تلقائياً فور التحميل الأول =====
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
