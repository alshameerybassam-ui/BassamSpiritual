// ===== التحقق من الجلسة في الواجهة الرئيسية =====
(function checkSessionOnHome() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const registerBtn = document.querySelector('.btn-register');
    const loginBtn = document.querySelector('.btn-login');
    const dashboardLink = document.getElementById('dashboardLink');

    if (token && user) {
        // المستخدم مسجل الدخول
        if (registerBtn) registerBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';
        if (dashboardLink) {
            dashboardLink.style.display = 'inline-flex';
            dashboardLink.innerHTML = `<i class="fas fa-user"></i> مرحباً، ${user.fullName.split(' ')[0]}`;
        }
    } else {
        // المستخدم غير مسجل
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (dashboardLink) dashboardLink.style.display = 'none';
    }
})();

// ===== دالة مساعدة للتنقل =====
function goToDashboard() {
    window.location.href = '/dashboard.html';
}

// ===== دالة مساعدة للخروج =====
function logoutUser() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    }
}

// ===== الإشعارات العامة (للواجهة الرئيسية) =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification show ${type}`;
    setTimeout(() => n.classList.remove('show'), 6000);
}
