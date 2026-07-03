let currentRequests = [];
let selectedRequestId = null;

// ===== جلب الطلبات =====
async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        if (res.status === 401) {
            document.getElementById('requestsBody').innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:red;">❌ غير مصرح لك بالدخول. الرجاء تحديث الصفحة وإدخال بيانات الدخول.</td></tr>';
            return;
        }
        currentRequests = await res.json();
        renderTable(currentRequests);
        updateStats(currentRequests);
    } catch (e) {
        console.error(e);
        document.getElementById('requestsBody').innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:red;">⚠️ خطأ في تحميل البيانات</td></tr>';
    }
}

// ===== عرض الجدول =====
function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#888;">📭 لا توجد طلبات حتى الآن</td></tr>';
        return;
    }
    tbody.innerHTML = requests.map((req, index) => {
        const statusMap = {
            'pending': '<span class="status-badge status-pending">⏳ قيد الانتظار</span>',
            'processing': '<span class="status-badge status-processing">⚙️ قيد المعالجة</span>',
            'completed': '<span class="status-badge status-completed">✅ مكتمل</span>',
            'rejected': '<span class="status-badge status-rejected">❌ مرفوض</span>'
        };
        const status = statusMap[req.status] || statusMap.pending;
        const date = new Date(req.createdAt).toLocaleDateString('ar-EG');
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${req.fullName}</strong></td>
                <td>${req.email}</td>
                <td>${req.serviceType}</td>
                <td>${status}</td>
                <td>${date}</td>
                <td>
                    <button class="action-btn view" onclick="viewDetails('${req.id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteRequest('${req.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== تحديث الإحصائيات =====
function updateStats(requests) {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    document.getElementById('totalCount').innerText = total;
    document.getElementById('pendingCount').innerText = pending;
    document.getElementById('completedCount').innerText = completed;
    document.getElementById('rejectedCount').innerText = rejected;
}

// ===== البحث =====
function filterTable() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = currentRequests.filter(r => 
        r.fullName.includes(query) || r.email.includes(query) || r.phone.includes(query)
    );
    renderTable(filtered);
}

// ===== عرض التفاصيل (المودال) =====
async function viewDetails(id) {
    selectedRequestId = id;
    const res = await fetch('/api/requests');
    const all = await res.json();
    const req = all.find(r => r.id == id);
    if (!req) return alert('الطلب غير موجود');

    const modal = document.getElementById('detailsModal');
    document.getElementById('modalBody').innerHTML = `
        <p><strong>👤 الاسم:</strong> ${req.fullName}</p>
        <p><strong>📧 البريد:</strong> ${req.email}</p>
        <p><strong>📞 الهاتف:</strong> ${req.phone}</p>
        <p><strong>🌍 الدولة:</strong> ${req.country || 'غير محدد'}</p>
        <p><strong>🧑‍🤝‍🧑 المستفيد:</strong> ${req.beneficiary || 'نفسي'}</p>
        <p><strong>🛠 الخدمة:</strong> ${req.serviceType}</p>
        <p><strong>📝 الوصف:</strong><br>${req.description}</p>
        <hr>
        <label for="statusSelect">تغيير الحالة:</label>
        <select id="statusSelect">
            <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
            <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>قيد المعالجة</option>
            <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>مكتمل</option>
            <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>مرفوض</option>
        </select>
        <label for="replyText">الرد على العميل (سيُرسل بريداً إلكترونياً):</label>
        <textarea id="replyText" rows="4" placeholder="اكتب ردك للعميل هنا...">${req.adminReply || ''}</textarea>
        <div style="margin-top:15px;">
            <button onclick="saveChanges()" class="btn-save-reply"><i class="fas fa-save"></i> حفظ التغييرات</button>
        </div>
    `;
    modal.classList.add('show');
}

// ===== حفظ التغييرات (الحالة والرد) =====
async function saveChanges() {
    const status = document.getElementById('statusSelect').value;
    const reply = document.getElementById('replyText').value;
    
    try {
        const res = await fetch(`/api/request/${selectedRequestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, adminReply: reply })
        });
        if (res.ok) {
            alert('✅ تم تحديث الطلب وإرسال الرد للعميل (إن وجد)');
            closeModal();
            loadRequests();
        } else {
            alert('❌ فشل التحديث');
        }
    } catch (e) {
        alert('⚠️ خطأ في الاتصال');
    }
}

// ===== حذف الطلب =====
async function deleteRequest(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    try {
        const res = await fetch(`/api/request/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('🗑 تم الحذف');
            loadRequests();
        }
    } catch (e) { alert('خطأ في الحذف'); }
}

// ===== إغلاق المودال =====
function closeModal() {
    document.getElementById('detailsModal').classList.remove('show');
}

// ===== الساعة =====
function updateClock() {
    document.getElementById('currentTime').innerText = new Date().toLocaleString('ar-EG');
}
setInterval(updateClock, 1000);
updateClock();

// ===== تحميل البيانات عند فتح الصفحة =====
document.addEventListener('DOMContentLoaded', loadRequests);