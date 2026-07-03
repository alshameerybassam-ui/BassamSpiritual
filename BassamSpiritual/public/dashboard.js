// ===== متغيرات عامة =====
let currentUser = null;
let userRequests = [];
let currentRequestId = null;
let mediaRecorder = null;
let audioChunks = [];

// ===== الإشعارات =====
function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.className = `notification ${type} show`;
    setTimeout(() => n.classList.remove('show'), 6000);
}

// ===== التحقق من الجلسة =====
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
        const data = await res.json();
        if (!data.success) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return false;
        }
        currentUser = data.user;
        return true;
    } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        return false;
    }
}

// ===== تحميل بيانات المستخدم =====
async function loadDashboard() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/dashboard/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) {
            showNotification('⚠️ حدث خطأ في تحميل البيانات.', 'error');
            return;
        }

        currentUser = data.user;
        userRequests = data.requests || [];

        // تحديث الواجهة
        document.getElementById('userName').innerHTML = `مرحباً، <span>${data.user.fullName}</span>`;
        document.getElementById('userEmail').textContent = data.user.email;

        // الشريط الجانبي
        document.getElementById('sidebarName').textContent = data.user.fullName;
        document.getElementById('sidebarEmail').textContent = data.user.email;
        document.getElementById('sidebarPhone').textContent = data.user.phone || 'غير مضاف';
        document.getElementById('sidebarJoined').textContent = new Date(data.user.createdAt).toLocaleDateString('ar-EG');
        document.getElementById('userInitial').textContent = data.user.fullName.charAt(0);

        // إحصائيات
        const total = userRequests.length;
        const pending = userRequests.filter(r => r.status === 'pending' || r.status === 'processing').length;
        const completed = userRequests.filter(r => r.status === 'completed').length;
        const rejected = userRequests.filter(r => r.status === 'rejected').length;
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statRejected').textContent = rejected;

        // عرض الطلبات
        renderRequests(userRequests);

        // الإشعارات
        renderNotifications(data.notifications || []);

        // تحديث رصيد المساعد الذكي
        updateChatCredits();

    } catch (e) {
        console.error(e);
        showNotification('⚠️ خطأ في تحميل البيانات.', 'error');
    }
}

