// =================================================================
// dashboard.js - لوحة تحكم المستفيد (v2.0 - موحد)
// =================================================================

// -------------------------------------------------------------------
// الإشعارات
// -------------------------------------------------------------------
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 5000);
}

// -------------------------------------------------------------------
// التحقق من الجلسة
// -------------------------------------------------------------------
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    try {
        await API.auth.verify();
        return true;
    } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        return false;
    }
}

// -------------------------------------------------------------------
// تحميل لوحة التحكم
// -------------------------------------------------------------------
async function loadDashboard() {
    try {
        const data = await API.user.getProfile();
        const user = data.user;
        const requests = data.requests || [];

        document.getElementById('userName').innerHTML = `مرحباً، <span>${user.fullName}</span>`;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('sidebarName').textContent = user.fullName;
        document.getElementById('sidebarEmail').textContent = user.email;
        document.getElementById('sidebarJoined').textContent = new Date().toLocaleDateString('ar-YE');

        renderRequests(requests);
        updateStats(requests);
    } catch (e) {
        showNotification('⚠️ تعذر تحميل البيانات.', 'error');
    }
}

function updateStats(requests) {
    document.getElementById('statTotal').textContent = requests.length;
    document.getElementById('statPending').textContent = requests.filter(r => r.status === 'pending').length;
    document.getElementById('statCompleted').textContent = requests.filter(r => r.status === 'completed' || r.status === 'closed').length;
    document.getElementById('statRejected').textContent = requests.filter(r => r.status === 'rejected_by_admin').length;
}

// -------------------------------------------------------------------
// عرض الطلبات
// -------------------------------------------------------------------
function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!container) return;

    if (!requests.length) {
        container.innerHTML = '<p style="text-align:center; padding:30px;">📭 لا توجد طلبات بعد.</p>';
        return;
    }

    const map = {
        'pending': 'قيد المراجعة',
        'accepted_waiting_payment': 'بانتظار الدفع',
        'payment_submitted': 'جاري التحقق من الدفع',
        'payment_rejected': 'تم رفض الإيصال',
        'processing': 'قيد العلاج',
        'completed': 'مكتمل',
        'rejected_by_admin': 'تم الاعتذار',
        'closed': 'مغلق'
    };

    container.innerHTML = `
        <table class="table">
            <thead><tr><th>#</th><th>الخدمة</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
            <tbody>
                ${requests.map(r => `
                    <tr>
                        <td>#${r.id}</td>
                        <td>${r.serviceType || 'استشارة'}</td>
                        <td>${map[r.status] || r.status}</td>
                        <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-YE') : '—'}</td>
                        <td><button class="btn btn-sm btn-primary" onclick="viewRequest('${r.id}')">فتح</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// -------------------------------------------------------------------
// عرض تفاصيل طلب
// -------------------------------------------------------------------
async function viewRequest(id) {
    try {
        const data = await API.user.getRequest(id);
        const req = data.request;
        const modal = document.getElementById('requestDetailsContainer');
        const modalWrapper = document.getElementById('viewRequestModal');
        if (!modal || !modalWrapper) return;

        let html = `
            <p><strong>الخدمة:</strong> ${req.serviceType}</p>
            <p><strong>الوصف:</strong> ${req.description}</p>
            <hr>
        `;

        if (req.status === 'accepted_waiting_payment' || req.status === 'payment_rejected') {
            html += `
                <div class="alert alert-info">الرجاء تحويل مبلغ 100 ريال وإدخال بيانات الإيصال.</div>
                <form id="paymentForm">
                    <input id="payMethod" class="form-control form-control-sm" placeholder="طريقة التحويل" required>
                    <input id="paySender" class="form-control form-control-sm" placeholder="اسم المحول" required>
                    <input id="payNumber" class="form-control form-control-sm" placeholder="رقم الحوالة" required>
                    <button type="submit" class="btn btn-sm btn-success w-100 mt-2">إرسال</button>
                </form>
            `;
            setTimeout(() => {
                document.getElementById('paymentForm')?.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await API.user.submitPayment(id, {
                        paymentMethod: document.getElementById('payMethod').value,
                        paymentSenderName: document.getElementById('paySender').value,
                        paymentTransferNumber: document.getElementById('payNumber').value
                    });
                    showNotification('✅ تم إرسال الإيصال.');
                    modalWrapper.classList.remove('show');
                    loadDashboard();
                });
            }, 100);
        } else if (req.status === 'completed') {
            html += `<p><strong>العلاج:</strong> ${req.treatment_plan || '—'}</p>`;
        }

        modal.innerHTML = html;
        modalWrapper.classList.add('show');
    } catch (e) {
        showNotification('⚠️ تعذر فتح الطلب.', 'error');
    }
}

// -------------------------------------------------------------------
// تقديم طلب جديد
// -------------------------------------------------------------------
document.getElementById('newRequestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceType = document.getElementById('reqServiceType')?.value;
    const description = document.getElementById('reqDescription')?.value.trim();
    if (!description) return showNotification('⚠️ اكتب وصفاً للحالة.', 'error');
    try {
        await API.user.submitRequest(serviceType, description);
        showNotification('✅ تم تقديم الطلب.');
        closeNewRequestModal();
        loadDashboard();
    } catch (e) {
        showNotification('❌ فشل الإرسال.', 'error');
    }
});

function openNewRequestModal() {
    document.getElementById('newRequestModal')?.classList.add('show');
}
function closeNewRequestModal() {
    document.getElementById('newRequestModal')?.classList.remove('show');
}

// -------------------------------------------------------------------
// التهيئة
// -------------------------------------------------------------------
(async function init() {
    if (!(await checkAuth())) return;
    await loadDashboard();
})();
