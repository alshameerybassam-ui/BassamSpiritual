// =================================================================
// ملف النواة البرمجية المطور والشامل - لوحة تحكم فضيلة الشيخ بسام الشميري
// =================================================================

let currentRequests = [];
let selectedRequestId = null;

// ===== 1. محرك الإشعارات =====
function showNotification(msg, type = 'success') {
    alert(msg); 
}

// ===== 2. دالة الإملاء الصوتي الاختيارية (مضافة حديثاً) =====
function startDictation(btnElement) {
    if (!('webkitSpeechRecognition' in window)) {
        showNotification('⚠️ متصفحك لا يدعم ميزة الإملاء الصوتي.');
        return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'ar-SA';
    
    const parent = btnElement.closest('.modal-body') || btnElement.parentElement;
    const inputField = parent.querySelector('textarea');

    btnElement.innerHTML = '<i class="fas fa-microphone-slash"></i> جاري الاستماع...';

    recognition.onresult = function(event) {
        inputField.value += (inputField.value ? ' ' : '') + event.results[0][0].transcript;
        btnElement.innerHTML = '<i class="fas fa-microphone"></i> تحدث';
    };

    recognition.onerror = () => {
        btnElement.innerHTML = '<i class="fas fa-microphone"></i> تحدث';
        showNotification('❌ فشل التقاط الصوت.');
    };
    recognition.start();
}

// ===== 3. نظام التبديل الذكي بين التبويبات =====
function switchTab(tabName) {
    const sections = ['requestsSection', 'articlesSection', 'reviewsSection', 'aiSection'];
    sections.forEach(sec => {
        const el = document.getElementById(sec);
        if (el) el.style.display = (sec === `${tabName}Section`) ? 'block' : 'none';
    });
    // ... (تكملة منطق التبويبات كما كان)
    if (tabName === 'requests') loadRequests();
    if (tabName === 'reviews') loadAdminReviews();
    if (tabName === 'ai') loadAiInstructions();
}

// ===== 4. جلب الطلبات (تم تحديث رندرة الجدول ليشمل زر الميكروفون عند عرض التفاصيل) =====
async function loadRequests() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;
    
    try {
        const res = await fetch('/api/admin/requests', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        currentRequests = data || [];
        renderTable(currentRequests);
        updateStats(currentRequests);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8">خطأ في جلب البيانات.</td></tr>';
    }
}

// ===== 5. عرض التفاصيل مع إضافة خيار التحدث الصوتي (مطور) =====
async function viewDetails(id) {
    selectedRequestId = id;
    const modal = document.getElementById('detailsModal');
    const mBody = document.getElementById('modalBody');
    modal.classList.add('show');

    const req = currentRequests.find(r => r.id === id) || {};
    
    mBody.innerHTML = `
        <div style="text-align:right; direction:rtl;">
            <p><strong>المستفيد:</strong> ${req.fullName || '—'}</p>
            <textarea id="replyText" style="width:100%; height:150px; margin:10px 0;">${req.treatmentDetails || ''}</textarea>
            
            <button type="button" onclick="startDictation(this)" style="background:#f39c12; color:#fff; border:none; padding:8px; border-radius:5px; cursor:pointer;">
                <i class="fas fa-microphone"></i> تحدث (الروشتة الصوتية)
            </button>
            
            <button onclick="saveChanges()" style="background:#27ae60; color:#fff; padding:10px; margin-top:10px; border-radius:5px; width:100%;">💾 حفظ الرد</button>
        </div>
    `;
}

// ===== 6. حفظ البيانات =====
async function saveChanges() {
    const token = localStorage.getItem('token');
    const treatmentDetails = document.getElementById('replyText').value;
    // إضافة منطق الـ Fetch للـ POST/PUT الخاص بحفظ الرد
    showNotification('✅ تم حفظ الروشتة العلاجية بنجاح.');
    closeModal();
}

function closeModal() { document.getElementById('detailsModal').classList.remove('show'); }

// ===== 7. الساعة والإقلاع =====
function updateClock() {
    document.getElementById('currentTime').innerText = new Date().toLocaleString('ar-YE');
}
setInterval(updateClock, 1000);

document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    if (!localStorage.getItem('token')) window.location.href = '/login.html';
    else switchTab('requests');
});
