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

// ===== 5. رندرة وعرض الطلبات تفعيل الزر والجدول الهيكلي المتطور =====
function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!container) return;
    if (!requests || requests.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#6A7A8A;">📭 لا توجد طلبات علاجية مقدمة حالياً.</div>`;
        return;
    }

    // خريطة الحالات المحدثة لتتوافق بالكامل مع الحوكمة السحابية
    const statusMap = {
        'pending': '<span class="badge bg-warning text-dark">قيد المراجعة المبدئية</span>',
        'accepted_waiting_payment': '<span class="badge bg-secondary text-white">بانتظار دفع الكشفية (100 ريال)</span>',
        'payment_submitted': '<span class="badge bg-info text-dark">جاري التحقق من التحويل</span>',
        'payment_rejected': '<span class="badge bg-danger">إيصال مرفوض - يرجى التعديل</span>',
        'processing': '<span class="badge bg-primary text-white">قيد العلاج والمتابعة</span>',
        'completed': '<span class="badge bg-success">اكتمل البرنامج العلاجي</span>',
        'rejected_by_admin': '<span class="badge bg-dark">تم الاعتذار عن استقبال الملف</span>',
        'closed': '<span class="badge bg-dark">ملف مغلق نهائياً</span>'
    };

    let html = `<table class="table style-table text-right" style="direction:rtl;">
        <thead>
            <tr>
                <th>رقم الملف</th>
                <th>نوع الخدمة المعالجة</th>
                <th>حالة الملف السحابي</th>
                <th>تاريخ التقديم</th>
                <th>إجراءات الإدارة</th>
            </tr>
        </thead>
        <tbody>`;

    requests.forEach((req, index) => {
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE') : '—';
        html += `
            <tr>
                <td>#${req.id}</td>
                <td><strong>${req.serviceType || 'استشارة عامة'}</strong></td>
                <td>${statusMap[req.status] || '<span class="badge bg-warning text-dark">قيد الانتظار</span>'}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewRequest('${req.id}')">
                        <i class="bi bi-eye"></i> فتح الملف والتفاصيل
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ===== 6. تفعيل عرض تفاصيل الطلب مع حوكمة نماذج الدفع المالي المدمجة =====
async function viewRequest(id) {
    currentRequestId = id;
    const token = localStorage.getItem('token');
    
    try {
        // تم الإصلاح الجذري هنا: تعديل المسار من /requests/ إلى /request/ ليتوافق مع السيرفر وينهي خطأ 404
        const res = await fetch(`/api/dashboard/request/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(!data.success) { showNotification('⚠️ تعذر جلب تفاصيل الحالة.', 'error'); return; }
        
        const req = data.request;
        let detailsHtml = `
            <div class="request-details-box text-right" style="direction: rtl; text-align: right;">
                <p><strong>نوع الخدمة الكلية:</strong> ${req.service_type || req.serviceType}</p>
                <p><strong>شرح الأعراض المرفوع:</strong> ${req.description}</p>
                <hr>
        `;

        // 1. معالجة حالة انتظار رفع الحوالة أو الرفض المالي لإظهار حقول التحويل المالي المباشر
        if (req.status === 'accepted_waiting_payment' || req.status === 'payment_rejected') {
            if (req.status === 'payment_rejected') {
                detailsHtml += `<div class="alert alert-danger">⚠️ سبب رفض التحويل السابق: ${req.payment_rejection_reason || 'غير محدد'}</div>`;
            }
            detailsHtml += `
                <div class="card p-3 bg-light mt-3">
                    <h5 class="text-primary"><i class="bi bi-wallet2"></i> استمارة تأكيد حوالة الكشفية (100 ريال)</h5>
                    <p class="small text-muted">الرجاء تحويل مبلغ 100 ريال كشفية وإدخال بيانات الإيصال أدناه للاعتماد المباشر من الشيخ.</p>
                    <form id="paymentSubmitForm" onsubmit="submitPaymentData(event, '${req.id}')">
                        <div class="mb-2">
                            <label class="form-label small">طريقة التحويل المالي</label>
                            <input type="text" id="payMethod" class="form-control form-control-sm" placeholder="مثال: الكريمي، النجم، بنك التضامن" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">اسم المرسل بالكامل كاملاً كما هو بالحوالة</label>
                            <input type="text" id="paySender" class="form-control form-control-sm" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">رقم الحوالة / السند المالي</label>
                            <input type="text" id="payNumber" class="form-control form-control-sm" required>
                        </div>
                        <button type="submit" class="btn btn-sm btn-success w-100 mt-2">🚀 إرسال إيصال التحويل المالي</button>
                    </form>
                </div>
            `;
        } 
        // 2. حالة التحقق من الحوالة
        else if (req.status === 'payment_submitted') {
            detailsHtml += `<div class="alert alert-info">🔄 تم استلام إيصال الحوالة المادية لـ الكشفية، وهي قيد المراجعة والتدقيق المالي الآن من قبل الشيخ بسام الشميري.</div>`;
        }
        // 3. حالة رفض الملف مبدئياً من الشيخ
        else if (req.status === 'rejected_by_admin') {
            detailsHtml += `<div class="alert alert-dark">🚫 اعتذر فضيلة الشيخ عن استقبال الحالة. <strong>السبب:</strong> ${req.initial_rejection_reason || 'عدم الاختصاص الروحي أو الفقهي.'}</div>`;
        }
        // 4. الحالات المتقدمة (العلاج والمتابعة)
        else {
            detailsHtml += `
                <p class="text-success"><strong>🔮 الملاحظات والتشخيص المبدئي:</strong></p>
                <div class="p-2 bg-light border rounded mb-2">${req.initial_diagnosis || 'جاري صياغة التقييم الروحي المبدئي...'}</div>
                
                <p class="text-primary"><strong>🌿 البرنامج والخطط العلاجية المعتمدة:</strong></p>
                <div class="p-2 bg-light border rounded" style="white-space: pre-line;">${req.treatment_plan || 'تظهر الأوراد والبرامج والأذكار هنا فور اعتمادها المالي التام.'}</div>
            `;
            
            if (req.additional_treatment_cost > 0) {
                detailsHtml += `<p class="mt-2 text-danger small"><strong>⚠️ تكلفة العلاج الخاص التراكمي:</strong> ${req.additional_treatment_cost} ريال.</p>`;
            }
        }

        detailsHtml += `</div>`;
        
        // استخدام آلية تنبيه أنيقة مبدئية أو يمكن رندرتها داخل ديف مخصص للـ Modal في واجهتك
        const targetDetailsModal = document.getElementById('requestDetailsContainer');
        if (targetDetailsModal) {
            targetDetailsModal.innerHTML = detailsHtml;
            // افتحي المودال الخاص بالتفاصيل إذا كان متاحاً في الواجهة
            document.getElementById('viewRequestModal')?.classList.add('show');
        } else {
            // بديل تفاعلي مبسط في حال عدم توفر عقدة الـ DOM
            alert(`معلومات الملف المطور #${req.id}`);
        }

    } catch(e) {
        showNotification('⚠️ خطأ هندسي في جلب تفاصيل الحالة من السيرفر.', 'error');
    }
}

