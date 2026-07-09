// =================================================================
// ملف النواة البرمجية الحي المتوافق مع تنسيقات admin.css - مركز النور الرباني
// =================================================================

let currentRequests = [];
let selectedRequestId = null;

// ===== 1. محرك الإشعارات السريعة لراحة البال =====
function showNotification(msg, type = 'success') {
    // محرك بسيط لإظهار التنبيهات بشكل أنيق دون إفساد التصميم
    alert(msg); 
}

// ===== 2. جلب الطلبات الحية من السيرفر (Render API) =====
async function loadRequests() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#6A7A8A;"><i class="fas fa-spinner fa-spin"></i> جاري جلب ملفات المستفيدين الحية من السيرفر...</td></tr>';

    try {
        const res = await fetch('/api/admin/requests', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            currentRequests = data.requests || [];
            renderTable(currentRequests);
            updateStats(currentRequests);
        } else {
            showNotification('⚠️ فشل السيرفر في التعرف على صلاحيات المدير، يرجى إعادة تسجيل الدخول.', 'error');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#e74c3c;">فشل تحميل البيانات الحية.</td></tr>';
        }
    } catch (error) {
        console.error(error);
        showNotification('❌ خطأ في الاتصال بقاعدة البيانات. تأكد أن السيرفر مستيقظ.', 'error');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#e74c3c;">خطأ في الاتصال بالسيرفر.</td></tr>';
    }
}

// ===== 3. رندرة وعرض جدول الطلبات بالاعتماد الكلي على فئات الـ CSS الخاصة بك =====
function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#6A7A8A;">📭 لا توجد طلبات جديدة مرسلة من المستفيدين حالياً.</td></tr>';
        return;
    }
    
    // استخدام التنسيقات الجاهزة من ملف admin.css الخاص بك (.status-badge)
    const statusMap = {
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> قيد الانتظار</span>',
        'processing': '<span class="status-badge status-processing"><i class="fas fa-spinner fa-spin"></i> قيد العلاج</span>',
        'completed': '<span class="status-badge status-completed"><i class="fas fa-check-circle"></i> مكتمل</span>',
        'rejected': '<span class="status-badge status-rejected"><i class="fas fa-times-circle"></i> مستبعد</span>'
    };

    const paymentMap = {
        'verified': '<span style="color:#22C55E; font-weight:700;">🟢 مؤكد</span>',
        'paid': '<span style="color:#F5B041; font-weight:700;">🟡 قيد المراجعة</span>',
        'unpaid': '<span style="color:#EF4444; font-weight:700;">🔴 غير مدفوع</span>'
    };
    
    tbody.innerHTML = requests.map((req, index) => {
        const uName = req.userId?.fullName || req.fullName || 'مستفيد غير مسجل';
        const uEmail = req.userId?.email || req.email || '—';
        const idToUse = req._id || req.id;
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE', {year: 'numeric', month: 'short', day: 'numeric'}) : '—';

        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong style="color: var(--sidebar-bg); cursor:pointer; text-decoration:underline;" onclick="viewDetails('${idToUse}')">👤 ${uName}</strong></td>
                <td style="color:#4A5A6A;">${uEmail}</td>
                <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:8px; font-size:0.9rem; color:var(--sidebar-bg);">${req.serviceType || 'استشارة عامة'}</span></td>
                <td>${statusMap[req.status] || statusMap.pending}</td>
                <td>${paymentMap[req.paymentStatus] || paymentMap.unpaid}</td>
                <td style="font-size:0.85rem; color:#6A7A8A;">${date}</td>
                <td>
                    <!-- الاعتماد على تصميم الأزرار الفخم في ملفك .action-btn -->
                    <button class="action-btn edit" onclick="viewDetails('${idToUse}')" title="قراءة وتعديل الطلب">
                        <i class="fas fa-folder-open"></i> معالجة
                    </button>
                    <button class="action-btn delete" onclick="deleteRequest('${idToUse}')" title="حذف نهائي">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== 4. تحديث بطاقات الإحصائيات العلوية بالبيانات الحقيقية =====
function updateStats(requests) {
    if(!document.getElementById('totalCount')) return;
    document.getElementById('totalCount').innerText = requests.length;
    document.getElementById('pendingCount').innerText = requests.filter(r => r.status === 'pending').length;
    document.getElementById('completedCount').innerText = requests.filter(r => r.status === 'completed' || r.status === 'processing').length;
    document.getElementById('rejectedCount').innerText = requests.filter(r => r.status === 'rejected').length;
}

// ===== 5. البحث الفوري والفلترة بالاسم أو البريد الإلكتروني =====
function filterTable() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        renderTable(currentRequests);
        return;
    }
    const filtered = currentRequests.filter(r => {
        const name = r.userId?.fullName || r.fullName || '';
        const email = r.userId?.email || r.email || '';
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || (r.serviceType || '').toLowerCase().includes(query);
    });
    renderTable(filtered);
}

