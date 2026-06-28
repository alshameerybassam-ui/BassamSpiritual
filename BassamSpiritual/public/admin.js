let currentRequests = [];
let selectedRequestId = null;

// ===== جلب الطلبات =====
async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        if (res.status === 401) {
            document.getElementById('requestsBody').innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:red;">❌ غير مصرح لك بالدخول. الرجاء تحديث الصفحة وإدخال بيانات الدخول.</td></tr>';
            return;
        }
        currentRequests = await res.json();
        renderTable(currentRequests);
        updateStats(currentRequests);
    } catch (e) {
        console.error(e);
        document.getElementById('requestsBody').innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:red;">⚠️ خطأ في تحميل البيانات</td></tr>';
    }
}

// ===== عرض الجدول (مع عمود الوصف وجعل الاسم قابلاً للنقر) =====
function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#888;">📭 لا توجد طلبات حتى الآن</td></tr>';
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
        
        // عرض أول 60 حرفاً من الوصف مع "..." إذا كان أطول
        const shortDescription = req.description ? 
            (req.description.length > 60 ? req.description.substring(0, 60) + '...' : req.description) 
            : '⚠️ لا يوجد وصف';
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong style="cursor:pointer; color:#D4AF37; text-decoration:underline; text-underline-offset:3px; font-size:1.05rem;" 
                            onclick="viewDetails('${req.id}')" 
                            title="اضغط لعرض جميع التفاصيل والرد على العميل">
                        ${req.fullName}
                    </strong>
                </td>
                <td>${req.email}</td>
                <td>${req.serviceType}</td>
                <td onclick="viewDetails('${req.id}')" style="cursor:pointer;">${status}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" 
                    title="${req.description || 'لا يوجد وصف'}">
                    ${shortDescription}
                </td>
                <td>${date}</td>
                <td>
                    <button class="action-btn view" onclick="viewDetails('${req.id}')" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteRequest('${req.id}')" title="حذف الطلب"><i class="fas fa-trash"></i></button>
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

// ===== البحث (يشمل البحث في الوصف) =====
function filterTable() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = currentRequests.filter(r => 
        r.fullName.includes(query) || 
        r.email.includes(query) || 
        r.phone.includes(query) ||
        (r.description && r.description.includes(query))
    );
    renderTable(filtered);
}

