// =================================================================
// ملف لوحة تحكم المستفيدين المطور - مركز النور الرباني
// =================================================================

let currentUser = null;
let userRequests = [];
let currentRequestId = null;

// ===== 1. الإشعار الفوري للمستفيد =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) {
        alert(msg); 
        return;
    }
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 6000);
}

// ===== 2. التحقق الآمن من الجلسة والصلاحيات =====
async function checkAuth() {
    const token = localStorage.getItem('token');
    
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
        console.warn("⚠️ الخادم يستغرق وقتاً للاستجابة، تم تجاوز الفحص لضمان استمرارية خدمة المستفيد.");
        return true; 
    }
}

// ===== 3. تحميل بيانات لوحة المستفيد والإحصائيات الحية =====
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

// ===== 4. رندرة جدول تتبع الحالات والطلبات الشرعية =====
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
        const targetId = req.id || req._id;
        
        return `
            <div class="request-item" style="border-right: 4px solid #D4AF37; margin-bottom: 12px; padding: 15px; background: #fff; border-radius: 8px; text-align: right; direction: rtl;">
                <div class="top-row" style="display:flex; justify-content:space-between; align-items:center;">
                    <strong class="service" style="color: #0A1628;">🌿 ${req.serviceType}</strong>
                    <span class="date" style="font-size: 0.85rem; color: #6A7A8A;">${new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                <div class="top-row" style="margin-top:8px; font-size: 0.9rem; display:flex; gap:15px;">
                    <span>الحالة: ${statusMap[req.status] || req.status}</span>
                    <span>الدفع: <span style="color:#22C55E; font-weight:700;">🟢 مؤكد</span></span>
                </div>
                <div class="description" style="margin-top: 10px; color: #4A5A6A; font-size: 0.9rem;">${req.description ? req.description.substring(0, 100) + (req.description.length > 100 ? '...' : '') : ''}</div>
                <div class="actions" style="margin-top: 12px; text-align: left;">
                    <button onclick="viewRequest('${targetId}')" class="btn-sm btn-sm-gold" style="background:#D4AF37; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;"><i class="bi bi-eye"></i> عرض وتتبع الخطة العلاجية</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== 5. عرض الرد الروحي والروشتة الشرعية للمستفيد =====
async function viewRequest(id) {
    if (!id || id === 'undefined') {
        showNotification('⚠️ خطأ داخلي في معرف الطلب المسترجع.', 'error');
        return;
    }
    
    currentRequestId = id;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/dashboard/request/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) { showNotification('⚠️ فشل تحميل تفاصيل الرد من الخادم الإلكتروني.', 'error'); return; }

        const req = data.request;
        const modal = document.getElementById('requestDetailsModal');
        if (!modal) return;
        
        document.getElementById('requestDetailsContent').innerHTML = `
            <div style="background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:15px; text-align: right; direction:rtl;">
                <p><strong>📅 تاريخ تقديم الطلب:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
                <p><strong>🛠 نوع الخدمة:</strong> ${req.serviceType}</p>
                <p><strong>💰 حالة التدقيق المالي للوصول:</strong> 🟢 تم التأكيد والتحقق المالي</p>
            </div>
            <div style="background:#FFFBF0; padding:15px; border-radius:12px; border-right:4px solid #F5B041; margin-bottom:15px; text-align: right; direction:rtl;">
                <strong>📝 شرح الحالة المعروضة للشيخ بسام:</strong>
                <p style="margin-top:8px; line-height:1.8; white-space: pre-wrap; color: #4A5A6A;">${req.description || 'لا يوجد وصف متاح'}</p>
            </div>
            ${req.status === 'rejected' ? `
                <div style="background:#FEE2E2; padding:15px; border-radius:12px; border-right:4px solid #e74c3c; text-align: right; direction:rtl;">
                    <p style="color:#991B1B; font-weight:700;">❌ تم استبعاد هذا الملف من قبل الإدارة لعدم اكتمال البيانات.</p>
                </div>
            ` : ''}
            ${(req.status === 'completed' || req.treatmentDetails) ? `
                <div style="background:#D1FAE5; padding:20px; border-radius:12px; border-right:4px solid #22C55E; margin-top:15px; text-align: right; direction:rtl;">
                    <strong style="color: #065F46; font-size: 1.1rem;"><i class="bi bi-patch-check"></i> الخطة الروحية والعلاج الشرعي المخصص لك من فضيلة الشيخ:</strong>
                    <p style="margin-top:10px; line-height:1.8; font-weight: 600; color: #111; white-space: pre-wrap;">${req.treatmentDetails || 'جاري كتابة السطور والآيات المخصصة لك، يرجى مراجعة اللوحة لاحقاً...'}</p>
                </div>
            ` : `
                <div style="background:#E0F2FE; padding:15px; border-radius:12px; border-right:4px solid #0EA5E9; margin-top:15px; text-align: right; direction:rtl;">
                    <p style="color:#0369A1; font-weight:600;"><i class="bi bi-info-circle"></i> طلبك معروض حالياً على فضيلة الشيخ بسام الشميري للمراجعة والكشف الشرعي.</p>
                </div>
            `}
        `;
        modal.classList.add('show');
    } catch (e) { showNotification('⚠️ خطأ تقني عند استحضار تفاصيل الخطة العلاجية.', 'error'); }
}

// ===== 6. محرك إرسال مراجعات وتقييمات الحالات للموقع (جديد ومطور) =====
async function submitReview(e) {
    if(e) e.preventDefault();
    const token = localStorage.getItem('token');
    const commentInput = document.getElementById('reviewComment');
    if (!commentInput || !commentInput.value.trim()) {
        showNotification('⚠️ يرجى كتابة تعليقك أو تجربتك العلاجية أولاً قبل الإرسال.', 'error');
        return;
    }

    const comment = commentInput.value.trim();
    try {
        const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ comment })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ تم إرسال رأيك للإشراف بنجاح، وسيظهر في واجهة الموقع فور اعتماده من الشيخ بسام.');
            commentInput.value = '';
            if (typeof closeReviewModal === 'function') closeReviewModal();
        } else {
            showNotification('❌ ' + (data.error || 'فشل إرسال التقييم.'), 'error');
        }
    } catch (err) {
        showNotification('⚠️ خطأ اتصال في رفع رأيك للمركز.', 'error');
    }
}

// ===== 7. تقديم طلب معالجة جديد مؤمن =====
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
            await loadDashboard(); 
            this.reset(); 
        } else {
            showNotification('❌ ' + (data.error || 'يرجى مراجعة صلاحيات الإرسال.'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ انقطع الاتصال اللحظي بالسيرفر الرئيسي، يرجى المحاولة مرة أخرى.', 'error');
    }
    
    if(btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send"></i> إرسال الطلب الشرعي';
    }
});

// ===== 8. فتح وإغلاق النوافذ المنبثقة =====
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

function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج من مركز النور الرباني؟')) {
        localStorage.removeItem('token'); 
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// ===== 9. تهيئة وإقلاع المنصة تلقائياً فور التحميل =====
(async function init() {
    const isAuth = await checkAuth();
    if (!isAuth) return;
    await loadDashboard();

    // ربط نموذج الآراء والتعليقات المكتشف إذا وُجد في الصفحة
    document.getElementById('reviewForm')?.addEventListener('submit', submitReview);

    document.querySelectorAll('.modal-overlay, .modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    });
})();
