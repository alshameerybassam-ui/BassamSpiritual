// ==================================================
// ملف النواة البرمجية لإدارة لوحة تحكم مركز النور الرباني
// ==================================================

let allRequests = [];
let selectedRequestId = null;

// ===== 1. محرك الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification ${type}`;
    n.style.display = 'block';
    if(type === 'success') n.style.background = '#27ae60';
    if(type === 'error') n.style.background = '#e74c3c';
    
    setTimeout(() => {
        n.style.display = 'none';
    }, 5000);
}

// ===== 2. التحقق التلقائي من هوية المسؤول =====
async function checkAdminAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// ===== 3. جلب الطلبات الشاملة للنظام من السيرفر =====
async function loadRequests() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> جاري تحديث ومزامنة البيانات مع السيرفر...</td></tr>';

    try {
        // الاتصال بمسار جلب جميع طلبات السيرفر المخصص للمسؤول
        const res = await fetch('/api/admin/requests', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            allRequests = data.requests || [];
            updateStats(allRequests);
            renderTable(allRequests);
        } else {
            showNotification('⚠️ فشل السيرفر في التعرف على صلاحيات المدير.', 'error');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#e74c3c;">فشل تحميل البيانات. تأكد من صلاحيات حسابك.</td></tr>';
        }
    } catch (error) {
        console.error(error);
        showNotification('❌ خطأ في الاتصال بالسيرفر. تأكد أن سيرفر ريندر مستيقظ.', 'error');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#e74c3c;">خطأ في الاتصال بقاعدة البيانات.</td></tr>';
    }
}

// ===== 4. معالجة الإحصائيات والأرقام في الكروت العلوية =====
function updateStats(requests) {
    if(!document.getElementById('totalCount')) return;
    
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending' || r.status === 'processing').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('rejectedCount').textContent = rejected;
}