// ===== عرض التفاصيل الكاملة (عند النقر على الاسم أو الحالة أو زر العرض) =====
async function viewDetails(id) {
    selectedRequestId = id;
    const res = await fetch('/api/requests');
    const all = await res.json();
    const req = all.find(r => r.id == id);
    if (!req) return alert('⚠️ الطلب غير موجود');

    const contactMethod = req.contactMethod || 'email';
    const phoneNumber = req.phone || '';
    const isWhatsApp = contactMethod === 'whatsapp';

    const modal = document.getElementById('detailsModal');
    document.getElementById('modalBody').innerHTML = `
        <!-- ===== رأس التفاصيل ===== -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:10px;">
            <p style="margin:4px 0;"><strong>👤 الاسم:</strong> ${req.fullName}</p>
            <p style="margin:4px 0;"><strong>📧 البريد:</strong> ${req.email}</p>
            <p style="margin:4px 0;"><strong>📞 الهاتف:</strong> ${req.phone}</p>
            <p style="margin:4px 0;"><strong>🌍 الدولة:</strong> ${req.country || 'غير محدد'}</p>
            <p style="margin:4px 0;"><strong>🧑‍🤝‍🧑 المستفيد:</strong> ${req.beneficiary || 'نفسي'}</p>
            <p style="margin:4px 0;"><strong>🛠 الخدمة:</strong> ${req.serviceType}</p>
            <p style="margin:4px 0;"><strong>📩 طريقة التواصل:</strong> ${contactMethod === 'whatsapp' ? '📱 واتساب' : '📧 بريد إلكتروني'}</p>
            <p style="margin:4px 0;"><strong>📅 تاريخ الطلب:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
        </div>

        <!-- ===== صندوق وصف المشكلة (بارز جداً) ===== -->
        <div style="background: #FFFBF0; border-right: 6px solid #F5B041; padding: 20px 25px; border-radius: 12px; margin: 15px 0; box-shadow: 0 2px 15px rgba(245, 176, 65, 0.15);">
            <strong style="color: #0A1628; font-size: 1.2rem; display: block; margin-bottom: 12px;">
                <i class="fas fa-pen" style="color:#F5B041;"></i> 📝 وصف المشكلة كاملاً:
            </strong>
            <p style="margin: 0; line-height: 2; color: #1A2835; white-space: pre-wrap; font-size: 1.05rem; background:#fff; padding:15px; border-radius:8px;">
                ${req.description || '⚠️ لم يكتب المستفيد أي وصف للمشكلة.'}
            </p>
        </div>

        <hr style="border: 1px dashed #E2E8F0; margin: 20px 0;">
        
        <!-- ===== نموذج التحديث والرد ===== -->
        <label for="statusSelect" style="font-weight:700; display:block; margin-top:5px;">🔁 تغيير الحالة:</label>
        <select id="statusSelect" style="width:100%; padding:12px; border:2px solid #E2E8F0; border-radius:12px; font-family:'Cairo'; margin:5px 0 15px;">
            <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
            <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>⚙️ قيد المعالجة</option>
            <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>✅ مكتمل</option>
            <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
        </select>
        
        <label for="replyText" style="font-weight:700; display:block; margin-top:5px;">✍️ الرد على العميل:</label>
        <textarea id="replyText" rows="4" placeholder="اكتب ردك هنا... وسيُرسل إلى بريد العميل الإلكتروني." style="width:100%; padding:15px; border:2px solid #E2E8F0; border-radius:12px; font-family:'Cairo'; font-size:1rem; margin:5px 0 15px;">${req.adminReply || ''}</textarea>
        
        <!-- ===== أزرار الإرسال ===== -->
        <div style="display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
            <button onclick="saveChanges()" class="btn-save-reply" style="flex:1; min-width:120px; background: linear-gradient(135deg, #F5B041, #E67E22); color: #0A1628; border: none; padding: 14px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; font-family: 'Cairo'; transition: 0.3s; box-shadow: 0 4px 15px rgba(245, 176, 65, 0.4);">
                <i class="fas fa-envelope"></i> 💾 حفظ وإرسال عبر البريد
            </button>
            ${isWhatsApp && phoneNumber ? `
            <button onclick="sendViaWhatsApp()" class="btn-whatsapp-reply" style="flex:1; min-width:120px; background: #25D366; color: #fff; border: none; padding: 14px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: 'Cairo'; transition: 0.3s; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);">
                <i class="fab fa-whatsapp"></i> 📱 رد عبر واتساب (تحقق يدوي)
            </button>
            ` : ''}
        </div>
        ${!isWhatsApp ? `<p style="color:#888; font-size:0.85rem; margin-top:10px;"><i class="fas fa-info-circle"></i> هذا الطلب اختار التواصل عبر البريد الإلكتروني. سيُرسل الرد إلى بريده.</p>` : ''}
        ${isWhatsApp && phoneNumber ? `<p style="color:#888; font-size:0.85rem; margin-top:10px;"><i class="fas fa-info-circle"></i> سيتم فتح محادثة واتساب مع الرقم ${phoneNumber} مع نص الرد الذي كتبته أعلاه (تأكد يدوياً من ملكية الرقم).</p>` : ''}
    `;
    modal.classList.add('show');
}

// ===== حفظ التغييرات (الحالة والرد عبر البريد الإلكتروني) =====
async function saveChanges() {
    const status = document.getElementById('statusSelect').value;
    const reply = document.getElementById('replyText').value;
    
    if (!reply.trim()) {
        if (!confirm('⚠️ الرد فارغ. هل تريد المتابعة بدون إرسال رد؟')) return;
    }

    try {
        const res = await fetch(`/api/request/${selectedRequestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, adminReply: reply })
        });
        if (res.ok) {
            alert('✅ تم تحديث الطلب وإرسال الرد عبر البريد الإلكتروني (إن وجد).');
            closeModal();
            loadRequests();
        } else {
            alert('❌ فشل التحديث');
        }
    } catch (e) {
        alert('⚠️ خطأ في الاتصال');
    }
}

// ===== الرد عبر واتساب =====
async function sendViaWhatsApp() {
    const reply = document.getElementById('replyText').value;
    if (!reply.trim()) {
        alert('⚠️ الرجاء كتابة الرد أولاً في مربع النص أعلاه.');
        return;
    }

    const res = await fetch('/api/requests');
    const all = await res.json();
    const req = all.find(r => r.id == selectedRequestId);
    if (!req) return alert('⚠️ الطلب غير موجود');

    const phone = req.phone || '';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
        alert('⚠️ رقم الهاتف غير موجود لهذا الطلب.');
        return;
    }

    const text = `السلام عليكم ورحمة الله وبركاته، هذا رد الشيخ بسام على طلبك:\n\n${reply.trim()}\n\nنسأل الله لكم الشفاء والعافية.`;
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    window.open(waUrl, '_blank');
    alert(`✅ تم فتح محادثة واتساب مع الرقم ${cleanPhone}. بعد التحقق اليدوي من ملكية الرقم، أرسل الرد.`);
}

// ===== حذف الطلب =====
async function deleteRequest(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    try {
        const res = await fetch(`/api/request/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('🗑 تم الحذف');
            loadRequests();
        }
    } catch (e) { alert('⚠️ خطأ في الحذف'); }
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
