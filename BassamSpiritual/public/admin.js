// =================================================================
// ملف النواة البرمجية المطور والشامل - لوحة تحكم فضيلة الشيخ بسام الشميري
// =================================================================

let currentRequests = [];
let selectedRequestId = null;

// ===== 1. محرك الإشعارات السريعة لراحة البال =====
function showNotification(msg, type = 'success') {
    alert(msg); 
}

// ===== [ميزة مضافة]: دالة الإملاء الصوتي الاختيارية للشيخ بسام للرد المباشر =====
function startAdminDictation(btnElement) {
    if (!('webkitSpeechRecognition' in window)) {
        showNotification('⚠️ متصفحك لا يدعم ميزة الإملاء الصوتي على هذا المتصفح.');
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    const inputField = document.getElementById('replyText');

    if (!inputField) {
        showNotification('⚠️ لم يتم العثور على حقل البرنامج العلاجي.');
        return;
    }

    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاستماع صوتاً...';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        inputField.value += (inputField.value ? ' ' : '') + transcript;
        btnElement.innerHTML = '<i class="fas fa-microphone"></i> إملاء البرنامج صوتاً';
    };

    recognition.onerror = function() {
        btnElement.innerHTML = '<i class="fas fa-microphone"></i> إملاء البرنامج صوتاً';
        showNotification('❌ لم يتم التقاط الصوت، يرجى المحاولة ثانية.');
    };

    recognition.start();
}