// ===== 6. فتح تفاصيل الحالة الحية المتوافقة مع المودال الخاص بك =====
async function viewDetails(id) {
    selectedRequestId = id;
    const token = localStorage.getItem('token');
    const modal = document.getElementById('detailsModal');
    const mBody = document.getElementById('modalBody');
    if (!modal || !mBody) return;

    mBody.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i> جاري استحضار بيانات المستفيد من قاعدة البيانات...</div>';
    
    // تفعيل المودال باستخدام فئة .show المحددة في ملف الـ CSS الخاص بك
    modal.classList.add('show'); 

    try {
        const res = await fetch(`/api/admin/request/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            showNotification('⚠️ فشل الخادم في جلب تفاصيل هذا الطلب.', 'error');
            closeModal();
            return;
        }

        const req = data.request;
        const uName = req.userId?.fullName || req.fullName || 'مستفيد عابر';
        const uEmail = req.userId?.email || req.email || 'لا يوجد';
        const uPhone = req.userId?.phone || req.phone || '';

        let whatsappSection = '';
        if (uPhone) {
            const cleanPhone = uPhone.replace(/\D/g, '');
            const encodedText = encodeURIComponent(`أهلاً بك يا ${uName}، معك الشيخ بسام الشميري من مركز النور الرباني بخصوص طلبك لخدمة (${req.serviceType}).`);
            whatsappSection = `
                <a href="https://wa.me/${cleanPhone}?text=${encodedText}" target="_blank" style="display:inline-block; background:#25D366; color:#fff; text-decoration:none; padding:8px 15px; border-radius:8px; font-weight:600; margin-top:8px; font-size:0.9rem;">
                    <i class="fab fa-whatsapp"></i> تواصل سريع عبر الواتساب (${uPhone})
                </a>
            `;
        }

        mBody.innerHTML = `
            <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px; border-right:4px solid var(--gold); text-align: right;">
                <p style="margin:5px 0;"><strong>👤 اسم المستفيد الرباعي:</strong> ${uName}</p>
                <p style="margin:5px 0;"><strong>📧 البريد الإلكتروني:</strong> ${uEmail}</p>
                <p style="margin:5px 0;"><strong>🛠 نوع الخدمة المطلوبة:</strong> <span style="background:var(--sidebar-bg); color:#fff; padding:2px 8px; border-radius:6px; font-size:0.85rem;">${req.serviceType}</span></p>
                ${whatsappSection}
            </div>

            <div style="margin-bottom:15px; text-align: right;">
                <strong style="color:var(--sidebar-bg); display:block; margin-bottom:5px;"><i class="fas fa-align-right"></i> شرح المشكلة أو الحالة الروحية المعروضة:</strong>
                <div style="background:#fff; border:2px solid #e2e8f0; padding:12px; border-radius:12px; max-height:150px; overflow-y:auto; white-space:pre-wrap; color:#4A5A6A; line-height:1.6;">${req.description || 'لا يوجد وصف.'}</div>
            </div>

            <hr style="margin:20px 0; border:0; border-top:2px dashed #e2e8f0;">

            <div style="margin-bottom:15px; text-align: right;">
                <label style="font-weight:700; color:var(--sidebar-bg);">💰 تحديث حالة الدفع المالي للمركز:</label>
                <select id="statusPaymentSelect">
                    <option value="unpaid" ${req.paymentStatus === 'unpaid' ? 'selected' : ''}>🔴 غير مدفوع</option>
                    <option value="paid" ${req.paymentStatus === 'paid' ? 'selected' : ''}>🟡 قيد المراجعة (أرسل الإيصال)</option>
                    <option value="verified" ${req.paymentStatus === 'verified' ? 'selected' : ''}>🟢 تم التأكيد والتحقق المالي</option>
                </select>
            </div>

            <div style="margin-bottom:15px; text-align: right;">
                <label style="font-weight:700; color:var(--sidebar-bg);">⏳ خطة سير العمل (الحالة):</label>
                <select id="statusSelect">
                    <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار والمراجعة الأولية</option>
                    <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>⚙️ قيد العلاج والمتابعة الروحية</option>
                    <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>✅ تم الانتهاء وإرسال الخطة العلاجية</option>
                    <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>❌ طلب مستبعد</option>
                </select>
            </div>

            <div style="margin-bottom:15px; text-align: right;">
                <label style="font-weight:700; color:var(--sidebar-bg);">🌿 البرنامج العلاجي والرد الروحي (الروشتة الشرعية):</label>
                <textarea id="replyText" rows="5" placeholder="اكتب الآيات والأذكار المخصصة للمريض...">${req.treatmentDetails || req.adminReply || ''}</textarea>
            </div>

            <div style="text-align:left; margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                <button onclick="closeModal()" class="btn-close-modal">إلغاء</button>
                <button onclick="saveChanges()" class="btn-save-reply">💾 حفظ البيانات وإرسال العلاج</button>
            </div>
        `;
    } catch (e) {
        mBody.innerHTML = '<div style="text-align:center; color:#e74c3c; padding:20px;">حدث خطأ أثناء الاتصال بقاعدة البيانات لتفاصيل العميل.</div>';
    }
}

// ===== 7. إرسال التغييرات وحفظها بشكل حي ومستدام في السيرفر الرئيسي =====
async function saveChanges() {
    const token = localStorage.getItem('token');
    const status = document.getElementById('statusSelect').value;
    const paymentStatus = document.getElementById('statusPaymentSelect').value;
    const treatmentDetails = document.getElementById('replyText').value.trim();
    
    try {
        const res = await fetch(`/api/admin/request/${selectedRequestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, paymentStatus, treatmentDetails })
        });

        const data = await res.json();
        if (data.success) {
            showNotification('✅ تم حفظ التعديلات وإدراج الخطة العلاجية في حساب المستفيد بنجاح!', 'success');
            closeModal();
            loadRequests(); // تحديث الجدول تلقائياً بالبيانات الحية الجديدة
        } else {
            showNotification('❌ ' + (data.error || 'فشل الخادم في حفظ التعديلات.'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال بالخادم عند معالجة طلب الإرسال.', 'error');
    }
}

// ===== 8. حذف طلب بشكل نهائي من قاعدة البيانات عبر السيرفر =====
async function deleteRequest(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الطلب نهائياً من قاعدة بيانات السيرفر والموقع؟ لا يمكن التراجع!')) return;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/request/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            showNotification('🗑️ تم حذف ملف المستفيد من قاعدة البيانات بنجاح.', 'success');
            loadRequests();
        } else {
            showNotification('❌ فشل السيرفر في تنفيذ أمر الحذف.', 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال بالسيرفر أثناء محاولة الحذف.', 'error');
    }
}

// ===== 9. إغلاق النافذة المنبثقة بحذف كلاس .show =====
function closeModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.classList.remove('show');
}

// ===== 10. الساعة التلقائية المحدثة لضبط الوقت باللوحة =====
function updateClock() {
    const clockEl = document.getElementById('currentTime');
    if(clockEl) {
        clockEl.innerText = new Date().toLocaleString('ar-YE', { hour12: true, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
setInterval(updateClock, 1000);

// ===== 11. إقلاع اللوحة والبدء المباشر فور تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    
    // التحقق من صلاحية التوكن قبل الاتصال بالسيرفر
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html';
    } else {
        loadRequests();
    }
});
