let currentRequests = [];
let selectedRequestId = null;

async function loadRequests() {
    try {
        const res = await fetch('/api/requests');
        if (res.status === 401) {
            document.getElementById('requestsBody').innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:red;">❌ غير مصرح لك بالدخول.</td></tr>';
            return;
        }
        currentRequests = await res.json();
        renderTable(currentRequests);
        updateStats(currentRequests);
    } catch (e) {
        console.error(e);
        document.getElementById('requestsBody').innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:red;">⚠️ خطأ في تحميل البيانات</td></tr>';
    }
}

function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#888;">📭 لا توجد طلبات حتى الآن</td></tr>';
        return;
    }
    tbody.innerHTML = requests.map((req, index) => {
        const statusMap = {
            'pending': '<span class="status-badge status-pending">⏳ قيد الانتظار</span>',
            'processing': '<span class="status-badge status-processing">⚙️ قيد المعالجة</span>',
            'completed': '<span class="status-badge status-completed">✅ مكتمل</span>',
            'rejected': '<span class="status-badge status-rejected">❌ مرفوض</span>'
        };
        const status = statusMap[req.status] || statusMap.pending;
        const date = new Date(req.createdAt).toLocaleDateString('ar-EG');
        const shortDescription = req.description ? (req.description.length > 60 ? req.description.substring(0, 60) + '...' : req.description) : '⚠️ لا يوجد وصف';
        const paymentStatus = req.paymentStatus === 'verified' ? '🟢 مؤكد' : (req.paymentStatus === 'paid' ? '🟡 مدفوع' : '🔴 غير مدفوع');
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong style="cursor:pointer; color:#D4AF37; text-decoration:underline;" onclick="viewDetails('${req.id}')">${req.fullName}</strong></td>
                <td>${req.email}</td>
                <td>${req.serviceType}</td>
                <td onclick="viewDetails('${req.id}')" style="cursor:pointer;">${status}</td>
                <td style="font-size:0.8rem;">${paymentStatus}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${req.description || 'لا يوجد وصف'}">
                    ${shortDescription}
                </td>
                <td>${date}</td>
                <td>
                    <button class="action-btn view" onclick="viewDetails('${req.id}')"><i class="fas fa-eye"></i></button>
                    <button class="action-btn delete" onclick="deleteRequest('${req.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats(requests) {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    document.getElementById('totalCount').innerText = total;
    document.getElementById('pendingCount').innerText = pending;
    document.getElementById('completedCount').innerText = completed;
    document.getElementById('rejectedCount').innerText = rejected;
}

function filterTable() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = currentRequests.filter(r => 
        r.fullName.includes(query) || 
        r.email.includes(query) || 
        (r.phone && r.phone.includes(query)) ||
        (r.description && r.description.includes(query))
    );
    renderTable(filtered);
}