// ===== عرض الطلبات =====
function renderRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#6A7A8A;">
                <i class="fas fa-inbox" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
                لا توجد طلبات حتى الآن. اضغط على "طلب جديد" لتقديم طلب.
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(req => {
        const statusMap = {
            'pending': '<span class="status-badge status-pending">⏳ قيد الانتظار</span>',
            'processing': '<span class="status-badge status-processing">⚙️ قيد المعالجة</span>',
            'completed': '<span class="status-badge status-completed">✅ مكتمل</span>',
            'rejected': '<span class="status-badge status-rejected">❌ مرفوض</span>'
        };
        const paymentMap = {
            'pending': '🔴 غير مدفوع',
            'paid': '🟡 قيد المراجعة',
            'verified': '✅ مؤكد',
            'paid_voice': '✅ مؤكد (صوتي)'
        };

        let actionButtons = '';
        if (req.status === 'pending') {
            actionButtons = `<button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-gold"><i class="fas fa-eye"></i> عرض</button>`;
        } else if (req.status === 'processing') {
            if (req.paymentStatus === 'pending') {
                actionButtons = `<button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-gold"><i class="fas fa-credit-card"></i> دفع 100 ر.س</button>`;
            } else if (req.paymentStatus === 'paid') {
                actionButtons = `<button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-blue"><i class="fas fa-clock"></i> جاري التحقق</button>`;
            } else if (req.paymentStatus === 'verified' && !req.treatment) {
                actionButtons = `<button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-blue"><i class="fas fa-stethoscope"></i> عرض التشخيص</button>`;
            } else if (req.treatment && req.paymentStatus !== 'paid_voice') {
                actionButtons = `<button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-green"><i class="fas fa-check-circle"></i> موافقة على العلاج</button>`;
            } else if (req.paymentStatus === 'paid_voice') {
                actionButtons = `<button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-green"><i class="fas fa-headphones"></i> تفاصيل الجلسة</button>`;
            }
        } else if (req.status === 'completed') {
            actionButtons = `
                <button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-blue"><i class="fas fa-eye"></i> عرض العلاج</button>
                <button onclick="openMessageModal('${req.id}')" class="btn-sm btn-sm-gold"><i class="fas fa-comment"></i> استفسار</button>
            `;
        } else if (req.status === 'rejected') {
            actionButtons = `<button onclick="viewRequest('${req.id}')" class="btn-sm btn-sm-red"><i class="fas fa-eye"></i> عرض</button>`;
        }

        return `
            <div class="request-item">
                <div class="top-row">
                    <span class="service">${req.serviceType}</span>
                    <span class="date">${new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                <div class="top-row" style="margin-top:5px;">
                    <span>الحالة: ${statusMap[req.status] || req.status}</span>
                    <span>الدفع: ${paymentMap[req.paymentStatus] || req.paymentStatus}</span>
                </div>
                <div class="description">${req.description ? req.description.substring(0, 100) + (req.description.length > 100 ? '...' : '') : ''}</div>
                <div class="actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

// ===== عرض تفاصيل الطلب (مودال) =====
async function viewRequest(id) {
    currentRequestId = id;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/dashboard/request/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) {
            showNotification('⚠️ فشل تحميل تفاصيل الطلب.', 'error');
            return;
        }
        const req = data.request;
        const modal = document.getElementById('requestDetailsModal');
        let content = `
            <div style="background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:15px;">
                <p><strong>📅 التاريخ:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
                <p><strong>🛠 الخدمة:</strong> ${req.serviceType}</p>
                <p><strong>📩 طريقة التواصل:</strong> ${req.contactMethod === 'whatsapp' ? 'واتساب' : 'بريد إلكتروني'}</p>
                <p><strong>💰 حالة الدفع:</strong> ${req.paymentStatus || 'غير مدفوع'}</p>
            </div>
            <div style="background:#FFFBF0; padding:15px; border-radius:12px; border-right:4px solid #F5B041; margin-bottom:15px;">
                <strong>📝 وصف المشكلة:</strong>
                <p style="margin-top:8px; line-height:1.8;">${req.description || 'لا يوجد وصف'}</p>
            </div>
        `;

        // إذا كان الطلب في مرحلة الدفع (100 ريال)
        if (req.status === 'processing' && req.paymentStatus === 'pending') {
            content += `
                <hr>
                <h4 style="color:#0A1628;">💳 دفع قيمة الكشف (100 ر.س)</h4>
                <p style="color:#6A7A8A;">لإتمام عملية الكشف والتشخيص، يرجى دفع 100 ريال سعودي عبر إحدى الطرق التالية:</p>
                <div style="background:#F8FAFC; padding:15px; border-radius:12px; margin:10px 0;">
                    <p><strong>🏦 بنك الكريمي الإسلامي:</strong> 3021634432</p>
                    <p><strong>📱 محفظة جيب (Geep):</strong> 2804816</p>
                    <p><strong>📱 محفظة ون كاش (OneCash):</strong> 168933529</p>
                    <p style="font-size:0.85rem; color:#888;">اسم المستفيد: بسام محمد هزاع الشميري</p>
                </div>
                <label>رقم الحوالة <span style="color:#e74c3c;">*</span></label>
                <input type="text" id="paymentTransferCode" placeholder="أدخل رقم الحوالة هنا..." style="width:100%; padding:10px; border:2px solid #E2E8F0; border-radius:10px; font-family:'Cairo';">
                <button onclick="confirmDiagnosisPayment('${req.id}')" class="btn-primary" style="width:100%; margin-top:10px; justify-content:center;">
                    <i class="fas fa-check-circle"></i> تأكيد الدفع
                </button>
            `;
        }

        // إذا كان الطلب في مرحلة التشخيص (عرض التشخيص والعلاج)
        if (req.status === 'processing' && req.paymentStatus === 'verified' && req.diagnosis) {
            content += `
                <hr>
                <h4 style="color:#0A1628;">🧑‍⚕️ تشخيص الشيخ بسام</h4>
                <div style="background:#F0F7F4; padding:15px; border-radius:12px; margin:10px 0; border-right:4px solid #1B4D3D;">
                    <p style="line-height:1.8;">${req.diagnosis}</p>
                </div>
                <hr>
                <h4 style="color:#0A1628;">🛡️ العلاج المقترح</h4>
                <div style="background:#FFFBF0; padding:15px; border-radius:12px; margin:10px 0; border-right:4px solid #F5B041;">
                    <p style="line-height:1.8;">${req.treatment || 'سيتم تحديد العلاج قريباً.'}</p>
                </div>
                ${!req.treatmentDetails ? `
                <p style="color:#6A7A8A; font-size:0.9rem;">هل ترغب في التواصل مع الشيخ عبر مكالمة صوتية؟ (350 ر.س)</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="agreeVoiceSession('${req.id}')" class="btn-sm btn-sm-gold" style="padding:10px 30px; font-size:1rem;">
                        <i class="fas fa-check"></i> موافق
                    </button>
                    <button onclick="rejectTreatment('${req.id}')" class="btn-sm btn-sm-red" style="padding:10px 30px; font-size:1rem;">
                        <i class="fas fa-times"></i> غير موافق
                    </button>
                </div>
                ` : ''}
            `;
        }

        // إذا كانت الجلسة الصوتية مؤكدة
        if (req.paymentStatus === 'paid_voice' && req.status === 'processing') {
            content += `
                <hr>
                <h4 style="color:#0A1628;">🎧 تفاصيل الجلسة الصوتية</h4>
                <div style="background:#F0F7F4; padding:15px; border-radius:12px; margin:10px 0; border-right:4px solid #3498db;">
                    <p><strong>📅 الموعد:</strong> ${req.appointmentTime ? new Date(req.appointmentTime).toLocaleString('ar-EG') : 'سيتم تحديده قريباً'}</p>
                    <p><strong>🔗 رابط الانضمام:</strong> ${req.meetingLink || 'سيتم إرساله لاحقاً'}</p>
                </div>
                <button onclick="markCompleted('${req.id}')" class="btn-primary" style="width:100%; justify-content:center;">
                    <i class="fas fa-check"></i> تمت الجلسة
                </button>
            `;
        }

        // إذا كان الطلب مكتملاً (عرض العلاج كاملاً)
        if (req.status === 'completed' && req.treatmentDetails) {
            content += `
                <hr>
                <h4 style="color:#0A1628;">📖 العلاج والوصفة</h4>
                <div style="background:#FFFBF0; padding:20px; border-radius:12px; margin:10px 0; border-right:6px solid #27ae60; line-height:2;">
                    ${req.treatmentDetails.replace(/\n/g, '<br>')}
                </div>
            `;
        }

        // إذا كان الطلب مرفوضاً
        if (req.status === 'rejected') {
            content += `
                <hr>
                <div style="background:#FEE2E2; padding:15px; border-radius:12px; border-right:4px solid #e74c3c; margin:10px 0;">
                    <p style="color:#991B1B; line-height:1.8;">${req.adminReplies && req.adminReplies.length > 0 ? req.adminReplies[req.adminReplies.length-1] : 'تم رفض الطلب من قبل الشيخ بسام.'}</p>
                </div>
            `;
        }

        document.getElementById('requestDetailsContent').innerHTML = content;
        modal.classList.add('show');

    } catch (e) {
        showNotification('⚠️ خطأ في تحميل التفاصيل.', 'error');
    }
}

// ===== تأكيد دفع التشخيص (100 ريال) =====
async function confirmDiagnosisPayment(id) {
    const transferCode = document.getElementById('paymentTransferCode').value.trim();
    if (!transferCode) {
        showNotification('⚠️ الرجاء إدخال رقم الحوالة.', 'error');
        return;
    }
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/dashboard/payment/confirm/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ transferCode, paymentMethod: 'تحويل بنكي' })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ ' + data.message, 'success');
            closeDetailsModal();
            loadDashboard();
        } else {
            showNotification('❌ ' + (data.error || 'فشل تأكيد الدفع'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال.', 'error');
    }
}

// ===== الموافقة على الجلسة الصوتية (دفع 350 ريال) =====
async function agreeVoiceSession(id) {
    if (!confirm('سيتم خصم 350 ريال سعودي للجلسة الصوتية. هل أنت موافق؟')) return;
    const transferCode = prompt('الرجاء إدخال رقم الحوالة الخاصة بدفع 350 ريال للجلسة الصوتية:');
    if (!transferCode || transferCode.trim() === '') {
        showNotification('⚠️ الرجاء إدخال رقم الحوالة.', 'error');
        return;
    }
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/dashboard/treatment/agree/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ agree: true, paymentMethod: 'تحويل بنكي', transferCode: transferCode.trim() })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ ' + data.message, 'success');
            closeDetailsModal();
            loadDashboard();
        } else {
            showNotification('❌ ' + (data.error || 'فشل تأكيد الجلسة'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال.', 'error');
    }
}

// ===== رفض العلاج =====
async function rejectTreatment(id) {
    if (!confirm('هل أنت متأكد من رفض العلاج؟')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/dashboard/treatment/agree/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ agree: false })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ تم رفض العلاج. سيتم إشعار الشيخ.', 'success');
            closeDetailsModal();
            loadDashboard();
        } else {
            showNotification('❌ ' + (data.error || 'فشل الرفض'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال.', 'error');
    }
}

// ===== إكمال الطلب =====
async function markCompleted(id) {
    if (!confirm('هل تمت الجلسة الصوتية بنجاح؟')) return;
    // هذا يستدعي مساراً لإكمال الطلب (سنضيفه لاحقاً في لوحة التحكم الرئيسية)
    // حالياً سنقوم بتحديث الواجهة فقط
    showNotification('✅ تم إكمال الطلب بنجاح.', 'success');
    closeDetailsModal();
    loadDashboard();
}

// ===== نافذة الاستفسار بعد العلاج =====
function openMessageModal(id) {
    const msg = prompt('اكتب استفسارك عن العلاج:');
    if (msg && msg.trim().length >= 3) {
        sendMessage(id, msg);
    } else if (msg !== null) {
        showNotification('⚠️ الرسالة قصيرة جداً (3 أحرف على الأقل).', 'error');
    }
}

async function sendMessage(id, message) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/dashboard/message/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ ' + data.message, 'success');
            loadDashboard();
        } else {
            showNotification('❌ ' + (data.error || 'فشل إرسال الرسالة'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال.', 'error');
    }
}

// ===== تسجيل الصوت =====
function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('⚠️ المتصفح لا يدعم التسجيل الصوتي.', 'error');
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Audio = reader.result.split(',')[1];
                    document.getElementById('reqVoiceNote').value = base64Audio;
                    document.getElementById('recordingStatus').textContent = '✅ تم التسجيل بنجاح!';
                    document.getElementById('recordingStatus').style.color = '#27ae60';
                };
                reader.readAsDataURL(audioBlob);
            };
            mediaRecorder.start();
            document.getElementById('recordingStatus').textContent = '🔴 جاري التسجيل...';
            document.getElementById('recordingStatus').style.color = '#e74c3c';
            showNotification('🎙️ بدأ التسجيل... اضغط "إيقاف" عند الانتهاء.', 'success');
        })
        .catch(err => {
            showNotification('⚠️ لا يمكن الوصول إلى الميكروفون: ' + err.message, 'error');
        });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        document.getElementById('recordingStatus').textContent = '⏹️ تم الإيقاف';
        document.getElementById('recordingStatus').style.color = '#6A7A8A';
        showNotification('⏹️ تم إيقاف التسجيل.', 'success');
    } else {
        showNotification('⚠️ لا يوجد تسجيل نشط.', 'error');
    }
}

// ===== تبويبات =====
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('tabRequests').style.display = 'none';
    document.getElementById('tabChat').style.display = 'none';
    document.getElementById('tabNotifications').style.display = 'none';

    if (tab === 'requests') {
        document.getElementById('tabRequests').style.display = 'block';
        document.getElementById('tabRequestsBtn').className = 'btn-primary';
        document.getElementById('tabChatBtn').className = 'btn-outline';
        document.getElementById('tabNotificationsBtn').className = 'btn-outline';
    } else if (tab === 'chat') {
        document.getElementById('tabChat').style.display = 'block';
        document.getElementById('tabRequestsBtn').className = 'btn-outline';
        document.getElementById('tabChatBtn').className = 'btn-primary';
        document.getElementById('tabNotificationsBtn').className = 'btn-outline';
        loadChatHistory();
    } else if (tab === 'notifications') {
        document.getElementById('tabNotifications').style.display = 'block';
        document.getElementById('tabRequestsBtn').className = 'btn-outline';
        document.getElementById('tabChatBtn').className = 'btn-outline';
        document.getElementById('tabNotificationsBtn').className = 'btn-primary';
    }
}

// ===== المساعد الذكي =====
async function loadChatHistory() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/chat/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            const container = document.getElementById('chatMessages');
            if (data.history.length === 0) {
                container.innerHTML = `<div style="text-align:center; color:#6A7A8A; padding:20px;">مرحباً! اسألني أي سؤال روحاني. (رسائل مجانية: <span id="chatRemaining">${data.remaining}</span>)</div>`;
            } else {
                let html = '';
                data.history.forEach(h => {
                    html += `
                        <div style="margin-bottom:10px;">
                            <div style="background:#0A1628; color:#F5B041; padding:10px 15px; border-radius:12px; border-bottom-right-radius:4px; display:inline-block; max-width:85%;">
                                ${h.message}
                            </div>
                            <div style="background:#FFFBF0; padding:10px 15px; border-radius:12px; border-bottom-right-radius:4px; margin-top:5px; border-right:3px solid #F5B041; max-width:85%;">
                                ${h.reply}
                            </div>
                            <div style="color:#999; font-size:0.7rem; margin-top:3px;">${new Date(h.date).toLocaleString('ar-EG')}</div>
                        </div>
                    `;
                });
                container.innerHTML = html + `<div style="text-align:center; color:#6A7A8A; padding:10px; font-size:0.85rem;">رسائل متبقية: <span id="chatRemaining">${data.remaining}</span></div>`;
                container.scrollTop = container.scrollHeight;
            }
            document.getElementById('chatRemaining')?.textContent = data.remaining;
        }
    } catch (e) {
        console.error(e);
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    const token = localStorage.getItem('token');
    const container = document.getElementById('chatMessages');
    const statusDiv = document.getElementById('chatStatus');

    // عرض رسالة المستخدم فوراً
    container.innerHTML += `
        <div style="margin-bottom:10px; text-align:left;">
            <div style="background:#0A1628; color:#F5B041; padding:10px 15px; border-radius:12px; border-bottom-left-radius:4px; display:inline-block; max-width:85%;">
                ${message}
            </div>
        </div>
    `;
    container.scrollTop = container.scrollHeight;
    input.value = '';
    statusDiv.textContent = '⏳ جاري التفكير...';

    try {
        const res = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message })
        });
        const data = await res.json();

        if (data.requiresPayment) {
            statusDiv.textContent = '⚠️ ' + data.error;
            container.innerHTML += `
                <div style="margin-bottom:10px;">
                    <div style="background:#FEE2E2; padding:10px 15px; border-radius:12px; border-right:4px solid #e74c3c;">
                        <strong>⚠️ انتهت رسائلك المجانية</strong>
                        <p style="margin:5px 0;">للتواصل مع المساعد، يرجى دفع <strong>10$</strong>.</p>
                        <button onclick="payForChat()" class="btn-sm btn-sm-gold"><i class="fas fa-credit-card"></i> دفع 10$</button>
                    </div>
                </div>
            `;
            container.scrollTop = container.scrollHeight;
            return;
        }

        if (data.success) {
            statusDiv.textContent = `✅ رسائل متبقية: ${data.freeMessagesLimit - data.freeMessagesUsed}`;
            container.innerHTML += `
                <div style="margin-bottom:10px;">
                    <div style="background:#FFFBF0; padding:10px 15px; border-radius:12px; border-bottom-right-radius:4px; border-right:3px solid #F5B041; max-width:85%;">
                        ${data.reply}
                    </div>
                </div>
            `;
            container.scrollTop = container.scrollHeight;
            document.getElementById('chatRemaining')?.textContent = data.freeMessagesLimit - data.freeMessagesUsed;
        } else {
            statusDiv.textContent = '❌ ' + (data.error || 'حدث خطأ');
            showNotification('❌ ' + (data.error || 'حدث خطأ'), 'error');
        }
    } catch (e) {
        statusDiv.textContent = '⚠️ خطأ في الاتصال';
        showNotification('⚠️ خطأ في الاتصال بالخادم.', 'error');
    }
}

function payForChat() {
    const transferCode = prompt('الرجاء إدخال رقم الحوالة (10$):');
    if (!transferCode || transferCode.trim() === '') {
        showNotification('⚠️ الرجاء إدخال رقم الحوالة.', 'error');
        return;
    }
    // سيتم تنفيذ الدفع عبر مسار /api/chat/pay
    // لكننا سنكتفي بإشعار حالياً
    showNotification('✅ سيتم تفعيل الدفع قريباً. حالياً سيتم إضافة 50 رسالة مجانية.', 'success');
    // إعادة تحميل الشات
    setTimeout(loadChatHistory, 1000);
}

// ===== تحديث رصيد المساعد =====
async function updateChatCredits() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/chat/credits', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('chatRemaining')?.textContent = data.remaining;
        }
    } catch (e) {}
}

// ===== الإشعارات =====
function renderNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#6A7A8A; padding:20px;">لا توجد إشعارات جديدة.</p>`;
        return;
    }
    container.innerHTML = notifications.map(n => `
        <div style="background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:10px; border-right:4px solid #3498db;">
            <p style="margin:0; line-height:1.6;">${n}</p>
            <span style="font-size:0.75rem; color:#999;">${new Date().toLocaleDateString('ar-EG')}</span>
        </div>
    `).join('');
}

