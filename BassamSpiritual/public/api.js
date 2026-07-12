// =================================================================
// api.js - الموصل المركزي بين الواجهة والخادم (v1.0)
// =================================================================

const API = {
    // -------------------------------------------------------------------
    // 1. الأدوات المساعدة
    // -------------------------------------------------------------------
    _token() {
        return localStorage.getItem('token') || '';
    },

    _headers() {
        const h = { 'Content-Type': 'application/json' };
        const token = this._token();
        if (token) h['Authorization'] = `Bearer ${token}`;
        return h;
    },

    async _request(url, method = 'GET', body = null) {
        const options = { method, headers: this._headers() };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        const data = await res.json();

        if (!res.ok) {
            const err = new Error(data.error || 'خطأ في الاتصال بالخادم');
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    },

    // -------------------------------------------------------------------
    // 2. المصادقة (Auth)
    // -------------------------------------------------------------------
    auth: {
        login(email, password) {
            return API._request('/api/auth/login', 'POST', { email, password });
        },
        register(fullName, email, phone, password) {
            return API._request('/api/auth/register', 'POST', { fullName, email, phone, password });
        },
        verify() {
            return API._request('/api/auth/verify', 'GET');
        }
    },

    // -------------------------------------------------------------------
    // 3. المقالات (Articles)
    // -------------------------------------------------------------------
    articles: {
        getAll() {
            return API._request('/api/articles', 'GET');
        },
        getById(id) {
            return API._request(`/api/articles/${id}`, 'GET');
        }
    },

    // -------------------------------------------------------------------
    // 4. المستفيد (Dashboard)
    // -------------------------------------------------------------------
    user: {
        getProfile() {
            return API._request('/api/dashboard/me', 'GET');
        },
        submitRequest(serviceType, description, contactMethod) {
            return API._request('/api/dashboard/request', 'POST', {
                serviceType,
                description,
                contactMethod: contactMethod || 'واتساب'
            });
        },
        getRequest(id) {
            return API._request(`/api/dashboard/request/${id}`, 'GET');
        },
        submitPayment(requestId, paymentData) {
            return API._request(`/api/dashboard/request/${requestId}/submit-payment`, 'PUT', paymentData);
        }
    },

    // -------------------------------------------------------------------
    // 5. لوحة تحكم الشيخ (Admin)
    // -------------------------------------------------------------------
    admin: {
        getRequests() {
            return API._request('/api/admin/requests', 'GET');
        },
        acceptRequest(id) {
            return API._request(`/api/admin/requests/${id}/accept-initial`, 'PUT');
        },
        rejectRequest(id, reason) {
            return API._request(`/api/admin/requests/${id}/reject-initial`, 'PUT', { reason });
        },
        approvePayment(id) {
            return API._request(`/api/admin/requests/${id}/approve-payment`, 'PUT');
        },
        rejectPayment(id, reason) {
            return API._request(`/api/admin/requests/${id}/reject-payment`, 'PUT', { reason });
        },
        completeTreatment(id, treatmentPlan) {
            return API._request(`/api/admin/requests/${id}/complete-treatment`, 'PUT', treatmentPlan);
        },
        lockMessages(id, lock = true) {
            return API._request(`/api/admin/requests/${id}/lock-messages`, 'PUT', { lock });
        },
        deleteRequest(id) {
            return API._request(`/api/admin/requests/${id}`, 'DELETE');
        },
        getMessages(requestId) {
            return API._request(`/api/requests/${requestId}/messages`, 'GET');
        },
        sendMessage(requestId, messageText) {
            return API._request(`/api/admin/requests/${requestId}/messages`, 'POST', { messageText });
        }
    }
};

// تعميم API على النطاق العام
window.API = API;
console.log('✅ API.js - الموصل المركزي جاهز.');