// ===== 2. نظام التبديل الذكي والمباشر بين التبويبات (Tabs Switcher) =====
function switchTab(tabName) {
    // إخفاء جميع الأقسام المحتواة في لوحة التحكم
    const sections = ['requestsSection', 'articlesSection', 'reviewsSection', 'aiSection'];
    sections.forEach(sec => {
        const el = document.getElementById(sec);
        if (el) el.style.display = 'none';
    });

    // إزالة فئة النشاط من أزرار القائمة الجانبية
    const navButtons = document.querySelectorAll('.sidebar-menu li, .sidebar-menu a');
    navButtons.forEach(btn => btn.classList.remove('active'));

    // تفعيل الخلفية الملونة للتبويب الحالي النشط
    const activeNav = document.getElementById(`nav${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activeNav) activeNav.classList.add('active');

    // إظهار القسم المطلوب وتفعيل زره
    const activeSection = document.getElementById(`${tabName}Section`);
    if (activeSection) activeSection.style.display = 'block';

    if (tabName === 'requests') loadRequests();
    if (tabName === 'articles') fetchAdminArticles();
    if (tabName === 'reviews') loadAdminReviews();
    if (tabName === 'ai') loadAiInstructions();
}

// ===== 3. جلب الطلبات الحية من السيرفر (PostgreSQL API) =====
async function loadRequests() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#6A7A8A;"><i class="fas fa-spinner fa-spin"></i> جاري جلب ملفات المستفيدين الحية من السيرفر السحابي...</td></tr>';

    try {
        const res = await fetch('/api/admin/requests', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('صلاحية غير صالحة');
        const data = await res.json();

        currentRequests = data || [];
        renderTable(currentRequests);
        updateStats(currentRequests);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#e74c3c;">خطأ في جلب البيانات السحابية. تأكد من صلاحية الدخول.</td></tr>';
    }
}

// ===== 4. رندرة وعرض جدول الطلبات الفخم =====
function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#6A7A8A;">📭 لا توجد طلبات جديدة مرسلة من المستفيدين حالياً.</td></tr>';
        return;
    }
    
    const statusMap = {
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> قيد الانتظار</span>',
        'processing': '<span class="status-badge status-processing"><i class="fas fa-spinner fa-spin"></i> قيد العلاج</span>',
        'completed': '<span class="status-badge status-completed"><i class="fas fa-check-circle"></i> مكتمل</span>',
        'rejected': '<span class="status-badge status-rejected"><i class="fas fa-times-circle"></i> مستبعد</span>'
    };
    
    tbody.innerHTML = requests.map((req, index) => {
        const uName = req.fullName || 'مستفيد غير مسجل';
        const uEmail = req.email || '—';
        const idToUse = req.id;
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE', {year: 'numeric', month: 'short', day: 'numeric'}) : '—';

        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong style="color: #2C3E50; cursor:pointer; text-decoration:underline;" onclick="viewDetails('${idToUse}')">👤 ${uName}</strong></td>
                <td style="color:#4A5A6A;">${uEmail}</td>
                <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:8px; font-size:0.9rem; color:#2C3E50;">${req.serviceType || 'استشارة عامة'}</span></td>
                <td>${statusMap[req.status] || statusMap.pending}</td>
                <td><span style="color:#22C55E; font-weight:700;">🟢 مؤكد</span></td>
                <td style="font-size:0.85rem; color:#6A7A8A;">${date}</td>
                <td>
                    <button class="action-btn edit" onclick="viewDetails('${idToUse}')" style="background:#3498db; color:#fff; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">
                        <i class="fas fa-folder-open"></i> معالجة
                    </button>
                    <button class="action-btn delete" onclick="deleteRequest('${idToUse}')" style="background:#e74c3c; color:#fff; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== 5. تحديث بطاقات الإحصائيات العلوية بالبيانات الحقيقية =====
function updateStats(requests) {
    if(!document.getElementById('totalCount')) return;
    document.getElementById('totalCount').innerText = requests.length;
    document.getElementById('pendingCount').innerText = requests.filter(r => r.status === 'pending').length;
    document.getElementById('completedCount').innerText = requests.filter(r => r.status === 'completed' || r.status === 'processing').length;
    document.getElementById('rejectedCount').innerText = requests.filter(r => r.status === 'rejected').length;
}

// ===== [نظام مدمج جديد]: إدارة ومراقبة المقالات الروحية (CRUD) =====

// 1. فتح نموذج إضافة مقال جديد فارغ
function openNewArticleForm() {
    document.getElementById('adminArticleForm').reset();
    document.getElementById('adminArticleId').value = '';
    document.getElementById('articleFormTitle').innerHTML = '<i class="fas fa-feather-alt"></i> نشر مقال جديد في المدونة';
    document.getElementById('articleFormContainer').style.display = 'block';
}

// 2. إغلاق نموذج إضافة/تعديل المقالات
function closeArticleForm() {
    document.getElementById('articleFormContainer').style.display = 'none';
}

// 3. جلب جميع المقالات الروحية من السيرفر وعرضها في الجدول
async function fetchAdminArticles() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('adminArticlesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px; color:#888;"><i class="fas fa-spinner fa-spin"></i> جاري جلب المقالات الموثقة من السيرفر...</td></tr>';

    try {
        const res = await fetch('/api/articles');
        const articles = await res.json();

        if (!articles || articles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px; color:#888;">📭 لا توجد مقالات منشورة حالياً في واجهة الموقع.</td></tr>';
            return;
        }

        tbody.innerHTML = articles.map(article => {
            const artId = article.id || article._id;
            const artDate = article.date || '—';
            return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px; color: #2c3e50; font-weight: 600;">${article.title}</td>
                    <td style="padding: 12px; color: #64748b;">${artDate}</td>
                    <td style="padding: 12px; text-align: center; display: flex; gap: 8px; justify-content: center;">
                        <button onclick="editArticle('${artId}')" style="background:#3498db; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Cairo';"><i class="fas fa-edit"></i> تعديل</button>
                        <button onclick="deleteArticle('${artId}')" style="background:#e74c3c; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Cairo';"><i class="fas fa-trash-alt"></i> حذف</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px; color:#e74c3c;">❌ فشل الاتصال بقاعدة البيانات السحابية لجلب المقالات.</td></tr>';
    }
}

// 4. دالة حفظ المقال الروحي (إرسال POST للمقال الجديد أو PUT للتعديل)
async function saveArticle(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const id = document.getElementById('adminArticleId').value;
    const title = document.getElementById('adminArticleTitle').value.trim();
    const summary = document.getElementById('adminArticleSummary').value.trim();
    const content = document.getElementById('adminArticleContent').value.trim();

    const url = id ? `/api/articles/${id}` : '/api/articles';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                summary,
                content,
                date: new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })
            })
        });

        const data = await res.json();
        if (data.success || res.ok) {
            showNotification('✅ تم حفظ ونشر المقال الروحي وتوثيقه بنجاح مذهل.');
            closeArticleForm();
            fetchAdminArticles();
        } else {
            showNotification('❌ فشل خادم حفظ المقالات في معالجة الطلب.', 'error');
        }
    } catch (e) {
        console.error(e);
        showNotification('⚠️ حدث خطأ في الاتصال أثناء محاولة مزامنة المقال سحابياً.', 'error');
    }
}

// 5. دالة جلب بيانات المقال المحدد ووضعها في النموذج للتعديل
async function editArticle(id) {
    try {
        const res = await fetch('/api/articles');
        const articles = await res.json();
        const article = articles.find(a => a.id == id || a._id == id);
        
        if (article) {
            document.getElementById('adminArticleId').value = article.id || article._id;
            document.getElementById('adminArticleTitle').value = article.title;
            document.getElementById('adminArticleSummary').value = article.summary || '';
            document.getElementById('adminArticleContent').value = article.content || '';
            document.getElementById('articleFormTitle').innerHTML = '<i class="fas fa-sync-alt"></i> تعديل وتحسين المقال الحالي المختار';
            document.getElementById('articleFormContainer').style.display = 'block';
            window.scrollTo({ top: document.getElementById('articleFormContainer').offsetTop - 30, behavior: 'smooth' });
        }
    } catch (e) {
        console.error(e);
        showNotification('❌ تعذر استحضار بيانات المقال للتهيئة والتعديل.', 'error');
    }
}

// 6. دالة حذف مقال نهائياً من النظام السحابي
async function deleteArticle(id) {
    if (!confirm('⚠️ تنبيه فقهي وإداري: هل أنت متأكد تماماً من رغبتك في حذف هذا المقال نهائياً من واجهة الموقع؟')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/articles/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showNotification('🗑️ تم إزالة المقال بنجاح وتحديث واجهات الموقع تلقائياً.');
            fetchAdminArticles();
        } else {
            showNotification('❌ فشل السيرفر في حذف المقال المقيد.', 'error');
        }
    } catch (e) {
        console.error(e);
        showNotification('⚠️ خطأ اتصال في الشبكة، تعذر معالجة طلب الحذف.', 'error');
    }
}

// ===== 6. جلب وإشراف على آراء وتقييمات المستفيدين =====
async function loadAdminReviews() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> جاري استحضار آراء الحالات من السحابة...</div>';

    try {
        const res = await fetch('/api/admin/reviews', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.reviews.length > 0) {
            container.innerHTML = data.reviews.map(rev => `
                <div style="background:#fff; border:1px solid #e2e8f0; padding:15px; border-radius:12px; margin-bottom:15px; display:flex; justify-content:between; align-items:center; direction:rtl; text-align:right;">
                    <div style="flex:1;">
                        <strong>👤 المستفيد: ${rev.full_name}</strong>
                        <p style="margin:5px 0; color:#4a5a6a;">💬 الرأي الرائد: "${rev.comment}"</p>
                        <small style="color:#a0aec0;">📅 التاريخ: ${new Date(rev.created_at).toLocaleDateString('ar-YE')}</small>
                        <span style="margin-right:15px;">${rev.is_approved ? '🟢 معروض بالموقع' : '🟡 معلق بانتظار موافقتك'}</span>
                    </div>
                    <div style="display:flex; gap:10px;">
                        ${!rev.is_approved ? 
                            `<button onclick="toggleReviewApproval('${rev.id}', true)" style="background:#2ecc71; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-check"></i> موافقة ونشر</button>` :
                            `<button onclick="toggleReviewApproval('${rev.id}', false)" style="background:#f39c12; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-eye-slash"></i> سحب النشر</button>`
                        }
                        <button onclick="deleteReview('${rev.id}')" style="background:#e74c3c; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-family:'Cairo';"><i class="fas fa-trash-alt"></i> حذف</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#718096;">📭 لا توجد آراء أو تقييمات مكتوبة ومسجلة حالياً.</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="text-align:center; color:red; padding:20px;">خطأ أثناء الاتصال بسيرفر الآراء.</div>';
    }
}