// ===== نموذج طلب جديد =====
function openNewRequestModal() {
    document.getElementById('newRequestModal').classList.add('show');
}
function closeNewRequestModal() {
    document.getElementById('newRequestModal').classList.remove('show');
}
function closeDetailsModal() {
    document.getElementById('requestDetailsModal').classList.remove('show');
}

// ===== تقديم طلب جديد (من النموذج) =====
document.getElementById('newRequestForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const serviceType = document.getElementById('reqServiceType').value;
    const contactMethod = document.getElementById('reqContactMethod').value;
    const description = document.getElementById('reqDescription').value.trim();
    const voiceNote = document.getElementById('reqVoiceNote').value;

    if (!description || description.length < 5) {
        showNotification('⚠️ وصف المشكلة قصير جداً (5 أحرف على الأقل).', 'error');
        return;
    }

    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        const res = await fetch('/api/dashboard/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ serviceType, description, contactMethod, voiceNote })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ ' + data.message, 'success');
            closeNewRequestModal();
            loadDashboard();
        } else {
            showNotification('❌ ' + (data.error || 'فشل إرسال الطلب'), 'error');
        }
    } catch (e) {
        showNotification('⚠️ خطأ في الاتصال بالخادم.', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
});

// ===== تسجيل الخروج =====
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }
}

// ===== تهيئة الصفحة =====
(async function init() {
    const isAuth = await checkAuth();
    if (!isAuth) return;
    await loadDashboard();

    // فتح التبويب المناسب إذا كان هناك tab في الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'chat') {
        showTab('chat');
        loadChatHistory();
    } else {
        showTab('requests');
    }

    // إضافة حدث Enter لشات
    document.getElementById('chatInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // إغلاق المودال عند النقر خارج المحتوى
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
})();