// ===== 6.5 [دالة جديدة مضافة]: رفع بيانات التحويل المالي سحابياً للمستفيد =====
async function submitPaymentData(event, requestId) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    
    const paymentMethod = document.getElementById('payMethod')?.value.trim();
    const paymentSenderName = document.getElementById('paySender')?.value.trim();
    const paymentTransferNumber = document.getElementById('payNumber')?.value.trim();

    if (!paymentMethod || !paymentSenderName || !paymentTransferNumber) {
        showNotification('⚠️ يرجى ملء كافة بيانات الحوالة بدقة.', 'error');
        return;
    }

    try {
        // تم ضبط هذا المسار ليتلائم أيضاً مع هيكلية السيرفر المقابلة والموحدة
        const res = await fetch(`/api/dashboard/request/${requestId}/submit-payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ paymentMethod, paymentSenderName, paymentTransferNumber })
        });
        
        const data = await res.json();
        if (data.success) {
            showNotification('✅ تم إرسال بيانات إيصال الحوالة المادية بنجاح للشيخ للتدقيق.', 'success');
            document.getElementById('viewRequestModal')?.classList.remove('show');
            loadDashboard();
        } else {
            showNotification(`❌ ${data.error}`, 'error');
        }
    } catch(e) {
        showNotification('❌ فشل معالجة طلب الدفع السحابي.', 'error');
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
        const res = await fetch('/api/dashboard/request', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ serviceType, description })
        });
        const data = await res.json();
        if(data.success) {
            showNotification('🚀 تم رفع طلبك بنجاح وجاري عرضه على فضيلة الشيخ للتشخيص المبدئي.');
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
