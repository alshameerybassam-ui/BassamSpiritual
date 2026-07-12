// =================================================================
// admin.js - لوحة تحكم الشيخ (v2.0 - موحد)
// =================================================================

let allRequests = [];

// -------------------------------------------------------------------
// الإشعارات
// -------------------------------------------------------------------
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 4000);
}

// -------------------------------------------------------------------
// التحقق من الجلسة
// -------------------------------------------------------------------
async function checkAdmin() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login.html'; return false; }
    try {
        const data = await API.auth.verify();
        if (data.user.role !== 'admin') {
            showNotification('⛔ غير مصرح لك بدخول هذه اللوحة.', 'error');
            setTimeout(() => window.location.href = '/dashboard.html', 2000);
            return false;
        }
        return true;
    } catch (e) {
        window.location.href = '/login.html';
        return false;
    }
}

// -------------------------------------------------------------------
// التبويبات
// -------------------------------------------------------------------
function switchTab(tab) {
    ['requestsSection', 'articlesSection', 'reviewsSection', 'aiSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const section = document.getElementById(`${tab}Section`);
    if (section) section.style.display = 'block';

    if (tab === 'requests') loadRequests();
    if (tab === 'articles') loadAdminArticles();
}

// -------------------------------------------------------------------
// تحميل الطلبات
// -------------------------------------------------------------------
async function loadRequests() {
    try {
        allRequests = await API.admin.getRequests();
        renderTable(allRequests);
        updateStats(allRequests);
    } catch (e) {
        showNotification('❌ تعذر تحميل الطلبات.', 'error');
    }
}

function updateStats(list) {
    document.getElementById('totalCount').textContent = list.length;
    document.getElementById('pendingCount').textContent = list.filter(r => r.status === 'pending').length;
    document.getElementById('completedCount').textContent = list.filter(r => r.status === 'completed' || r.status === 'closed').length;
    document.getElementById('rejectedCount').textContent = list.filter(r => r.status === 'rejected_by_admin').length;
}

function renderTable(list) {
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">لا توجد طلبات.</td></tr>';
        return;
    }

    const map = {
        'pending': 'قيد الانتظار',
        'accepted_waiting_payment': 'بانتظار الدفع',
        'payment_submitted': 'مراجعة الدفع',
        'processing': 'قيد العلاج',
        'completed': 'مكتمل',
        'rejected_by_admin': 'مرفوض',
        'closed': 'مغلق'
    };

    tbody.innerHTML = list.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${r.fullName || '—'}</td>
            <td>${r.email || '—'}</td>
            <td>${r.serviceType || '—'}</td>
            <td>${map[r.status] || r.status}</td>
            <td>${(r.totalPaidAmount || 0) > 0 ? '💰 مدفوع' : '—'}</td>
            <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-YE') : '—'}</td>
            <td>
                <button class="action-btn edit" onclick="viewDetails('${r.id}')">فتح</button>
                <button class="action-btn delete" onclick="deleteRequest('${r.id}')">حذف</button>
            </td>
        </tr>
    `).join('');
}

// -------------------------------------------------------------------
// تفاصيل طلب
// -------------------------------------------------------------------
async function viewDetails(id) {
    const modal = document.getElementById('detailsModal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    modal.classList.add('show');
    modal.style.display = 'flex';
    body.innerHTML = '<p>جاري التحميل...</p>';

    const req = allRequests.find(r => String(r.id) === String(id)) || {};
    let html = `
        <p><strong>المستفيد:</strong> ${req.fullName}</p>
        <p><strong>الخدمة:</strong> ${req.serviceType}</p>
        <p><strong>الحالة:</strong> ${req.status}</p>
        <p><strong>الوصف:</strong> ${req.description || '—'}</p>
        <hr>
    `;

    if (req.status === 'pending') {
        html += `
            <button onclick="acceptRequest('${req.id}')" style="background:#2ecc71; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">قبول</button>
            <button onclick="rejectRequest('${req.id}')" style="background:#e74c3c; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">رفض</button>
        `;
    } else if (req.status === 'payment_submitted') {
        html += `
            <p><strong>الإيصال:</strong> ${req.paymentSenderName} - ${req.paymentTransferNumber}</p>
            <button onclick="approvePayment('${req.id}')" style="background:#2ecc71; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">اعتماد الدفع</button>
            <button onclick="rejectPayment('${req.id}')" style="background:#e74c3c; color:#fff; padding:10px; border:none; border-radius:6px; margin:5px;">رفض الدفع</button>
        `;
    }

    body.innerHTML = html;
}

function closeModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
}

// -------------------------------------------------------------------
// إجراءات سريعة
// -------------------------------------------------------------------
async function acceptRequest(id) {
    await API.admin.acceptRequest(id);
    showNotification('✅ تم القبول.');
    closeModal();
    loadRequests();
}
async function rejectRequest(id) {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;
    await API.admin.rejectRequest(id, reason);
    showNotification('🔴 تم الرفض.');
    closeModal();
    loadRequests();
}
async function approvePayment(id) {
    await API.admin.approvePayment(id);
    showNotification('✅ تم اعتماد الدفع.');
    closeModal();
    loadRequests();
}
async function rejectPayment(id) {
    const reason = prompt('سبب رفض الدفع:');
    if (!reason) return;
    await API.admin.rejectPayment(id, reason);
    showNotification('🔴 تم رفض الدفع.');
    closeModal();
    loadRequests();
}
async function deleteRequest(id) {
    if (!confirm('متأكد من حذف الطلب؟')) return;
    await API.admin.deleteRequest(id);
    showNotification('🗑️ تم الحذف.');
    loadRequests();
}

// -------------------------------------------------------------------
// المقالات (إدارة بسيطة)
// -------------------------------------------------------------------
async function loadAdminArticles() {
    const container = document.getElementById('articlesSection');
    if (!container) return;

    try {
        const articles = await API.articles.getAll();
        container.innerHTML = `
            <h2>المقالات</h2>
            <table><thead><tr><th>العنوان</th><th>التاريخ</th></tr></thead>
                <tbody>${articles.map(a => `<tr><td>${a.title}</td><td>${a.date || '—'}</td></tr>`).join('')}</tbody>
            </table>
        `;
    } catch (e) {
        container.innerHTML = '<p>تعذر تحميل المقالات.</p>';
    }
}

// -------------------------------------------------------------------
// التهيئة
// -------------------------------------------------------------------
(async function init() {
    if (!(await checkAdmin())) return;
    switchTab('requests');
})();
