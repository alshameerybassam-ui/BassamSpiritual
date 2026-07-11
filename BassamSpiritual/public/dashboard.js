// =================================================================
// ملف لوحة تحكم المستفيدين المطور والمُفعّل - مركز النور الرباني
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

// ===== 2. دالة الإملاء الصوتي الاختيارية للمستفيد =====
function startDictation(btnElement) {
    if (!('webkitSpeechRecognition' in window)) {
        showNotification('⚠️ متصفحك لا يدعم ميزة الإملاء الصوتي.', 'error');
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    const parent = btnElement.closest('.input-group') || btnElement.parentElement;
    const inputField = parent.querySelector('textarea, input[type="text"]');

    if (!inputField) {
        showNotification('⚠️ لم يتم العثور على حقل نصي للرصد.', 'error');
        return;
    }

    btnElement.classList.add('recording');
    btnElement.innerHTML = '<i class="bi bi-mic-fill" style="color:red;"></i> جاري الاستماع...';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        inputField.value += (inputField.value ? ' ' : '') + transcript;
        btnElement.classList.remove('recording');
        btnElement.innerHTML = '<i class="bi bi-mic"></i> تحدث صوتاً';
    };

    recognition.onerror = function() {
        btnElement.classList.remove('recording');
        btnElement.innerHTML = '<i class="bi bi-mic"></i> تحدث صوتاً';
        showNotification('❌ تعذر التعرف على الصوت.', 'error');
    };

    recognition.start();
}

// ===== 3. التحقق الآمن من الجلسة والصلاحيات =====
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
        return true; 
    }
}

// ===== 4. تحميل بيانات لوحة المستفيد =====
async function loadDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/dashboard/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) { showNotification('⚠️ حدث خطأ في تحميل البيانات.', 'error'); return; }

        currentUser = data.user;
        userRequests = data.requests || [];

        if(document.getElementById('userName')) document.getElementById('userName').innerHTML = `مرحباً، <span>${data.user.fullName}</span>`;
        
        renderRequests(userRequests);
    } catch (e) { showNotification('⚠️ خطأ في الاتصال بالخادم.', 'error'); }
}

// ===== 5. رندرة وعرض الطلبات تفعيل الزر والجدول =====
function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!container) return;
    if (!requests || requests.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#6A7A8A;">📭 لا توجد طلبات علاجية مقدمة حالياً.</div>`;
        return;
    }

    const statusMap = {
        'pending': '<span class="badge bg-warning text-dark">قيد الانتظار</span>',
        'processing': '<span class="badge bg-info text-dark">قيد العلاج</span>',
        'completed': '<span class="badge bg-success">مكتمل</span>',
        'rejected': '<span class="badge bg-danger">مستبعد</span>'
    };

    let html = `<table class="table style-table text-right" style="direction:rtl;">
        <thead>
            <tr>
                <th>رقم الطلب</th>
                <th>نوع الخدمة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>الإجراء</th>
            </tr>
        </thead>
        <tbody>`;

    requests.forEach((req, index) => {
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE') : '—';
        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${req.serviceType || 'استشارة عامة'}</strong></td>
                <td>${statusMap[req.status] || statusMap.pending}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewRequest('${req.id}')">
                        <i class="bi bi-eye"></i> عرض التفاصيل
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ===== 6. تفعيل عرض تفاصيل الطلب والخطة العلاجية المرسلة =====
async function viewRequest(id) {
    currentRequestId = id;
    const token = localStorage.getItem('token');
    const modal = document.getElementById('viewRequestModal') || document.getElementById('newRequestModal'); 
    
    try {
        const res = await fetch(`/api/dashboard/requests/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) {
            alert(`📝 تفاصيل الطلب:\n\nالخدمة: ${data.request.serviceType}\nالوصف: ${data.request.description}\n\n🌿 الرد العلاجي من الشيخ:\n${data.request.treatmentDetails || 'لم يتم الرد بعد من فضيلة الشيخ.'}`);
        }
    } catch(e) {
        showNotification('⚠️ خطأ في جلب تفاصيل الحالة.', 'error');
    }
}

// ===== 7. تفعيل إرسال المراجعات والتقييمات للشيخ =====
async function submitReview(e) {
    if(e) e.preventDefault();
    const token = localStorage.getItem('token');
    const comment = document.getElementById('reviewComment')?.value.trim();
    const rating = document.getElementById('reviewRating')?.value || 5;

    if(!comment) { showNotification('⚠️ من فضلك اكتب نص التقييم أولاً.', 'error'); return; }

    try {
        const res = await fetch('/api/testimonials', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ comment, rating })
        });
        const data = await res.json();
        if(data.success) {
            showNotification('✅ شكرًا لك! تم إرسال تقييمك للإدارة بنجاح لمراجعته ونشره.');
            if(document.getElementById('reviewForm')) document.getElementById('reviewForm').reset();
        }
    } catch(e) {
        showNotification('❌ فشل إرسال التقييم للسيرفر.', 'error');
    }
}

// ===== 8. تفعيل زر تقديم طلب جديد لحالة روحية =====
document.getElementById('newRequestForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const serviceType = document.getElementById('reqServiceType')?.value;
    const description = document.getElementById('reqDescription')?.value.trim();

    if(!description) { showNotification('⚠️ الرجاء شرح الأعراض أو الحالة بدقة.', 'error'); return; }

    try {
        const res = await fetch('/api/requests', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ serviceType, description })
        });
        const data = await res.json();
        if(data.success) {
            showNotification('🚀 تم رفع طلبك بنجاح وجاري عرضه على فضيلة الشيخ للتشخيص.');
            closeNewRequestModal();
            loadDashboard();
        }
    } catch(e) {
        showNotification('❌ فشل إرسال الطلب، تأكد من الاتصال.', 'error');
    }
});

// ===== 9. النوافذ المنبثقة =====
function openNewRequestModal() {
    const modal = document.getElementById('newRequestModal');
    if (modal) modal.classList.add('show');
}
function closeNewRequestModal() {
    const modal = document.getElementById('newRequestModal');
    if (modal) modal.classList.remove('show');
}

// ===== 10. تهيئة المنصة واستقبال بيانات الشات الذكي =====
(async function init() {
    const isAuth = await checkAuth();
    if (!isAuth) return;
    await loadDashboard();

    const pendingData = localStorage.getItem('pending_chat_request');
    if (pendingData) {
        setTimeout(() => {
            const data = JSON.parse(pendingData);
            openNewRequestModal(); 
            
            const descField = document.getElementById('reqDescription');
            const serviceSelect = document.getElementById('reqServiceType');
            
            if (descField) {
                descField.value = `[تم إنشاء هذا الطلب عبر المستشار الروحاني الذكي]\n\nالمشكلة: ${data.problem}\nالتصنيف: ${data.category || 'غير محدد'}\nالمدة: ${data.duration || 'غير محدد'}\nالمحاولات السابقة: ${data.previous || 'غير محدد'}\n\nالتوصية: ${data.recommendation || ''}`;
            }
            
            if (serviceSelect && data.serviceType) {
                for (let option of serviceSelect.options) {
                    if (option.text.includes(data.serviceType.split(' ')[0])) {
                        option.selected = true;
                        break;
                    }
                }
            }
            
            showNotification('✨ تم استلام بياناتك وتعبئتها تلقائياً.', 'success');
            localStorage.removeItem('pending_chat_request'); 
        }, 800);
    }

    document.getElementById('reviewForm')?.addEventListener('submit', submitReview);

    document.querySelectorAll('.modal-overlay, .modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    });
})();