async function viewDetails(id) {
    selectedRequestId = id;
    const res = await fetch('/api/requests');
    const all = await res.json();
    const req = all.find(r => r.id == id);
    if (!req) return alert('⚠️ الطلب غير موجود');

    const contactMethod = req.contactMethod || 'email';
    const phoneNumber = req.phone || '';
    const isWhatsApp = contactMethod === 'whatsapp';
    const paymentToken = req.paymentToken || null;
    const paymentLink = paymentToken ? `https://bassam-spiritual-center.onrender.com/payment/${paymentToken}` : null;
    const isPaid = req.paymentStatus === 'paid';
    const isVerified = req.paymentStatus === 'verified';
    const isVoiceSession = req.serviceType && (req.serviceType.includes('صوتي') || req.serviceType.includes('جلسة'));

    const modal = document.getElementById('detailsModal');
    let voiceSessionFields = '';
    if (isVoiceSession && (req.status === 'completed' || isPaid || isVerified)) {
        voiceSessionFields = `
            <hr>
            <h4 style="color:#0A1628; margin:15px 0 10px;">🎧 إعدادات الجلسة الصوتية</h4>
            <div style="background:#F0F7F4; padding:15px; border-radius:12px; margin-bottom:15px;">
                <div style="margin-bottom:10px;">
                    <label style="font-weight:700; display:block; margin-bottom:5px;">📅 موعد الجلسة <span style="color:#e74c3c;">*</span></label>
                    <input type="datetime-local" id="appointmentTime" style="width:100%; padding:12px; border:2px solid #E2E8F0; border-radius:12px; font-family:'Cairo';" value="${req.appointmentTime || ''}">
                </div>
                <div style="margin-bottom:5px;">
                    <label style="font-weight:700; display:block; margin-bottom:5px;">🔗 رابط الانضمام (Google Meet / Zoom)</label>
                    <input type="url" id="meetingLink" placeholder="https://meet.google.com/..." style="width:100%; padding:12px; border:2px solid #E2E8F0; border-radius:12px; font-family:'Cairo';" value="${req.meetingLink || ''}">
                    <small style="color:#888; font-size:0.8rem;">يمكنك ترك هذا الحقل فارغاً وسيتم إرسال الرابط لاحقاً.</small>
                </div>
                <input type="hidden" id="isVoiceSession" value="true">
            </div>
        `;
    }

    document.getElementById('modalBody').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; background:#F8FAFC; padding:15px; border-radius:12px; margin-bottom:10px;">
            <p style="margin:4px 0;"><strong>👤 الاسم:</strong> ${req.fullName}</p>
            <p style="margin:4px 0;"><strong>📧 البريد:</strong> ${req.email}</p>
            <p style="margin:4px 0;"><strong>📞 الهاتف:</strong> ${req.phone || 'غير مقدم'}</p>
            <p style="margin:4px 0;"><strong>🌍 الدولة:</strong> ${req.country || 'غير محدد'}</p>
            <p style="margin:4px 0;"><strong>🧑‍🤝‍🧑 المستفيد:</strong> ${req.beneficiary || 'نفسي'}</p>
            <p style="margin:4px 0;"><strong>🛠 الخدمة:</strong> ${req.serviceType}</p>
            <p style="margin:4px 0;"><strong>📩 طريقة التواصل:</strong> ${contactMethod === 'whatsapp' ? '📱 واتساب' : '📧 بريد إلكتروني'}</p>
            <p style="margin:4px 0;"><strong>📅 تاريخ الطلب:</strong> ${new Date(req.createdAt).toLocaleString('ar-EG')}</p>
            <p style="margin:4px 0;"><strong>💰 حالة الدفع:</strong> ${isVerified ? '✅ مؤكد' : (isPaid ? '🟡 قيد المراجعة' : '🔴 غير مدفوع')}</p>
            ${isPaid ? `<p style="margin:4px 0;"><strong>🔢 رقم الحوالة:</strong> ${req.transferCode || 'غير متاح'}</p>` : ''}
        </div>

        <div style="background: #FFFBF0; border-right: 6px solid #F5B041; padding: 15px 20px; border-radius: 12px; margin: 15px 0;">
            <strong style="color: #0A1628; font-size: 1.1rem; display: block; margin-bottom: 8px;">📝 وصف المشكلة:</strong>
            <p style="margin: 0; line-height: 1.9; color: #1A2835; white-space: pre-wrap;">${req.description || '⚠️ لم يكتب المستفيد أي وصف.'}</p>
        </div>

        ${isPaid && !isVerified ? `
        <div style="background: #FEF9E7; border-right: 6px solid #F5B041; padding: 15px 20px; border-radius: 12px; margin: 15px 0;">
            <strong style="color: #0A1628; display: block; margin-bottom: 8px;">💰 تفاصيل الدفع:</strong>
            <p><strong>رقم الحوالة:</strong> ${req.transferCode || 'غير متاح'}</p>
            <p><strong>تاريخ الإرسال:</strong> ${req.paymentDate ? new Date(req.paymentDate).toLocaleString('ar-EG') : 'غير متاح'}</p>
            ${voiceSessionFields}
            <button onclick="verifyPayment('${req.id}')" style="background: #27ae60; color:#fff; border:none; padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; font-family:'Cairo'; margin-top:10px; width:100%;">
                <i class="fas fa-check-circle"></i> ✅ تأكيد الدفع وإرسال العلاج للعميل
            </button>
            <p style="color:#888; font-size:0.85rem; margin-top:8px;">بعد التحقق من صحة الحوالة، اضغط على هذا الزر لإرسال ردك للعميل.</p>
        </div>
        ` : ''}

        ${isVerified ? `
        <div style="background: #D1FAE5; border-right: 6px solid #27ae60; padding: 15px 20px; border-radius: 12px; margin: 15px 0;">
            <strong style="color: #065F46; display: block; margin-bottom: 8px;">✅ تم تأكيد الدفع بنجاح</strong>
            <p><strong>رقم الحوالة:</strong> ${req.transferCode || 'غير متاح'}</p>
            <p><strong>تم التحقق في:</strong> ${req.paymentDate ? new Date(req.paymentDate).toLocaleString('ar-EG') : 'غير متاح'}</p>
            ${isVoiceSession && req.appointmentTime ? `<p><strong>📅 موعد الجلسة:</strong> ${new Date(req.appointmentTime).toLocaleString('ar-EG')}</p>` : ''}
            ${isVoiceSession && req.meetingLink ? `<p><strong>🔗 رابط الجلسة:</strong> <a href="${req.meetingLink}" target="_blank">${req.meetingLink}</a></p>` : ''}
            <p style="color:#065F46;">تم إرسال الرد والعلاج إلى العميل.</p>
        </div>
        ` : ''}

        ${!isPaid && !isVerified ? voiceSessionFields : ''}

        <hr>

        <label for="statusSelect" style="font-weight:700; display:block; margin-top:5px;">🔁 تغيير الحالة:</label>
        <select id="statusSelect" style="width:100%; padding:12px; border:2px solid #E2E8F0; border-radius:12px; font-family:'Cairo'; margin:5px 0 15px;">
            <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
            <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>⚙️ قيد المعالجة</option>
            <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>✅ مكتمل</option>
            <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
        </select>
        
        <label for="replyText" style="font-weight:700; display:block; margin-top:5px;">✍️ الرد على العميل (العلاج):</label>
        <textarea id="replyText" rows="4" placeholder="اكتب الرد أو العلاج هنا..." style="width:100%; padding:15px; border:2px solid #E2E8F0; border-radius:12px; font-family:'Cairo'; font-size:1rem; margin:5px 0 15px;">${req.adminReply || ''}</textarea>
        
        <div style="display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
            <button onclick="saveChanges()" class="btn-save-reply" style="flex:1; min-width:120px; background: linear-gradient(135deg, #F5B041, #E67E22); color: #0A1628; border: none; padding: 14px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; font-family: 'Cairo'; transition: 0.3s; box-shadow: 0 4px 15px rgba(245, 176, 65, 0.4);">
                <i class="fas fa-envelope"></i> 💾 حفظ وإرسال الإشعار
            </button>
            ${isWhatsApp && phoneNumber ? `
            <button onclick="sendViaWhatsApp()" class="btn-whatsapp-reply" style="flex:1; min-width:120px; background: #25D366; color: #fff; border: none; padding: 14px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: 'Cairo'; transition: 0.3s; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);">
                <i class="fab fa-whatsapp"></i> 📱 إرسال عبر واتساب
            </button>
            ` : ''}
        </div>
        ${paymentLink ? `
        <div style="margin-top:15px; background:#F0F7F4; border-radius:12px; padding:15px; border:1px solid #D4AF37;">
            <p style="margin:0;"><strong>🔗 رابط الدفع:</strong></p>
            <p style="margin:5px 0; word-break:break-all; color:#0A1628; font-size:0.9rem;">${paymentLink}</p>
            <button onclick="copyPaymentLink('${paymentLink}')" style="background:#0A1628; color:#F5B041; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:700;">📋 نسخ الرابط</button>
        </div>
        ` : ''}
        <p style="color:#888; font-size:0.85rem; margin-top:10px;">
            <i class="fas fa-info-circle"></i> عند تغيير الحالة إلى "مكتمل"، سيتم إنشاء رابط دفع فريد وإرساله للعميل.
        </p>
    `;
    modal.classList.add('show');
}

async function saveChanges() {
    const status = document.getElementById('statusSelect').value;
    const reply = document.getElementById('replyText').value;
    
    if (!reply.trim()) {
        if (!confirm('⚠️ الرد فارغ. هل تريد المتابعة بدون إرسال رد؟')) return;
    }

    const isVoiceSession = document.getElementById('isVoiceSession')?.value === 'true';
    let appointmentTime = null;
    let meetingLink = null;

    if (isVoiceSession && status === 'completed') {
        appointmentTime = document.getElementById('appointmentTime')?.value || null;
        meetingLink = document.getElementById('meetingLink')?.value || null;
        
        if (!appointmentTime) {
            alert('⚠️ الرجاء تحديد موعد الجلسة الصوتية.');
            return;
        }
    }

    try {
        const res = await fetch(`/api/request/${selectedRequestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, adminReply: reply })
        });
        
        if (!res.ok) {
            alert('❌ فشل تحديث الطلب');
            return;
        }

        const requestsRes = await fetch('/api/requests');
        const allRequests = await requestsRes.json();
        const req = allRequests.find(r => r.id == selectedRequestId);
        
        if (status === 'completed' && req && req.paymentStatus === 'paid') {
            const verifyRes = await fetch(`/api/verify-payment/${selectedRequestId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentTime, meetingLink })
            });
            
            if (verifyRes.ok) {
                alert('✅ تم تأكيد الدفع وإرسال الرد والعلاج للعميل.');
            } else {
                alert('⚠️ تم تحديث الحالة لكن فشل إرسال الرد. يرجى المحاولة مرة أخرى.');
            }
        } else if (status === 'completed') {
            alert('✅ تم تحديث الحالة. سيتم إرسال رابط الدفع للعميل.');
        } else {
            alert('✅ تم تحديث الحالة وإرسال الإشعار للعميل.');
        }
        
        closeModal();
        loadRequests();
    } catch (e) {
        alert('⚠️ خطأ في الاتصال');
        console.error(e);
    }
}

async function verifyPayment(id) {
    if (!confirm('⚠️ هل أنت متأكد من تأكيد الدفع وإرسال العلاج للعميل؟')) return;
    
    const isVoiceSession = document.getElementById('isVoiceSession')?.value === 'true';
    let appointmentTime = null;
    let meetingLink = null;

    if (isVoiceSession) {
        appointmentTime = document.getElementById('appointmentTime')?.value || null;
        meetingLink = document.getElementById('meetingLink')?.value || null;
        if (!appointmentTime) {
            alert('⚠️ الرجاء تحديد موعد الجلسة الصوتية.');
            return;
        }
    }

    try {
        const res = await fetch(`/api/verify-payment/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentTime, meetingLink })
        });
        if (res.ok) {
            alert('✅ تم تأكيد الدفع وإرسال الرد والعلاج للعميل.');
            closeModal();
            loadRequests();
        } else {
            alert('❌ فشل تأكيد الدفع');
        }
    } catch (e) {
        alert('⚠️ خطأ في الاتصال');
    }
}

