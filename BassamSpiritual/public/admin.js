let currentRequests = [];
let selectedRequestId = null;

// ===== 1. جلب الطلبات من الذاكرة المحلية (LocalStorage) =====
function loadRequests() {
    const tableBody = document.getElementById('requestsBody');
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#6A7A8A;"><i class="fas fa-spinner fa-spin"></i> جاري جلب البيانات وتحديث اللوحة...</td></tr>`;
    
    try {
        // جلب البيانات المخزنة محلياً، وإذا كانت فارغة نقوم بإنشاء طلبات تجريبية للمعاينة
        const storedRequests = localStorage.getItem('site_requests');
        
        if (storedRequests) {
            currentRequests = JSON.parse(storedRequests);
        } else {
            // بيانات تجريبية تظهر لك لأول مرة فقط لتجربة اللوحة وسير العمل
            currentRequests = [
                {
                    id: "req_1",
                    fullName: "أحمد عبدالله الشمري",
                    email: "ahmed@example.com",
                    phone: "966500000000",
                    country: "السعودية",
                    beneficiary: "نفسي",
                    serviceType: "كشف روحي وتطهير",
                    description: "أعاني من صداع مستمر وخمول شديد وقت قراءة القرآن الكريم وضيق في الصدر منذ عدة أشهر.",
                    status: "pending",
                    adminReply: "",
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem('site_requests', JSON.stringify(currentRequests));
        }

        renderTable(currentRequests);
        updateStats(currentRequests);
    } catch (e) {
        console.error("Error loading requests:", e);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#e74c3c;">⚠️ حدث خطأ أثناء قراءة الذاكرة المحلية للمتصفح.</td></tr>';
    }
}

// ===== 2. رندرة وعرض جدول الطلبات بشكل تفاعلي =====
function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#6A7A8A;">📭 لا توجد طلبات متطابقة حالياً في الذاكرة</td></tr>';
        return;
    }
    
    tbody.innerHTML = requests.map((req, index) => {
        const statusMap = {
            'pending': '<span class="status-badge status-pending" style="background:#fef9e7; color:#f5b041; padding:5px 10px; border-radius:20px; font-size:0.85rem; font-weight:600;"><i class="fas fa-clock"></i> قيد الانتظار</span>',
            'processing': '<span class="status-badge status-processing" style="background:#ebf5fb; color:#2980b9; padding:5px 10px; border-radius:20px; font-size:0.85rem; font-weight:600;"><i class="fas fa-spinner fa-spin"></i> قيد العلاج</span>',
            'completed': '<span class="status-badge status-completed" style="background:#e8f8f5; color:#27ae60; padding:5px 10px; border-radius:20px; font-size:0.85rem; font-weight:600;"><i class="fas fa-check-circle"></i> مكتمل</span>',
            'rejected': '<span class="status-badge status-rejected" style="background:#fdedec; color:#e74c3c; padding:5px 10px; border-radius:20px; font-size:0.85rem; font-weight:600;"><i class="fas fa-times-circle"></i> مستبعد</span>'
        };
        
        const status = statusMap[req.status] || statusMap.pending;
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE', {year: 'numeric', month: 'short', day: 'numeric'}) : '—';
        const idToUse = req.id || req._id;

        return `
            <tr style="transition: 0.2s; border-bottom: 1px solid #f1f5f9;">
                <td>${index + 1}</td>
                <td><strong style="color:#0A1628;">${req.fullName || 'بدون اسم'}</strong></td>
                <td style="color:#4A5A6A;">${req.email || '—'}</td>
                <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:8px; font-size:0.9rem; color:#0A1628;">${req.serviceType || 'استشارة عامة'}</span></td>
                <td>${status}</td>
                <td style="font-size:0.85rem; color:#6A7A8A;">${date}</td>
                <td>
                    <button class="action-btn view" onclick="viewDetails('${idToUse}')" style="background:#F5B041; color:#0A1628; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; margin-left:4px;" title="قراءة وتعديل الطلب"><i class="fas fa-folder-open"></i> معالجة</button>
                    <button class="action-btn delete" onclick="deleteRequest('${idToUse}')" style="background:#fdedec; color:#e74c3c; border:none; padding:6px 10px; border-radius:8px; cursor:pointer;" title="حذف نهائي"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== 3. تحديث بطاقات الإحصائيات العلوية =====
function updateStats(requests) {
    document.getElementById('totalCount').innerText = requests.length;
    document.getElementById('pendingCount').innerText = requests.filter(r => r.status === 'pending').length;
    document.getElementById('completedCount').innerText = requests.filter(r => r.status === 'completed' || r.status === 'processing').length;
    document.getElementById('rejectedCount').innerText = requests.filter(r => r.status === 'rejected').length;
}

// ===== 4. البحث الذكي الفوري وعمل الفلترة =====
function filterTable() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        renderTable(currentRequests);
        return;
    }
    
    const filtered = currentRequests.filter(r => {
        return (r.fullName || '').toLowerCase().includes(query) || 
               (r.email || '').toLowerCase().includes(query) || 
               (r.phone || '').toLowerCase().includes(query) ||
               (r.serviceType || '').toLowerCase().includes(query);
    });
    renderTable(filtered);
}

// ===== 5. نافذة تفاصيل الطلب المتكاملة وسير العمل الإداري =====
function viewDetails(id) {
    selectedRequestId = id;
    const req = currentRequests.find(r => (r.id == id || r._id == id));
    if (!req) return alert('خطأ: تعذر العثور على بيانات هذا الطلب.');

    const modal = document.getElementById('detailsModal');
    
    let whatsappSection = '';
    if (req.phone) {
        const cleanPhone = req.phone.replace(/\D/g, '');
        const encodedText = encodeURIComponent(`أهلاً بك يا ${req.fullName}، معك الشيخ بسام الشميري من مركز النور الرباني بخصوص طلبك لخدمة (${req.serviceType || 'الاستشارة'}).`);
        whatsappSection = `
            <a href="https://wa.me/${cleanPhone}?text=${encodedText}" target="_blank" style="display:inline-block; background:#25D366; color:#fff; text-decoration:none; padding:8px 15px; border-radius:8px; font-weight:600; margin-top:5px; font-size:0.9rem;">
                <i class="fab fa-whatsapp"></i> تواصل سريع عبر الواتساب (${req.phone})
            </a>
        `;
    }

    document.getElementById('modalBody').innerHTML = `
        <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px; border-right:4px solid #F5B041;">
            <p style="margin:5px 0;"><strong>👤 اسم العميل الكامل:</strong> ${req.fullName || 'غير محدد'}</p>
            <p style="margin:5px 0;"><strong>📧 البريد الإلكتروني:</strong> ${req.email || 'غير محدد'}</p>
            <p style="margin:5px 0;"><strong>🌍 الدولة / الجنسية:</strong> ${req.country || 'غير محدد'}</p>
            <p style="margin:5px 0;"><strong>🧑‍🤝‍🧑 المستفيد من الخدمة:</strong> ${req.beneficiary || 'نفسي'}</p>
            <p style="margin:5px 0;"><strong>🛠 نوع الخدمة المطلوبة:</strong> <span style="background:#0A1628; color:#fff; padding:2px 8px; border-radius:6px; font-size:0.85rem;">${req.serviceType || 'غير محدد'}</span></p>
            ${whatsappSection}
        </div>

        <div style="margin-bottom:15px;">
            <strong style="color:#0A1628; display:block; margin-bottom:5px;"><i class="fas fa-align-right"></i> شرح المشكلة أو الحالة الروحية المعروضة:</strong>
            <div style="background:#fff; border:2px solid #e2e8f0; padding:12px; border-radius:12px; max-height:150px; overflow-y:auto; white-space:pre-wrap; color:#4A5A6A; line-height:1.6;">${req.description || 'لا يوجد تفاصيل أو وصف للطلب.'}</div>
        </div>

        <hr style="margin:20px 0; border:0; border-top:2px dashed #e2e8f0;">

        <!-- سير العمل واتخاذ القرار -->
        <div style="margin-bottom:15px;">
            <label for="statusSelect" style="font-weight:700; color:#0A1628; display:block; margin-bottom:8px;"><i class="fas fa-tasks"></i> تحديث خطة سير العمل (الحالة الحالية):</label>
            <select id="statusSelect" style="width:100%; padding:10px; border-radius:10px; border:2px solid #E2E8F0; font-family:'Cairo', sans-serif; font-size:1rem; color:#0A1628;">
                <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار والمراجعة الأولية</option>
                <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>⚙️ قيد العلاج والمتابعة الروحية</option>
                <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>✅ تم الانتهاء وإرسال الخطة العلاجية للمستخدم</option>
                <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>❌ طلب مستبعد / غير مطابق للمشكلة الروحية</option>
            </select>
        </div>

        <div style="margin-bottom:15px;">
            <label for="replyText" style="font-weight:700; color:#0A1628; display:block; margin-bottom:8px;"><i class="fas fa-hand-holding-heart"></i> البرنامج العلاجي والرد الروحي للعميل:</label>
            <textarea id="replyText" rows="5" style="width:100%; padding:12px; border-radius:10px; border:2px solid #E2E8F0; font-family:'Cairo', sans-serif; line-height:1.6;" placeholder="اكتب الخطة العلاجية أو التوجيهات الروحية هنا...">${req.adminReply || ''}</textarea>
        </div>

        <div style="text-align:left; margin-top:20px;">
            <button onclick="saveChanges()" id="saveChangeBtn" style="width:100%; padding:12px; background:linear-gradient(135deg, #F5B041, #E67E22); color:#0A1628; border:none; border-radius:10px; font-size:1.05rem; font-weight:700; cursor:pointer; transition:0.3s;">
                <i class="fas fa-save"></i> حفظ التغييرات في الذاكرة المحلية
            </button>
        </div>
    `;
    modal.classList.add('show');
}

// ===== 6. حفظ التغييرات محلياً وتحديث اللوحة فوراً =====
function saveChanges() {
    const status = document.getElementById('statusSelect').value;
    const reply = document.getElementById('replyText').value.trim();
    
    // البحث عن الفهرس وتحديث العنصر داخل المصفوفة
    const index = currentRequests.findIndex(r => (r.id == selectedRequestId || r._id == selectedRequestId));
    
    if (index !== -1) {
        currentRequests[index].status = status;
        currentRequests[index].adminReply = reply;
        
        // المزامنة والحفظ في LocalStorage لتثبيت التعديل
        localStorage.setItem('site_requests', JSON.stringify(currentRequests));
        
        alert('✅ تم حفظ تعديل الحالة والبرنامج العلاجي بنجاح.');
        closeModal();
        renderTable(currentRequests);
        updateStats(currentRequests);
    } else {
        alert('❌ خطأ: لم يتم العثور على الطلب لتحديثه.');
    }
}

// ===== 7. حذف طلب نهائياً من الذاكرة المحلية =====
function deleteRequest(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الطلب نهائياً من المتصفح؟')) return;
    
    currentRequests = currentRequests.filter(r => (r.id != id && r._id != id));
    localStorage.setItem('site_requests', JSON.stringify(currentRequests));
    
    alert('🗑️ تم حذف السجل بنجاح.');
    renderTable(currentRequests);
    updateStats(currentRequests);
}

// ===== 8. إغلاق النافذة المنبثقة =====
function closeModal() {
    document.getElementById('detailsModal').classList.remove('show');
}

// ===== 9. تحديث الساعة بشكل متزامن =====
function updateClock() {
    const clockEl = document.getElementById('currentTime');
    if(clockEl) {
        clockEl.innerText = new Date().toLocaleString('ar-YE', { hour12: true, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}
setInterval(updateClock, 1000);

// ===== 10. إقلاع اللوحة والبدء المباشر =====
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    loadRequests();
});
