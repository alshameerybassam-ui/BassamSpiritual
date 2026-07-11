// =================================================================
// ملف لوحة تحكم المستفيدين المطور - مركز النور الرباني
// =================================================================

let currentUser = null;
let userRequests = [];
let currentRequestId = null;

// ===== 1. الإشعار الفوري للمستفيد =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) { alert(msg); return; }
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 6000);
}

// ===== دالة الإملاء الصوتي الاختيارية (جديد) =====
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

    if (!inputField) { showNotification('⚠️ لم يتم العثور على حقل نصي.', 'error'); return; }

    btnElement.classList.add('recording');
    btnElement.innerHTML = '<i class="bi bi-mic-fill" style="color:red;"></i>';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        inputField.value += (inputField.value ? ' ' : '') + transcript;
        btnElement.classList.remove('recording');
        btnElement.innerHTML = '<i class="bi bi-mic"></i>';
    };

    recognition.onerror = function() {
        btnElement.classList.remove('recording');
        btnElement.innerHTML = '<i class="bi bi-mic"></i>';
        showNotification('❌ تعذر التعرف على الصوت.', 'error');
    };
    recognition.start();
}

// ===== 2. التحقق الآمن =====
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login.html'; return false; }
    try {
        const res = await fetch('/api/auth/verify', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401 || res.status === 403) {
            const data = await res.json();
            if (!data.success) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login.html'; return false; }
        }
        return true; 
    } catch (e) { return true; }
}

// ===== 3. تحميل بيانات اللوحة =====
async function loadDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/dashboard/me', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success) { showNotification('⚠️ حدث خطأ في تحميل البيانات.', 'error'); return; }
        currentUser = data.user;
        userRequests = data.requests || [];
        if(document.getElementById('userName')) document.getElementById('userName').innerHTML = `مرحباً، <span>${data.user.fullName}</span>`;
        renderRequests(userRequests);
    } catch (e) { showNotification('⚠️ خطأ في الاتصال بالخادم.', 'error'); }
}

// ===== 4. رندرة الطلبات =====
function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!container) return;
    if (!requests || requests.length === 0) { container.innerHTML = `<div style="text-align:center; padding:30px;">لا توجد طلبات.</div>`; return; }
}

// ===== 5. عرض تفاصيل الطلب =====
async function viewRequest(id) { /* منطق العرض */ }

// ===== 6. إرسال المراجعات =====
async function submitReview(e) { if(e) e.preventDefault(); /* منطق المراجعة */ }

// ===== 7. تقديم طلب جديد =====
document.getElementById('newRequestForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    /* منطق الطلب */
});

// ===== 8. النوافذ المنبثقة =====
function openNewRequestModal() { const modal = document.getElementById('newRequestModal'); if (modal) modal.classList.add('show'); }
function closeNewRequestModal() { const modal = document.getElementById('newRequestModal'); if (modal) modal.classList.remove('show'); }

// ===== 9. تهيئة المنصة =====
(async function init() {
    const isAuth = await checkAuth();
    if (!isAuth) return;
    await loadDashboard();

    // الربط التلقائي للمستشار الذكي
    const pendingData = localStorage.getItem('pending_chat_request');
    if (pendingData) {
        setTimeout(() => {
            const data = JSON.parse(pendingData);
            openNewRequestModal(); 
            const descField = document.getElementById('reqDescription');
            if (descField) descField.value = `[تم إنشاء هذا الطلب عبر المستشار الذكي]\n\nالمشكلة: ${data.problem}`;
            showNotification('✨ تم استلام بياناتك وتعبئتها.', 'success');
            localStorage.removeItem('pending_chat_request'); 
        }, 800);
    }

    document.getElementById('reviewForm')?.addEventListener('submit', submitReview);
    document.querySelectorAll('.modal-overlay, .modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });
    });
})();
