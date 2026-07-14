/**
 * ============================================================
 * 🛡️ [مركز النور الرباني والنفَس الرحماني] - مكتبة الاتصال البرمجي الموحدة (API SDK)
 * 💎 مبرمجة خصيصاً لفضيلة الشيخ بسام لربط الواجهات بالسيرفر بأعلى درجات الأمان
 * ============================================================
 */

const API_BASE_URL = '/api';

// ==============================================
// 1. برمجيات مساعدة داخلية (Helper Functions)
// ==============================================

/**
 * الحصول على التوكن الأمني المخزن بجلسة المستخدم
 */
function getAuthToken() {
    return localStorage.getItem('bassam_auth_token');
}

/**
 * دالة مركزية موحدة لمعالجة طلبات الشبكة مع السيرفر لضمان الأمان ومعالجة الأخطاء
 */
async function fetchWithAuth(endpoint, options = {}) {
    const token = getAuthToken();
    
    // تجهيز الهيدرز الأساسية للحماية والمصادقة
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        // إذا انتهت صلاحية الجلسة أو غير مسجل دخول
        if (response.status === 401) {
            localStorage.removeItem('bassam_auth_token');
            localStorage.removeItem('bassam_user');
            // التوجيه التلقائي لصفحة الدخول إذا كنا في صفحة محمية
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register') && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
            throw new Error(data.error || 'انتهت صلاحية الجلسة الآمنة، يرجى تسجيل الدخول مجدداً.');
        }

        if (!response.ok) {
            throw new Error(data.error || 'حدث خطأ أثناء معالجة الطلب في السيرفر.');
        }

        return data;
    } catch (error) {
        console.error(`❌ [API Error] Endpoint: ${endpoint} | Error:`, error.message);
        throw error;
    }
}

// ==============================================
// 2. نظام مصادقة وحماية الحسابات (Auth API)
// ==============================================
const AuthAPI = {
    /**
     * تسجيل مستفيد جديد بالمنصة
     */
    async register(fullName, email, password, phone) {
        return await fetchWithAuth('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ fullName, email, password, phone })
        });
    },

    /**
     * تسجيل دخول (مستفيد أو مدير)
     */
    async login(email, password) {
        const data = await fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.success && data.token) {
            localStorage.setItem('bassam_auth_token', data.token);
            localStorage.setItem('bassam_user', JSON.stringify(data.user));
        }
        return data;
    },

    /**
     * التحقق من سلامة الجلسة الحالية وجلب بيانات المستخدم الحالية
     */
    async verifySession() {
        return await fetchWithAuth('/auth/verify', { method: 'GET' });
    },

    /**
     * تسجيل الخروج الآمن ومسح البيانات المؤقتة
     */
    logout() {
        localStorage.removeItem('bassam_auth_token');
        localStorage.removeItem('bassam_user');
        window.location.href = '/login';
    },

    /**
     * التحقق محلياً هل العميل الحالي هو الشيخ بسام (المدير)
     */
    isAdmin() {
        try {
            const user = JSON.parse(localStorage.getItem('bassam_user'));
            return user && user.role === 'admin';
        } catch (e) {
            return false;
        }
    }
};

// ==============================================
// 3. بوابة لوحة تحكم المستفيد (Beneficiary Dashboard API)
// ==============================================
const BeneficiaryAPI = {
    /**
     * جلب الحساب الشخصي لطلب المعاينة والطلبات المرفوعة سابقاً
     */
    async getMyDashboard() {
        return await fetchWithAuth('/dashboard/me', { method: 'GET' });
    },

    /**
     * رفع طلب استشارة أو رقية روحية جديدة لفضيلة الشيخ بسام
     */
    async submitNewRequest(serviceType, description, contactMethod) {
        return await fetchWithAuth('/dashboard/request', {
            method: 'POST',
            body: JSON.stringify({ serviceType, description, contactMethod })
        });
    },

    /**
     * معاينة تفاصيل طلب محدد وقراءة الخطة العلاجية المنشورة له
     */
    async getRequestDetails(requestId) {
        return await fetchWithAuth(`/dashboard/request/${requestId}`, { method: 'GET' });
    },

    /**
     * إرسال بيانات وتأكيد عملية التحويل المالي الخاصة بطلب محدد
     */
    async submitPaymentDetails(requestId, { paymentMethod, paymentSenderName, paymentTransferNumber }) {
        return await fetchWithAuth(`/dashboard/request/${requestId}/submit-payment`, {
            method: 'PUT',
            body: JSON.stringify({ paymentMethod, paymentSenderName, paymentTransferNumber })
        });
    },

    /**
     * إرسال تقييم أو تعبير عن تجربة الاستشفاء للمراجعة والاعتماد بالصفحة الرئيسية
     */
    async submitReview(comment, rating) {
        return await fetchWithAuth('/dashboard/reviews', {
            method: 'POST',
            body: JSON.stringify({ comment, rating })
        });
    }
};

