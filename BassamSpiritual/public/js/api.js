const API_BASE_URL = '/api';

function getAuthToken() {
    return localStorage.getItem('bassam_auth_token');
}

async function fetchWithAuth(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { ...options, headers };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (response.status === 401) {
            localStorage.removeItem('bassam_auth_token');
            localStorage.removeItem('bassam_user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login.html';
            }
            throw new Error(data.error || 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول.');
        }
        if (!response.ok) throw new Error(data.error || 'حدث خطأ غير متوقع.');
        return data;
    } catch (error) {
        console.error(`❌ [API Error] Endpoint: ${endpoint} | Error:`, error.message);
        throw error;
    }
}

const AuthAPI = {
    async register(fullName, email, password, phone) {
        return await fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password, phone }) });
    },
    async login(email, password) {
        const data = await fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        if (data.success && data.token) {
            localStorage.setItem('bassam_auth_token', data.token);
            localStorage.setItem('bassam_user', JSON.stringify(data.user));
        }
        return data;
    },
    async verifySession() {
        return await fetchWithAuth('/auth/verify', { method: 'GET' });
    },
    logout() {
        localStorage.removeItem('bassam_auth_token');
        localStorage.removeItem('bassam_user');
        window.location.href = '/login.html';
    },
    isAdmin() {
        try {
            const user = JSON.parse(localStorage.getItem('bassam_user'));
            return user && user.role === 'admin';
        } catch (e) { return false; }
    }
};

const BeneficiaryAPI = {
    async getMyDashboard() { return await fetchWithAuth('/dashboard/me', { method: 'GET' }); },
    async submitNewRequest(serviceType, description) {
        return await fetchWithAuth('/dashboard/request', { method: 'POST', body: JSON.stringify({ serviceType, description }) });
    },
    async getRequestDetails(requestId) { return await fetchWithAuth(`/dashboard/request/${requestId}`, { method: 'GET' }); },
    async submitPaymentDetails(requestId, { paymentMethod, paymentSenderName, paymentTransferNumber }) {
        return await fetchWithAuth(`/dashboard/request/${requestId}/submit-payment', {
            method: 'PUT',
            body: JSON.stringify({ paymentMethod, paymentSenderName, paymentTransferNumber })
        });
    },
    async submitReview(comment, rating) {
        return await fetchWithAuth('/dashboard/reviews', { method: 'POST', body: JSON.stringify({ comment, rating }) });
    }
};

const MessagesAPI = {
    async getMessages(requestId) { return await fetchWithAuth(`/requests/${requestId}/messages`, { method: 'GET' }); },
    async sendMessage(requestId, messageText) {
        return await fetchWithAuth(`/requests/${requestId}/messages`, { method: 'POST', body: JSON.stringify({ messageText }) });
    }
};

const AdminAPI = {
    async getAllRequests() { return await fetchWithAuth('/admin/requests', { method: 'GET' }); },
    async acceptInitial(requestId) { return await fetchWithAuth(`/admin/requests/${requestId}/accept-initial`, { method: 'PUT' }); },
    async rejectInitial(requestId, reason) {
        return await fetchWithAuth(`/admin/requests/${requestId}/reject-initial`, { method: 'PUT', body: JSON.stringify({ reason }) });
    },
    async approvePayment(requestId) { return await fetchWithAuth(`/admin/requests/${requestId}/approve-payment`, { method: 'PUT' }); },
    async rejectPayment(requestId, reason) {
        return await fetchWithAuth(`/admin/requests/${requestId}/reject-payment`, { method: 'PUT', body: JSON.stringify({ reason }) });
    },
    async diagnoseAndPrescribe(requestId, { initialDiagnosis, treatmentPlan }) {
        return await fetchWithAuth(`/admin/requests/${requestId}/diagnose`, {
            method: 'PUT',
            body: JSON.stringify({ initialDiagnosis, treatmentPlan })
        });
    },
    async createArticle(title, summary, content, icon = 'bi bi-heart-fill') {
        return await fetchWithAuth('/admin/articles', { method: 'POST', body: JSON.stringify({ title, summary, content, icon }) });
    },
    async getAIInstructions() { return await fetchWithAuth('/admin/ai-instructions', { method: 'GET' }); },
    async updateAIInstructions(instructions) {
        return await fetchWithAuth('/admin/ai-instructions', { method: 'PUT', body: JSON.stringify({ instructions }) });
    },
    async getAllReviewsForAdmin() { return await fetchWithAuth('/admin/reviews', { method: 'GET' }); },
    async updateReviewStatus(reviewId, isApproved) {
        return await fetchWithAuth(`/admin/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify({ isApproved }) });
    },
    async deleteReview(reviewId) { return await fetchWithAuth(`/admin/reviews/${reviewId}`, { method: 'DELETE' }); }
};

window.AuthAPI = AuthAPI;
window.BeneficiaryAPI = BeneficiaryAPI;
window.MessagesAPI = MessagesAPI;
window.AdminAPI = AdminAPI;