function copyPaymentLink(link) {
    if (link) {
        navigator.clipboard.writeText(link).then(() => {
            alert('✅ تم نسخ الرابط إلى الحافظة');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('✅ تم نسخ الرابط');
        });
    }
}

async function sendViaWhatsApp() {
    const reply = document.getElementById('replyText').value;
    if (!reply.trim()) {
        alert('⚠️ الرجاء كتابة الرد أولاً.');
        return;
    }

    const res = await fetch('/api/requests');
    const all = await res.json();
    const req = all.find(r => r.id == selectedRequestId);
    if (!req) return alert('⚠️ الطلب غير موجود');

    const phone = req.phone || '';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
        alert('⚠️ رقم الهاتف غير موجود لهذا الطلب.');
        return;
    }

    const paymentToken = req.paymentToken || null;
    const paymentLink = paymentToken ? `https://bassam-spiritual-center.onrender.com/payment/${paymentToken}` : null;
    let text = `السلام عليكم ورحمة الله وبركاته، هذا رد الشيخ بسام على طلبك:\n\n${reply.trim()}\n\n`;
    if (paymentLink) {
        text += `🔗 رابط إتمام الدفع:\n${paymentLink}\n\n`;
    }
    text += `نسأل الله لكم الشفاء والعافية.`;
    
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
    alert(`✅ تم فتح محادثة واتساب مع الرقم ${cleanPhone}.`);
}

async function deleteRequest(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    try {
        const res = await fetch(`/api/request/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('🗑 تم الحذف');
            loadRequests();
        }
    } catch (e) { alert('⚠️ خطأ في الحذف'); }
}

function closeModal() {
    document.getElementById('detailsModal').classList.remove('show');
}

function updateClock() {
    document.getElementById('currentTime').innerText = new Date().toLocaleString('ar-EG');
}
setInterval(updateClock, 1000);
updateClock();

document.addEventListener('DOMContentLoaded', loadRequests);