async function toggleReviewApproval(id, approve) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/reviews/${id}/approve`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ approve })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ تم تحديث حالة نشر الرأي بنظام الموقع بنجاح.');
            loadAdminReviews();
        }
    } catch (e) {
        showNotification('❌ تعذر إكمال التحديث المالي للرأي.', 'error');
    }
}

async function deleteReview(id) {
    if (!confirm('هل تود حذف هذا الرأي للمستفيد نهائياً من النظام السحابي؟')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showNotification('🗑️ تم مسح الرأي بنجاح تام.');
            loadAdminReviews();
        }
    } catch (e) {
        showNotification('❌ فشل خادم مسح الآراء.');
    }
}

// ===== 7. الإشراف الكامل على محرك الذكاء الاصطناعي السحابي =====
async function loadAiInstructions() {
    const token = localStorage.getItem('token');
    const textarea = document.getElementById('aiInstructionsText');
    if (!textarea) return;

    try {
        const res = await fetch('/api/admin/ai-instructions', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            textarea.value = data.instructions;
        }
    } catch (e) {
        showNotification('❌ فشل جلب التوجيهات الحالية للذكاء الاصطناعي.', 'error');
    }
}

async function saveAiInstructions() {
    const token = localStorage.getItem('token');
    const instructions = document.getElementById('aiInstructionsText').value.trim();

    try {
        const res = await fetch('/api/admin/ai-instructions', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ instructions })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('⚙️ تم ترسيخ وحفظ الأوامر الجديدة لعقل الذكاء الاصطناعي بنجاح مذهل.');
        } else {
            showNotification('❌ فشل إرسال الأوامر للسيرفر.');
        }
    } catch (e) {
        showNotification('⚠️ خطأ اتصال أثناء تحديث توجيهات النظام الروحية.', 'error');
    }
}

// ===== 8. فتح تفاصيل المعالجة الروحية للحالات =====
async function viewDetails(id) {
    selectedRequestId = id;
    const token = localStorage.getItem('token');
    const modal = document.getElementById('detailsModal');
    const mBody = document.getElementById('modalBody');
    if (!modal || !mBody) return;

    mBody.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i> جاري استحضار بيانات المستفيد من قاعدة البيانات...</div>';
    modal.classList.add('show'); 
    modal.style.display = 'flex';

    try {
        const req = currentRequests.find(r => r.id === id) || {};
        const uName = req.fullName || 'مستفيد عابر';
        const uEmail = req.email || 'لا يوجد';
        
        mBody.innerHTML = `
            <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px; border-right:4px solid #f1c40f; text-align: right; direction:rtl;">
                <p style="margin:5px 0;"><strong>👤 اسم المستفيد:</strong> ${uName}</p>
                <p style="margin:5px 0;"><strong>📧 البريد الإلكتروني:</strong> ${uEmail}</p>
                <p style="margin:5px 0;"><strong>🛠 نوع الخدمة المطلوبة:</strong> <span style="background:#2c3e50; color:#fff; padding:2px 8px; border-radius:6px; font-size:0.85rem;">${req.serviceType || 'استشارة'}</span></p>
            </div>

            <div style="margin-bottom:15px; text-align: right; direction:rtl;">
                <strong style="color:#2c3e50; display:block; margin-bottom:5px;"><i class="fas fa-align-right"></i> شرح المشكلة أو الحالة الروحية المعروضة:</strong>
                <div style="background:#fff; border:2px solid #e2e8f0; padding:12px; border-radius:12px; max-height:150px; overflow-y:auto; white-space:pre-wrap; color:#4A5A6A; line-height:1.6;">${req.description || 'لا يوجد وصف.'}</div>
            </div>

            <hr style="margin:20px 0; border:0; border-top:2px dashed #e2e8f0;">

            <div style="margin-bottom:15px; text-align: right; direction:rtl;">
                <label style="font-weight:700; color:#2c3e50;">⏳ خطة سير العمل (الحالة):</label>
                <select id="statusSelect" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; margin-top:5px; font-family:'Cairo';">
                    <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار والمراجعة الأولية</option>
                    <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>⚙️ قيد العلاج والمتابعة الروحية</option>
                    <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>✅ تم الانتهاء وإرسال الخطة العلاجية</option>
                    <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>❌ طلب مستبعد</option>
                </select>
            </div>

            <div style="margin-bottom:15px; text-align: right; direction:rtl;">
                <label style="font-weight:700; color:#2c3e50;">🌿 البرنامج العلاجي والرد الروحي (الروشتة الشرعية):</label>
                <div style="display: flex; gap: 5px; align-items: center; margin-bottom: 5px;">
                    <button type="button" onclick="startAdminDictation(this)" style="background:#e67e22; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-family:'Cairo';">
                        <i class="fas fa-microphone"></i> إملاء البرنامج صوتاً
                    </button>
                </div>
                <textarea id="replyText" rows="5" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-family:'Cairo';" placeholder="اكتب الآيات والأذكار المخصصة للمريض...">${req.treatmentDetails || ''}</textarea>
            </div>

            <div style="text-align:left; margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                <button onclick="closeModal()" style="background:#95a5a6; color:#fff; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-family:'Cairo';">إلغاء</button>
                <button onclick="saveChanges()" style="background:#27ae60; color:#fff; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-family:'Cairo';">💾 حفظ البيانات وإرسال العلاج</button>
            </div>
        `;
    } catch (e) {
        mBody.innerHTML = '<div style="text-align:center; color:#e74c3c; padding:20px;">حدث خطأ أثناء الاتصال بقاعدة البيانات.</div>';
    }
}

// ===== 9. إرسال التغييرات وحفظها سحابياً =====
async function saveChanges() {
    const token = localStorage.getItem('token');
    const status = document.getElementById('statusSelect').value;
    const treatmentDetails = document.getElementById('replyText').value.trim();
    
    try {
        const res = await fetch(`/api/admin/requests/${selectedRequestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, treatmentDetails })
        });
        
        if (res.ok) {
            showNotification('✅ تم تدوين خطتك العلاجية وحفظ حالة المستفيد سحابياً بنجاح.', 'success');
            closeModal();
            loadRequests();
        } else {
            showNotification('❌ فشل السيرفر في حفظ التعديلات على ملف المستفيد.', 'error');
        }
    } catch (e) {
        showNotification('⚠️ حدث خطأ اتصال أثناء تحديث الخطة العلاجية سحابياً.', 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// دالة تصفية وفرز الطلبات من خلال شريط البحث المطور
function filterTable() {
    const input = document.getElementById('searchInput');
    const filter = input.value.toLowerCase();
    const table = document.getElementById('requestsTable');
    if (!table) return;
    const tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let tdName = tr[i].getElementsByTagName('td')[1];
        let tdEmail = tr[i].getElementsByTagName('td')[2];
        if (tdName || tdEmail) {
            let txtValueName = tdName.textContent || tdName.innerText;
            let txtValueEmail = tdEmail.textContent || tdEmail.innerText;
            if (txtValueName.toLowerCase().indexOf(filter) > -1 || txtValueEmail.toLowerCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

// ===== 10. الساعة التلقائية المحدثة لضبط الوقت باللوحة =====
function updateClock() {
    const clockEl = document.getElementById('currentTime');
    if(clockEl) {
        clockEl.innerText = new Date().toLocaleString('ar-YE', { hour12: true, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}
setInterval(updateClock, 1000);

// ===== 11. إقلاع اللوحة والبدء المباشر فور تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html';
    } else {
        switchTab('requests');
    }
});