// ===== 5. طباعة وعرض الطلبات في الجدول الرئيسي مع الروابط =====
function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!tbody || !requests) return;

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#6A7A8A;">لا توجد طلبات جديدة مرسلة من المستفيدين حتى الآن.</td></tr>';
        return;
    }

    const statusMap = {
        'pending': '<span style="background:#FEF3C7; color:#D97706; padding:4px 8px; border-radius:6px; font-size:0.85rem; font-weight:600;">⏳ قيد الانتظار</span>',
        'processing': '<span style="background:#DBEAFE; color:#2563EB; padding:4px 8px; border-radius:6px; font-size:0.85rem; font-weight:600;">⚙️ قيد المعالجة</span>',
        'completed': '<span style="background:#D1FAE5; color:#059669; padding:4px 8px; border-radius:6px; font-size:0.85rem; font-weight:600;">✅ مكتمل</span>',
        'rejected': '<span style="background:#FEE2E2; color:#DC2626; padding:4px 8px; border-radius:6px; font-size:0.85rem; font-weight:600;">❌ مرفوض</span>'
    };

    const paymentMap = {
        'verified': '<span style="color:#059669; font-weight:700;">🟢 مؤكد</span>',
        'paid': '<span style="color:#D97706; font-weight:700;">🟡 قيد المراجعة</span>',
        'unpaid': '<span style="color:#DC2626; font-weight:700;">🔴 غير مدفوع</span>'
    };

    tbody.innerHTML = requests.map((req, index) => {
        const uName = req.userId?.fullName || req.fullName || 'مستفيد غير مسجل';
        const uEmail = req.userId?.email || req.email || 'لا يوجد بريد';
        const reqId = req._id || req.id;

        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>
                    <span style="color:#E67E22; font-weight:700; cursor:pointer; text-decoration:underline;" onclick="openRequestDetails('${reqId}')">
                        👤 ${uName}
                    </span>
                </td>
                <td><span style="color:#4A5A6A; font-size:0.9rem;">${uEmail}</span></td>
                <td><span style="font-weight:600; color:#0A1628;">${req.serviceType}</span></td>
                <td>${statusMap[req.status] || req.status}</td>
                <td>${paymentMap[req.paymentStatus] || paymentMap['unpaid']}</td>
                <td><span style="font-size:0.85rem; color:#6A7A8A;">${new Date(req.createdAt).toLocaleDateString('ar-EG')}</span></td>
                <td>
                    <button onclick="openRequestDetails('${reqId}')" style="background:#0A1628; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-family:'Cairo'; font-size:0.85rem;">
                        <i class="fas fa-folder-open"></i> مراجعة واتخاذ إجراء
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== 6. فتح المودال وحقن استمارة التحكم وعلاج المريض وعرض هاتفه =====
async function openRequestDetails(id) {
    selectedRequestId = id;
    const token = localStorage.getItem('token');
    const modal = document.getElementById('detailsModal');
    const mBody = document.getElementById('modalBody');
    if (!modal || !mBody) return;

    mBody.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i> جاري استحضار بيانات المستفيد العميقة...</div>';
    modal.style.display = 'flex';

    try {
        const res = await fetch(`/api/admin/request/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            showNotification('⚠️ فشل جلب تفاصيل الطلب من الخادم.', 'error');
            closeModal();
            return;
        }

        const req = data.request;
        const uName = req.userId?.fullName || req.fullName || 'مستفيد عابر';
        const uEmail = req.userId?.email || req.email || 'لا يوجد';
        const uPhone = req.userId?.phone || req.phone || 'غير مدرج';

        mBody.innerHTML = `
            <div style="background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:15px; font-size:0.95rem; line-height:1.8; text-align: right;">
                <h4 style="margin-top:0; color:#0A1628; border-bottom:2px solid #E2E8F0; padding-bottom:5px;">📋 معلومات التواصل والملف الشخصي</h4>
                <p><strong>👤 اسم المستفيد الرباعي:</strong> ${uName}</p>
                <p><strong>📞 هاتف الواتساب:</strong> <a href="https://wa.me/${uPhone}" target="_blank" style="color:#27ae60; font-weight:700; text-decoration:none;"><i class="fab fa-whatsapp"></i> ${uPhone} (اضغط لمراسلته مباشرة)</a></p>
                <p><strong>✉️ البريد الإلكتروني:</strong> ${uEmail}</p>
                <p><strong>🛠 الخدمة المشتراة:</strong> ${req.serviceType}</p>
                <p><strong>📅 تاريخ تقديم الطلب:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
            </div>

            <div style="background:#FFFBF0; padding:15px; border-radius:12px; border-right:4px solid #F5B041; margin-bottom:15px; text-align: right;">
                <strong>📝 شرح الحالة الروحية والنفسية كما كتبها المستفيد:</strong>
                <p style="margin-top:8px; line-height:1.8; white-space:pre-wrap; color:#334155;">${req.description || 'لم يكتب المستفيد أي تفاصيل إضافية.'}</p>
            </div>

            <div style="background:#F1F5F9; padding:15px; border-radius:12px; margin-bottom:15px; text-align: right;">
                <h4 style="margin-top:0; color:#0A1628; margin-bottom:10px;">⚙️ الإجراءات الإدارية للشيخ بسام</h4>
                
                <div style="margin-bottom:12px;">
                    <label style="display:block; font-weight:600; margin-bottom:5px;">💰 تحديث حالة الدفع المالي للمركز:</label>
                    <select id="modalPaymentStatus" style="width:100%; padding:10px; border-radius:8px; border:2px solid #CBD5E1; font-family:'Cairo';">
                        <option value="unpaid" ${req.paymentStatus === 'unpaid' ? 'selected' : ''}>🔴 غير مدفوع</option>
                        <option value="paid" ${req.paymentStatus === 'paid' ? 'selected' : ''}>🟡 قيد المراجعة (أرسل إيصال الدفع)</option>
                        <option value="verified" ${req.paymentStatus === 'verified' ? 'selected' : ''}>🟢 تم التأكيد والتحقق المالي</option>
                    </select>
                </div>

                <div style="margin-bottom:12px;">
                    <label style="display:block; font-weight:600; margin-bottom:5px;">📊 تحديث حالة الطلب والتشخيص العام:</label>
                    <select id="modalRequestStatus" style="width:100%; padding:10px; border-radius:8px; border:2px solid #CBD5E1; font-family:'Cairo';">
                        <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
                        <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>⚙️ قيد المعالجة والدراسة الشرعية</option>
                        <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>✅ مكتمل (تم صرف البرنامج العلاجي)</option>
                        <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>❌ رفض وإلغاء الطلب</option>
                    </select>
                </div>
            </div>

            <div style="margin-bottom:15px; text-align: right;">
                <label style="display:block; font-weight:700; color:#0A1628; margin-bottom:5px;">🌿 البرنامج العلاجي الموجه للمستفيد (الروشتة الشرعية):</label>
                <textarea id="modalTreatmentDetails" rows="6" placeholder="اكتب هنا الآيات الكريمة، الأذكار، والتعليمات الغذائية أو الروحية المخصصة ليراها المريض في حساب لوحة تحكمه فوراً..." style="width:100%; padding:12px; border-radius:12px; border:2px solid #CBD5E1; font-family:'Cairo', sans-serif; resize:vertical; font-size:0.95rem;">${req.treatmentDetails || ''}</textarea>
            </div>

            <div style="text-align:left; display:flex; gap:10px; justify-content:flex-end; padding-top:10px; border-top:1px solid #E2E8F0;">
                <button onclick="closeModal()" style="padding:10px 20px; border-radius:8px; border:none; background:#94A3B8; color:#fff; cursor:pointer; font-family:'Cairo'; font-weight:600;">إلغاء</button>
                <button onclick="submitAdminAction()" style="padding:10px 25px; border-radius:8px; border:none; background:linear-gradient(135deg, #F5B041, #E67E22); color:#0A1628; font-weight:800; cursor:pointer; font-family:'Cairo'; box-shadow:0 4px 12px rgba(230,126,34,0.2);">💾 حفظ البيانات وإرسال العلاج</button>
            </div>
        `;

    } catch (e) {
        mBody.innerHTML = '<div style="text-align:center; color:#e74c3c; padding:20px;">حدث خطأ غير متوقع أثناء رندرة البيانات.</div>';
    }
}

// ===== 7. إرسال إجراءات وتفاصيل علاج المدير إلى السيرفر وحفظها =====
async function submitAdminAction() {
    const token = localStorage.getItem('token');
    const status = document.getElementById('modalRequestStatus').value;
    const paymentStatus = document.getElementById('modalPaymentStatus').value;
    const treatmentDetails = document.getElementById('modalTreatmentDetails').value.trim();

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
            loadRequests(); // إعادة تحديث الجدول والعدادات تلقائياً
        } else {
            showNotification('❌ ' + (data.error || 'فشل حفظ التعديلات على السيرفر.'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال بالخادم عند معالجة طلب الإرسال.', 'error');
    }
}

// ===== 8. إغلاق المودال المنبثق =====
function closeModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.style.display = 'none';
}

// ===== 9. محرك البحث والفلترة السريعة في الجدول =====
function filterTable() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const table = document.getElementById('requestsTable');
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let nameTd = tr[i].getElementsByTagName('td')[1];
        let emailTd = tr[i].getElementsByTagName('td')[2];
        if (nameTd || emailTd) {
            let nameTxt = nameTd.textContent || nameTd.innerText;
            let emailTxt = emailTd.textContent || emailTd.innerText;
            if (nameTxt.toLowerCase().indexOf(input) > -1 || emailTxt.toLowerCase().indexOf(input) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

// ===== 10. تدوير الأقسام والتبويبات السريعة =====
function switchSection(section) {
    if(section === 'requests') {
        document.getElementById('btnRequests').classList.add('active');
        document.getElementById('btnStats').classList.remove('active');
        document.getElementById('requestsSection').scrollIntoView({ behavior: 'smooth' });
    } else {
        document.getElementById('btnStats').classList.add('active');
        document.getElementById('btnRequests').classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ===== 11. تسجيل الخروج الآمن والنهائي للمدير =====
function logout() {
    if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة تحكم الإدارة؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// ===== 12. تفعيل الساعة التلقائية بالموقع =====
function startClock() {
    const timeEl = document.getElementById('currentTime');
    if(!timeEl) return;
    setInterval(() => {
        const now = new Date();
        timeEl.innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleTimeString('ar-EG')} - ${now.toLocaleDateString('ar-EG')}`;
    }, 1000);
}

// ===== 13. نقطة انطلاق الصفحة الاستهلالية (Initialization) =====
(async function init() {
    startClock();
    const isAuth = await checkAdminAuth();
    if (isAuth) {
        // تحديث بيانات اسم المدير في الفوتر الجانبي
        const user = JSON.parse(localStorage.getItem('user')) || {};
        if (user.fullName && document.getElementById('sidebarAdminName')) {
            document.getElementById('sidebarAdminName').innerHTML = `<i class="fas fa-lock"></i> إشراف: ${user.fullName}`;
            document.getElementById('adminWelcome').innerHTML = `لوحة تحكم الشيخ | <span>${user.fullName}</span>`;
        }
        await loadRequests();
    }
    
    // إغلاق المودال عند النقر خارج مساحة المحتوى البيضاء
    window.onclick = function(event) {
        const modal = document.getElementById('detailsModal');
        if (event.target === modal) {
            closeModal();
        }
    }
})();
