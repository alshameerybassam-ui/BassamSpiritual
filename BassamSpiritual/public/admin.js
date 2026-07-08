let currentRequests = [];
let selectedRequestId = null;

// ⚠️ هــــــــام جداً: إذا كان السيرفر (Backend) مرفوعاً على رابط مختلف عن واجهة الموقع، 
// ضع رابط السيرفر الكامل هنا، مثال: "https://your-backend.onrender.com"
// إذا كانا في نفس الخدمة معاً، اترك المتغير فارغاً كالتالي ""
const BACKEND_URL = ""; 

// ===== جلب الطلبات =====
async function loadRequests() {
    const tableBody = document.getElementById('requestsBody');
    try {
        const res = await fetch(`${BACKEND_URL}/api/requests`);
        
        if (res.status === 401) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:red;">❌ غير مصرح لك بالدخول. الرجاء تحديث الصفحة وإدخال بيانات الدخول.</td></tr>';
            return;
        }
        
        if (!res.ok) {
            throw new Error(`سيرفر الاستجابة أعاد خطأ بـ كود: ${res.status}`);
        }

        currentRequests = await res.json();
        renderTable(currentRequests);
        updateStats(currentRequests);
    } catch (e) {
        console.error("Error loading requests:", e);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:red;">⚠️ خطأ في تحميل البيانات (تأكد من تشغيل السيرفر)</td></tr>';
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
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-EG') : 'غير محدد';
        
        // تأكد من استخدام المعرّف الصحيح من قاعدة البيانات (سواء كان id أو _id)
        const idToUse = req.id || req._id;

        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${req.fullName || 'بدون اسم'}</strong></td>
                <td>${req.email || '—'}</td>
                <td>${req.serviceType || '—'}</td>
                <td>${status}</td>
                <td>${date}</td>
                <td>
                    <button class="action-btn view" onclick="viewDetails('${idToUse}')" title="عرض"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteRequest('${idToUse}')" title="حذف"><i class="fas fa-trash"></i></button>
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
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        renderTable(currentRequests);
        return;
    }
    
    const filtered = currentRequests.filter(r => {
        const name = (r.fullName || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const phone = (r.phone || '').toLowerCase();
        return name.includes(query) || email.includes(query) || phone.includes(query);
    });
    renderTable(filtered);
}

// ===== عرض التفاصيل (المودال) =====
async function viewDetails(id) {
    selectedRequestId = id;
    // العثور على الطلب محلياً مباشرة من المصفوفة المخزنة بدلاً من جلب الطلبات كاملة مرة أخرى
    const req = currentRequests.find(r => (r.id == id || r._id == id));
    if (!req) return alert('الطلب غير موجود أو قد يكون تم حذفه');

    const modal = document.getElementById('detailsModal');
    document.getElementById('modalBody').innerHTML = `
        <p><strong>👤 الاسم:</strong> ${req.fullName || 'غير محدد'}</p>
        <p><strong>📧 البريد:</strong> ${req.email || 'غير محدد'}</p>
        <p><strong>📞 الهاتف:</strong> ${req.phone || 'غير محدد'}</p>
        <p><strong>🌍 الدولة:</strong> ${req.country || 'غير محدد'}</p>
        <p><strong>🧑‍🤝‍🧑 المستفيد:</strong> ${req.beneficiary || 'نفسي'}</p>
        <p><strong>🛠 الخدمة:</strong> ${req.serviceType || 'غير محدد'}</p>
        <p><strong>📝 الوصف:</strong><br>${req.description || 'لا يوجد وصف'}</p>
        <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">
        <label for="statusSelect" style="font-weight:bold; display:block; margin-bottom:5px;">تغيير الحالة:</label>
        <select id="statusSelect" style="width:100%; padding:8px; margin-bottom:15px; border-radius:6px; border:1px solid #ccc;">
            <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
            <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>قيد المعالجة</option>
            <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>مكتمل</option>
            <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>مرفوض</option>
        </select>
        <label for="replyText" style="font-weight:bold; display:block; margin-bottom:5px;">الرد على العميل (سيُرسل بريداً إلكترونياً):</label>
        <textarea id="replyText" rows="4" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;" placeholder="اكتب ردك للعميل هنا...">${req.adminReply || ''}</textarea>
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
        const res = await fetch(`${BACKEND_URL}/api/request/${selectedRequestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, adminReply: reply })
        });
        if (res.ok) {
            alert('✅ تم تحديث الطلب بنجاح');
            closeModal();
            loadRequests();
        } else {
            alert('❌ فشل التحديث من قِبل السيرفر');
        }
    } catch (e) {
        alert('⚠️ خطأ في الاتصال بالسيرفر');
    }
}

// ===== حذف الطلب =====
async function deleteRequest(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/request/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('🗑 تم الحذف بنجاح');
            loadRequests();
        } else {
            alert('❌ فشل حذف الطلب');
        }
    } catch (e) { 
        alert('خطأ في الاتصال بالشبكة أثناء الحذف'); 
    }
}

// ===== إغلاق المودال =====
function closeModal() {
    document.getElementById('detailsModal').classList.remove('show');
}

// ===== الساعة =====
function updateClock() {
    const clockEl = document.getElementById('currentTime');
    if(clockEl) {
        clockEl.innerText = new Date().toLocaleString('ar-EG');
    }
}
setInterval(updateClock, 1000);

// ===== تحميل البيانات عند فتح الصفحة =====
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    loadRequests();
});