// ==============================================
// 4. نظام المراسلات الآمن داخل المنصة (Internal Messages API)
// ==============================================
const MessagesAPI = {
    /**
     * جلب كامل المحادثة المتبادلة الآمنة بين الشيخ والعميل لطلب محدد
     */
    async getMessages(requestId) {
        return await fetchWithAuth(`/requests/${requestId}/messages`, { method: 'GET' });
    },

    /**
     * إرسال رسالة جديدة أو استفسار داخل تذكرة الطلب المغلقة
     */
    async sendMessage(requestId, messageText) {
        return await fetchWithAuth(`/requests/${requestId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ messageText })
        });
    }
};

// ==============================================
// 5. لوحة الإدارة الشاملة (للقبول والرفض المالي، التشخيص، الـ AI - Admin API)
// ==============================================
const AdminAPI = {
    /**
     * جلب جميع الطلبات الواردة للموقع من جميع البلدان ببيانات المستفيدين الكاملة والمدفوعات
     */
    async getAllRequests() {
        return await fetchWithAuth('/admin/requests', { method: 'GET' });
    },

    /**
     * قبول الطلب مبدئياً وتوجيهه لخطوة الدفع (مع خيار إرسال إيميل تنبيهي)
     */
    async acceptInitial(requestId, sendEmail = false) {
        return await fetchWithAuth(`/admin/requests/${requestId}/accept-initial`, {
            method: 'PUT',
            body: JSON.stringify({ sendEmail })
        });
    },

    /**
     * رفض الطلب مبدئياً وتحديد السبب (مع خيار إرسال إيميل تنبيهي)
     */
    async rejectInitial(requestId, reason, sendEmail = false) {
        return await fetchWithAuth(`/admin/requests/${requestId}/reject-initial`, {
            method: 'PUT',
            body: JSON.stringify({ reason, sendEmail })
        });
    },

    /**
     * اعتماد وتأكيد استلام الدفعة المالية والبدء في العلاج (مع خيار إرسال إيميل تنبيهي)
     */
    async approvePayment(requestId, sendEmail = false) {
        return await fetchWithAuth(`/admin/requests/${requestId}/approve-payment`, {
            method: 'PUT',
            body: JSON.stringify({ sendEmail })
        });
    },

    /**
     * رفض المعاملة المالية لوجود خطأ بالإيصال مع تحديد السبب (مع خيار إرسال إيميل تنبيهي)
     */
    async rejectPayment(requestId, reason, sendEmail = false) {
        return await fetchWithAuth(`/admin/requests/${requestId}/reject-payment`, {
            method: 'PUT',
            body: JSON.stringify({ reason, sendEmail })
        });
    },

    /**
     * كتابة أو تحديث التشخيص الروحي والخطة العلاجية والتحصينات للمستفيد (مع خيار إرسال إيميل)
     */
    async diagnoseAndPrescribe(requestId, { initialDiagnosis, treatmentPlan, sendEmail = false }) {
        return await fetchWithAuth(`/admin/requests/${requestId}/diagnose`, {
            method: 'PUT',
            body: JSON.stringify({ initialDiagnosis, treatmentPlan, sendEmail })
        });
    },

    /**
     * حذف طلب استشارة وسجلاته المرتبطة تماماً من المنصة
     */
    async deleteRequest(requestId) {
        return await fetchWithAuth(`/admin/requests/${requestId}`, { method: 'DELETE' });
    },

    // ----------------------------------------------
    // أ. إدارة المقالات والمدونة (CMS Module)
    // ----------------------------------------------
    async createArticle(title, summary, content, icon = 'bi bi-heart-fill') {
        return await fetchWithAuth('/admin/articles', {
            method: 'POST',
            body: JSON.stringify({ title, summary, content, icon })
        });
    },

    async updateArticle(articleId, { title, summary, content, icon }) {
        return await fetchWithAuth(`/admin/articles/${articleId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, summary, content, icon })
        });
    },

    async deleteArticle(articleId) {
        return await fetchWithAuth(`/admin/articles/${articleId}`, { method: 'DELETE' });
    },

    // ----------------------------------------------
    // ب. الرقابة على التقييمات والآراء (Reviews Module)
    // ----------------------------------------------
    async getAllReviewsForAdmin() {
        return await fetchWithAuth('/admin/reviews', { method: 'GET' });
    },

    async updateReviewStatus(reviewId, isApproved) {
        return await fetchWithAuth(`/admin/reviews/${reviewId}`, {
            method: 'PUT',
            body: JSON.stringify({ isApproved })
        });
    },

    async deleteReview(reviewId) {
        return await fetchWithAuth(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
    },

    // ----------------------------------------------
    // ج. التحكم الفوري بتوجيهات الذكاء الاصطناعي (AI Prompt Panel)
    // ----------------------------------------------
    async getAIInstructions() {
        return await fetchWithAuth('/admin/ai-instructions', { method: 'GET' });
    },

    async updateAIInstructions(instructions) {
        return await fetchWithAuth('/admin/ai-instructions', {
            method: 'PUT',
            body: JSON.stringify({ instructions })
        });
    }
};

// ==============================================
// 6. مسارات عامة لا تحتاج لمصادقة (Public APIs)
// ==============================================
const PublicAPI = {
    /**
     * جلب جميع المقالات المنشورة بمدونة الموقع
     */
    async getArticles() {
        const response = await fetch(`${API_BASE_URL}/articles`);
        if (!response.ok) throw new Error('فشل تحميل مقالات المدونة الروحية.');
        return await response.json();
    },

    /**
     * جلب التقييمات والآراء المعتمدة لنشرها في الصفحة الرئيسية
     */
    async getApprovedReviews() {
        const response = await fetch(`${API_BASE_URL}/reviews`);
        if (!response.ok) throw new Error('تعذر تحميل آراء المستفيدين.');
        return await response.json();
    }
};

// تصدير كل الوحدات البرمجية لتكون قابلة للاستخدام في جميع الصفحات
window.AuthAPI = AuthAPI;
window.BeneficiaryAPI = BeneficiaryAPI;
window.MessagesAPI = MessagesAPI;
window.AdminAPI = AdminAPI;
window.PublicAPI = PublicAPI;
