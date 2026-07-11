// =================================================================
// ملف النواة البرمجية المطور والشامل - لوحة تحكم فضيلة الشيخ بسام الشميري
// =================================================================

let currentRequests = [];
let selectedRequestId = null;
let currentFilterStatus = 'all'; // حالة التصفية الافتراضية للجدول

// مصفوفة المقالات الروحية الافتراضية المستخرجة من البيانات المزودة
let defaultArticles = [
    {
        "id": 1,
        "title": "الفرق بين شفاء الروح والنفس: رحلة العودة إلى الله والتوازن الداخلي",
        "summary": "نستخدم مصطلحي 'شفاء الروح' و'شفاء النفس' وكأنهما أمر واحد، لكن لكل منهما مسار مختلف للتعافي يلتقيان في صلتنا بالله.",
        "content": "في غمار الحياة وضغوطها، غالباً ما نستخدم مصطلحي 'شفاء الروح' و'شفاء النفس' كأنهما أمر واحد. ولكن في حقيقة الأمر، يمثل كل منهما مساراً مختلفاً للتعافي، يلتقيان معاً في نقطة جوهرية واحدة: مدى عمق وصحة صلتنا بالله سبحانه وتعالى. فالإنسان كائن متكامل، لا يمكنه تذوق طعم السلام الداخلي ما لم يفهم احتياجات نفسه، ويزكي روحه بالتقرب من خالقها.\n\nفما هو الفرق الجوهري بين شفاء النفس والروح من منظور إيماني؟ وكيف تكون العلاقة بالله هي المفتاح الحقيقي لشفائهما؟\n\nأولاً: شفاء النفس (الجهاد، التزكية، والاستقرار العاطفي)\nالنفس هي وعاء العقل، والمشاعر، والرغبات، والذكريات. هي الجزء البشري الذي يتأثر بصدمات الحياة، ويتعرض للضعف، والخطأ، والتقلب، وهي التي وصفها القرآن الكريم بأحوال ثلاث (الأمّارة بالسوء، اللوّامة، والمطمئنة).\nأعراض تعب النفس: القلق، التوتر، الاكتئاب، الخوف من المستقبل، وتراكم الأحقاد أو الشعور بالذنب.\nالشفاء من خلال العلاقة بالله: يبدأ شفاء النفس من التسليم لله وتفويض الأمور إليه (التحرر من وهم السيطرة الكاملة). يتطلب الشفاء هنا جهد الإرادة عبر 'التزكية'، ومواجهة الصدمات بالرضا بالقضاء والقدر، واستبدال الأفكار السلبية بحسن الظن بالله. الصلاة والدعاء في هذا المقام هما تفريغ للشحنات الانفعالية، واعتراف بالضعف البشري بين يدي القوي المتين، مما يمنح النفس الطمأنينة.\n\nثانياً: شفاء الروح (الاتصال بالخالق والارتقاء بالوعي)\nالروح هي النفخة الإلهية النيرة والسر الخفي في هذا الجسد (وَنَفَخْتُ فِيهِ مِن رُّوحِي). الروح لا تمرض بالمعنى المادي، ولكنها تختنق وتُحجب إذا انقطعت عن مصدرها. غذاء الروح وسعادتها لا يكمنان في ملذات الدنيا، بل في الاتصال المباشر بالله.\nأعراض تعب الروح: الشعور بالخواء الوجودي، انعدام المعنى من الحياة، القسوة، والشعور بالانفصال التام عن الله.\nالشفاء من خلال العلاقة بالله: : يحدث هذا الشفاء بالذكر الخالص الذي يتجاوز حركة اللسان إلى حضور القلب (أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ)، وبالخلوة مع الله، ومناجاته في جوف الليل، وتدبر كلامه (القرآن). الشفاء الروحي يعيد تعريف علاقتك بالله من مجرد أداء حركات وواجبات، إلى صلة حب، وافتقار، وإدراك لغاية وجودك الأسمى.\n\nكيف يلتقي الشفاءان في رحاب القرب من الله?\nالشفاء الحقيقي عبارة عن دائرة متكاملة، يغذي فيها الإيمان الروحي استقرار النفس، ويعين فيها استقرار النفس على جودة العبادة:\nحين تقترب من الله بالروح: يفيض نور هذا القرب على نفسك, فتهون عندك مصائب الدنيا، وتتحجم الصدمات والمخاوف؛ لأنك تأوي إلى ركن شديد.\nحين تداوي جراح نفسك: (بالعلاج، أو التفكير السليم، أو التسامح)، تكسر القيود والأغلال التي كانت تمنع روحك من التحليق في آفاق الخشوع والتدبر.\n\nخلاصة القول:\nشفاء النفس هو تحريرها من جراح الدنيا بالتسليم والرضا، وشفاء الروح هو إيقاظها لتستمد نورها من رب العالمين. لن تجد النفس مستقرها، ولن تجد الروح مستودعها، إلا في عتبات العبودية الحقة لله. ابدأ اليوم بتجديد صلتك بخالقك، واجعل من صلاتك، وذكرك، وتفويضك لأمرك بوابتك الكبرى نحو تعافٍ شامل وجسد يملؤه السلام.",
        "date": "2026-06-28",
        "icon": "fa-solid fa-heart"
    },
    {
        "id": 2,
        "title": "أسرار خفية: سر التسبيح في الساعات الذهبية من اليوم والليلة",
        "summary": "في زحام الحياة اليومية وضجيجها المتواصل، جعل الله في كل يوم وليلة بوابات زمنية خاصة تفيض بالرحمات، فما هي هذه الساعات الذهبية؟",
        "content": "في زحام الحياة اليومية وضجيجها المتواصل، تتشتت عقولنا وتنهك نفوسنا، ونظل نبحث عن واحة للسلام والأمان الروحي. لكن المفاجأة هي أن الله سبحانه وتعالى قد جعل لنا في كل يوم وليلة 'بوابات زمنية' خاصة، تفيض بالرحمات والسكينة، وتُفتح فيها أبواب الإجابة بشكل فريد. هذه الأوقات ليست مجرد ساعات عادية، بل هي الساعات الذهبية التي يقترن فيها الذكر والتسبيح بأعظم تجليات العافية النفسية والروحية.\n\nفما هي هذه الساعات الذهبية؟ وما هو السر الكامن وراء التسبيح فيها تحديداً؟\n\nالبوابات الزمنية الثلاث: متى تكون الساعات الذهبية؟\nالقرآن الكريم والسنة النبوية وجها الأنظار بدقة شديدة نحو أوقات محددة يتضاعف فيها أثر الذكر، وأبرزها ثلاثة أوقات:\nساعة السَّحَر (ثلث الليل الأخير): وقت النزول الإلهي, حيث الهدوء التام والكون الساكن.\nساعة البكور (ما بعد الفجر حتى الشروق): وقت توزيع الأرزاق وانطلاق البركة في الأرض.\nساعة الأصيل (ما قبل الغروب): وقت تبدل الملائكة وانطواء النهار، وحيث تميل النفس للهدوء بعد عناء العمل.\nوقد لخص القرآن الكريم هذه الأوقات في آية جامعة تدل على عظم سرها: (وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا وَمِنْ آنَاءِ اللَّيْلِ فَسَبِّحْ وَأَطْرَافَ النَّهَارِ لَعَلَّكَ تَرْضَى).\n\nسر اختيار 'التسبيح' في هذه الأوقات بالذات\nالتسبيح هو قول 'سبحان الله وبحمده'، وهو يعني تنزيه الله عن كل نقص، والاعتراف بكماله وجلاله. وفي الساعات الذهبية، يحمل التسبيح أسراراً مذهلة:\nالتناغم مع الكون: في وقتي الفجر والغروب، تسبح الكائنات كلها، من طيور وشجر ودواب، بلغاتها التي لا نفقهها. عندما تسبح في هذه الأوقات، فإنك تُدخل روحك في 'سيمفونية كونية' من العبودية، فتتحرر من عزلتك الأرضية وتشعر بأنك جزء من منظومة نورانية كبرى.\nسرادق الأمان والرضا النفسي: ختم الله آية التسبيح السابقة بعبارة لافتة جداً: (لَعَلَّكَ تَرْضَى). هذا هو السر النفسي الأكبر؛ التسبيح في هذه الساعات يفرغ الشحنات السلبية، ويزيل القلق والتوتر، وينزل في القلب 'الرضا العارم' بالمقسوم، وكأن التسبيح يعيد ترتيب فوضى مشاعرك الداخلية.\nالاستمداد والتحصين: التسبيح في البكور يمدك بـ 'الوقود الروحي' الذي تحتاجه لمواجهة مشاق يومك، والتسبيح في الأصيل يغسل عنك كدر ما واجهته خلال النهار، أما تسبيح السحر فهو النور الذي يضيء عتمة صدرك.\n\nكيف تستثمر هذه الساعات الذهبية عملياً؟\nالاستفادة من هذه الأوقات لا تتطلب تفريغ ساعات طويلة، بل تتطلب حضور القلب الاستثنائي من خلال خطوات بسيطة:\nاحرص على 'جلسة الشروق' ولو لـ 15 دقيقة: بعد صلاة الفجر، اجلس مكاناً هادئاً، وتأمل خروج النور، وسبّح بقلب حاضر؛ ستجد بركة غريبة في وقتك وصحتك طوال اليوم.\nاستغل وقت العودة من العمل (الأصيل): بدلاً من الانشغال بالهاتف أو الضيق من زحام السير قبل الغروب، اجعل لسانك رطباً بالتسبيح والاستغفار، وراقب كيف يتبدد تعب يومك.\nاستيقظ قبل الفجر بـ 20 دقيقة فقط: انطرح بين يدي الله، وسبحه واستغفره في وقت السحر؛ فالاستغفار والتسبيح هنا لهما مذاق لا يعرفه إلا من تذوقه.\n\nخلاصة القول:\nالساعات الذهبية هي هدايا ربانية مجانية، تمنحنا فرصة يومية لإعادة ضبط المصنع لنفوسنا وأرواحنا. التسبيح فيها ليس مجرد كلمات نرددها، بل هو حبل متين يربطنا بالخالق في أرقى تجليات القرب. اجعل لنفسك حظاً من هذه الساعات، وراقب كيف ستتحول حياتك من الشتات والضيق, إلى الرضا والسكينة والبركة الشاملة.",
        "date": "2026-06-25",
        "icon": "fa-solid fa-clock"
    }
];

// ===== 1. محرك الإشعارات السريعة لراحة البال =====
function showNotification(msg, type = 'success') {
    const notifEl = document.getElementById('notification');
    if (notifEl) {
        notifEl.innerText = msg;
        notifEl.className = `notification ${type} show`;
        setTimeout(() => {
            notifEl.classList.remove('show');
        }, 4000);
    } else {
        alert(msg); 
    }
}

// ===== دالة الإملاء الصوتي الاختيارية للشيخ بسام للرد المباشر =====
function startAdminDictation(btnElement, targetInputId) {
    if (!('webkitSpeechRecognition' in window)) {
        showNotification('⚠️ متصفحك لا يدعم ميزة الإملاء الصوتي على هذا المتصفح.', 'error');
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    const inputField = document.getElementById(targetInputId);

    if (!inputField) {
        showNotification('⚠️ لم يتم العثور على حقل الإدخال المطلوب.', 'error');
        return;
    }

    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاستماع صوتاً...';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        inputField.value += (inputField.value ? ' ' : '') + transcript;
        btnElement.innerHTML = originalHTML;
    };

    recognition.onerror = function() {
        btnElement.innerHTML = originalHTML;
        showNotification('❌ لم يتم التقاط الصوت، يرجى المحاولة ثانية.', 'error');
    };

    recognition.start();
}

// ===== 2. نظام التبديل الذكي والمباشر بين التبويبات (Tabs Switcher) =====
function switchTab(tabName) {
    const sections = ['requestsSection', 'articlesSection', 'reviewsSection', 'aiSection'];
    sections.forEach(sec => {
        const el = document.getElementById(sec);
        if (el) el.style.display = 'none';
    });

    const navButtons = document.querySelectorAll('.sidebar-menu li, .sidebar-menu a');
    navButtons.forEach(btn => btn.classList.remove('active'));

    const activeNav = document.getElementById(`nav${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activeNav) activeNav.classList.add('active');

    const activeSection = document.getElementById(`${tabName}Section`);
    if (activeSection) activeSection.style.display = 'block';

    if (tabName === 'requests') loadRequests();
    if (tabName === 'articles') fetchAdminArticles();
    if (tabName === 'reviews') loadAdminReviews();
    if (tabName === 'ai') loadAiInstructions();
}

// ===== 2.5 نظام فلترة الطلبات علوياً (Filter Engine) =====
function filterRequests(status) {
    currentFilterStatus = status;
    
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById(`filterBtn-${status}`);
    if (activeBtn) activeBtn.classList.add('active');

    if (status === 'all') {
        renderTable(currentRequests);
    } else if (status === 'pending') {
        renderTable(currentRequests.filter(r => r.status === 'pending'));
    } else if (status === 'payment_submitted') {
        renderTable(currentRequests.filter(r => r.status === 'payment_submitted'));
    } else if (status === 'processing') {
        renderTable(currentRequests.filter(r => r.status === 'processing' || r.status === 'completed'));
    } else if (status === 'closed') {
        renderTable(currentRequests.filter(r => r.status === 'closed' || r.status === 'rejected_by_admin'));
    }
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
        filterRequests(currentFilterStatus); 
        updateStats(currentRequests);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#e74c3c;">خطأ في جلب البيانات السحابية. تأكد من صلاحية الدخول.</td></tr>';
    }
}

// ===== 4. رندرة وعرض جدول الطلبات الفخم مع مؤشرات المبيعات والحالة المحدثة =====
function renderTable(requests) {
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#6A7A8A;">📭 لا توجد طلبات تطابق هذا التصنيف حالياً.</td></tr>';
        return;
    }
    
    const statusMap = {
        'pending': '<span class="status-badge" style="background:#f39c12; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-clock"></i> انتظار التشخيص</span>',
        'accepted_waiting_payment': '<span class="status-badge" style="background:#34495e; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-hourglass-half"></i> بانتظار الدفع والتأكيد</span>',
        'payment_submitted': '<span class="status-badge" style="background:#9b59b6; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-money-check-alt"></i> مراجعة الحوالة</span>',
        'payment_rejected': '<span class="status-badge" style="background:#d35400; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-exclamation-triangle"></i> حوالة مرفوضة</span>',
        'processing': '<span class="status-badge" style="background:#3498db; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> قيد صياغة العلاج</span>',
        'completed': '<span class="status-badge" style="background:#2ecc71; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-check-circle"></i> قيد العلاج والمتابعة</span>',
        'rejected_by_admin': '<span class="status-badge" style="background:#c0392b; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-times-circle"></i> اعتذار وإغلاق مباشر</span>',
        'closed': '<span class="status-badge" style="background:#7f8c8d; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.85rem;"><i class="fas fa-lock"></i> مغلق ومكتمل</span>'
    };
    
    tbody.innerHTML = requests.map((req, index) => {
        const uName = req.fullName || 'مستفيد غير مسجل';
        const uEmail = req.email || '—';
        const idToUse = req.id;
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE', {year: 'numeric', month: 'short', day: 'numeric'}) : '—';
        
        const paidAmount = parseFloat(req.totalPaidAmount) || 0;
        const financeBadge = paidAmount > 0 ? `<span style="color:#2ecc71; font-weight:700;">💰 ${paidAmount} ريال</span>` : `<span style="color:#7f8c8d; font-weight:700;">🟡 غير ملزم</span>`;

        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong style="color: #2C3E50; cursor:pointer; text-decoration:underline;" onclick="viewDetails('${idToUse}')">👤 ${uName}</strong></td>
                <td style="color:#4A5A6A;">${uEmail}</td>
                <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:8px; font-size:0.9rem; color:#2C3E50;">${req.serviceType || 'استشارة عامة'}</span></td>
                <td>${statusMap[req.status] || '<span class="status-badge" style="background:#f39c12; color:#fff; padding:4px 8px; border-radius:6px;">قيد الانتظار</span>'}</td>
                <td>${financeBadge}</td>
                <td style="font-size:0.85rem; color:#6A7A8A;">${date}</td>
                <td>
                    <button class="action-btn edit" onclick="viewDetails('${idToUse}')" style="background:#3498db; color:#fff; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">
                        <i class="fas fa-folder-open"></i> إدارة ومراجعة الحالات
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
    document.getElementById('completedCount').innerText = requests.filter(r => r.status === 'processing' || r.status === 'completed').length;
    document.getElementById('rejectedCount').innerText = requests.filter(r => r.status === 'payment_submitted').length;
}

// [تختصر هنا دوال المقالات والآراء لوضوح الملف والتركيز الكامل على التعديل الحركي]
async function fetchAdminArticles() { renderDefaultArticlesFallback(); }
function renderDefaultArticlesFallback() { }
function openNewArticleForm() { }
function closeArticleForm() { }
async function saveArticle(e) { e.preventDefault(); }
function editArticle(id) {}
function deleteArticle(id) {}
async function loadAdminReviews() {}
async function toggleReviewApproval(id, approve) {}
async function deleteReview(id) {}
async function loadAiInstructions() {}
async function saveAiInstructions() {}

// ===== 8. فتح تفاصيل المعالجة الروحية للحالات ودعم نظام الأزرار الفائقة الحية =====
async function viewDetails(id) {
    selectedRequestId = id;
    const token = localStorage.getItem('token');
    const modal = document.getElementById('detailsModal');
    const mBody = document.getElementById('modalBody');
    if (!modal || !mBody) return;

    mBody.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i> جاري استحضار ملف المستفيد الفقهي...</div>';
    modal.classList.add('show'); 
    modal.style.display = 'flex';

    try {
        const req = currentRequests.find(r => r.id == id) || {};
        const uName = req.fullName || 'مستفيد عابر';
        const uEmail = req.email || 'لا يوجد';
        
        const messagesRes = await fetch(`/api/requests/${id}/messages`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messagesData = await messagesRes.json();
        const chatLogs = messagesData.success ? messagesData.messages : [];

        let htmlContent = `
            <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px; border-right:4px solid #f1c40f; text-align: right; direction:rtl;">
                <p style="margin:5px 0;"><strong>👤 اسم المستفيد:</strong> ${uName}</p>
                <p style="margin:5px 0;"><strong>📧 البريد الإلكتروني:</strong> ${uEmail}</p>
                <p style="margin:5px 0;"><strong>🛠 نوع الخدمة المطلوبة:</strong> <span style="background:#2c3e50; color:#fff; padding:2px 8px; border-radius:6px; font-size:0.85rem;">${req.serviceType || 'استشارة'}</span></p>
                <p style="margin:5px 0;"><strong>📌 حالة الطلب الحالية:</strong> <span style="color:#d35400; font-weight:bold;">${req.status}</span></p>
            </div>

            <div style="margin-bottom:15px; text-align: right; direction:rtl;">
                <strong style="color:#2c3e50; display:block; margin-bottom:5px;"><i class="fas fa-align-right"></i> المشكلة أو الأعراض المرفوعة للتشخيص:</strong>
                <div style="background:#fff; border:2px solid #e2e8f0; padding:12px; border-radius:12px; max-height:150px; overflow-y:auto; white-space:pre-wrap; color:#4A5A6A; line-height:1.6;">${req.description || 'لا يوجد وصف.'}</div>
            </div>
        `;

        // 🌟 الابتكار الجديد: إدارة مرحلة "انتظار التشخيص" الأولى لقبول أو رفض الحالة مباشرة دون إلزام المستفيد
        if (req.status === 'pending') {
            htmlContent += `
                <div style="background:#fff3cd; border:1px solid #ffeeba; padding:15px; border-radius:12px; margin-bottom:15px; text-align: right; direction:rtl;">
                    <h4 style="color:#856404; margin-top:0;"><i class="fas fa-gavel"></i> مرحلة الفرز والتشخيص الأولي للملف:</h4>
                    <p style="font-size:0.9rem; color:#856404; margin-bottom:10px;">بصفتك المشرف العام، هل تقبل استقبال وعلاج هذه الحالة روحيًا لمواصلة بقية الإجراءات، أم تود الاعتذار عنها وإغلاقها فوراً؟</p>
                    <div style="display:flex; gap:10px;">
                        <button onclick="acceptCaseFirst('${req.id}')" style="background:#2ecc71; color:#fff; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-user-check"></i> 🟢 قبول استقبال الحالة والمواصلة</button>
                        <button onclick="rejectCaseFirst('${req.id}')" style="background:#e74c3c; color:#fff; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-user-slash"></i> 🔴 رفض استقبال الحالة وإغلاق الملف</button>
                    </div>
                </div>
            `;
        }

        // جزء التحقق المالي في حال الانتقال لمرحلة الدفع ورفع الحوالة
        if (req.status === 'payment_submitted') {
            htmlContent += `
                <div style="background:#f0f4f8; border:1px dashed #9b59b6; padding:15px; border-radius:12px; margin-bottom:15px; text-align: right; direction:rtl;">
                    <h4 style="color:#9b59b6; margin-top:0;"><i class="fas fa-wallet"></i> تفاصيل الحوالة المالية المستلمة (100 ريال كشفية):</h4>
                    <p style="margin:4px 0;"><strong>اسم محول الأموال:</strong> ${req.paymentSenderName || '—'}</p>
                    <p style="margin:4px 0;"><strong>رقم المرجع / الحوالة:</strong> ${req.paymentTransferNumber || '—'}</p>
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <button onclick="approvePaymentDirect('${req.id}')" style="background:#2ecc71; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-check-circle"></i> 🟢 اعتماد الحوالة وتأكيد المستلم</button>
                        <button onclick="rejectPaymentDirect('${req.id}')" style="background:#e67e22; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-times-circle"></i> 🔴 رفض الحوالة وإعادة الطلب للبانتظار</button>
                    </div>
                </div>
            `;
        }

        // إدراج سجل الحوار التاريخي
        htmlContent += `
            <div style="margin-bottom:15px; text-align: right; direction:rtl;">
                <strong style="color:#2c3e50; display:block; margin-bottom:5px;"><i class="fas fa-comments"></i> سجل الحوار والمراجعات التاريخي:</strong>
                <div id="chatLogContainer" style="background:#fff; border:2px solid #e2e8f0; padding:15px; border-radius:12px; height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
                    ${chatLogs.map(msg => {
                        const isAdmin = msg.senderRole === 'admin';
                        const align = isAdmin ? 'left' : 'right';
                        const bg = isAdmin ? '#e1ffc7' : '#f1f5f9';
                        return `
                            <div style="align-self: ${isAdmin ? 'flex-start' : 'flex-end'}; max-width:75%; background:${bg}; padding:10px; border-radius:10px; text-align:right; direction:rtl;">
                                <small style="color:#7f8c8d; font-size:0.75rem; display:block;">${msg.senderName} (${isAdmin ? 'الشيخ' : 'المستفيد'})</small>
                                <span style="font-size:0.95rem; color:#2c3e50; white-space:pre-wrap;">${msg.messageText}</span>
                            </div>
                        `;
                    }).join('') || '<p style="text-align:center; color:#a0aec0; padding-top:40px;">لا توجد رسائل متبادلة داخل ملف المتابعة بعد.</p>'}
                </div>
            </div>
        `;

        // نموذج المعالجة المباشر
        htmlContent += `
            <div style="text-align: right; direction:rtl; background:#fff; border:1px solid #cbd5e1; padding:15px; border-radius:12px;">
                <strong style="color:#2c3e50; display:block; margin-bottom:8px;"><i class="fas fa-pencil-alt"></i> محراب صياغة الخطة العلاجية والرد الفقهي:</strong>
                <textarea id="replyText" placeholder="اكتب الخطة الروحية، الأذكار، البرامج، أو الرد المباشر للمستفيد هنا..." style="width:100%; height:80px; border:1px solid #cbd5e1; border-radius:8px; padding:10px; font-family:'Cairo'; font-size:0.95rem; box-sizing:border-box; resize:vertical;"></textarea>
                
                <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <button type="button" onclick="startAdminDictation(this, 'replyText')" style="background:#95a5a6; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Cairo';">
                        <i class="fas fa-microphone"></i> إملاء البرنامج صوتاً
                    </button>
                    <label style="font-size:0.9rem; color:#475569;">مدة العلاج (يوم): 
                        <input type="number" id="treatmentDuration" value="${req.treatmentDurationDays || 7}" style="width:60px; padding:5px; border-radius:6px; border:1px solid #cbd5e1; text-align:center;">
                    </label>
                </div>

                <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-start;">
                    <button onclick="submitTreatmentPlan('${req.id}')" style="background:#2ecc71; color:#fff; border:none; padding:10px 18px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-paper-plane"></i> إرسال الخطة واعتماد قيد العلاج</button>
                    <button onclick="sendChatMessageOnly('${req.id}')" style="background:#3498db; color:#fff; border:none; padding:10px 18px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';"><i class="fas fa-reply"></i> إرسال رد حواري فقط</button>
                    <button onclick="toggleMessageLock('${req.id}', ${!req.isMessageLocked})" style="background:${req.isMessageLocked ? '#27ae60' : '#e74c3c'}; color:#fff; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:'Cairo';">
                        <i class="fas ${req.isMessageLocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${req.isMessageLocked ? '🔓 تفعيل المراسلة' : '🔒 تجميد مؤقت'}
                    </button>
                </div>
            </div>
        `;

        mBody.innerHTML = htmlContent;
        const chatContainer = document.getElementById('chatLogContainer');
        if(chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (e) {
        console.error(e);
        mBody.innerHTML = '<div style="text-align:center; color:red; padding:20px;">خطأ حرج في تهيئة وبناء واجهة معالجة الحالات السحابية.</div>';
    }
}

function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    selectedRequestId = null;
}

// ===== 10. العمليات المالية والتشخيصية المباشرة (أفعال الأزرار المدمجة الفائقة) =====

// 🌟 1. دالة قبول الحالة المبدئي لنقلها إلى بانتظار الدفع والتأكيد
async function acceptCaseFirst(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/requests/${id}/accept-initial`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showNotification('🟢 تم قبول استقبال الحالة بنجاح. تم نقلها إلى طور "بانتظار الدفع والتأكيد" والمستفيد ملزم الآن برفع الحوالة للبدء.');
            loadRequests();
            viewDetails(id);
        }
    } catch (e) {
        showNotification('❌ فشل إرسال أمر قبول الحالة للسيرفر.', 'error');
    }
}

// 🌟 2. دالة رفض استقبال الحالة نهائياً وإغلاقها فوراً بلا أي التزام مالي
async function rejectCaseFirst(id) {
    const reason = prompt('فضلاً اكتب سبب الاعتذار والرفض المباشر للحالة (سيصل للمستفيد بوضوح):');
    if (reason === null) return; // إلغاء الضغط
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/requests/${id}/reject-initial`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: reason || 'تم الاعتذار عن استقبال الحالة لعدم الاختصاص الروحي.' })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('🔴 تم رفض استقبال ملف الحالة واعتذر السيرفر عنها بنجاح. أغلقت الاستشارة تماماً والمستفيد غير ملزم بأي إجراءات.', 'error');
            loadRequests();
            closeDetailsModal();
        }
    } catch (e) {
        showNotification('❌ فشل إرسال أمر رفض وإغلاق الحالة.', 'error');
    }
}

async function approvePaymentDirect(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/requests/${id}/approve-payment`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showNotification(data.message);
            loadRequests();
            viewDetails(id);
        }
    } catch (e) {
        showNotification('❌ فشل خادم معالجة وتأكيد الاعتماد المالي.', 'error');
    }
}

async function rejectPaymentDirect(id) {
    const reason = prompt('يرجى إدخال سبب رفض هذه الحوالة المالية بوضوح:');
    if (!reason) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/requests/${id}/reject-payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(data.message, 'error');
            loadRequests();
            closeDetailsModal();
        }
    } catch (e) {
        showNotification('❌ تعذر إرسال قرار الرفض المالي.', 'error');
    }
}

async function submitTreatmentPlan(id) {
    const token = localStorage.getItem('token');
    const treatmentPlan = document.getElementById('replyText').value.trim();
    const durationDays = document.getElementById('treatmentDuration').value;

    if (!treatmentPlan) {
        showNotification('⚠️ يرجى صياغة الخطة العلاجية أو الأذكار أولاً.', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/admin/requests/${id}/complete-treatment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ treatmentPlan, durationDays, additionalCost: 0 })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('✅ تم إرسال الخطة العلاجية بنجاح ونقل الحالة إلى طور "قيد العلاج والمتابعة".');
            loadRequests();
            closeDetailsModal();
        }
    } catch (e) {
        showNotification('❌ فشل السيرفر السحابي في تسجيل وحفظ الخطة العلاجية.', 'error');
    }
}

async function sendChatMessageOnly(id) {
    const token = localStorage.getItem('token');
    const messageText = document.getElementById('replyText').value.trim();
    if (!messageText) return;
    try {
        const res = await fetch(`/api/admin/requests/${id}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ messageText })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('replyText').value = '';
            viewDetails(id); 
        }
    } catch (e) {
        showNotification('❌ تعذر إرسال الرسالة إلى صندوق حوار المستفيد.', 'error');
    }
}

async function toggleMessageLock(id, lockValue) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/requests/${id}/lock-messages`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ lock: lockValue })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(lockValue ? '🔒 تم تجميد وقفل صندوق الحوار مؤقتاً.' : '🔓 تم فتح صلاحية المراسلة الفورية للمستفيد.');
            loadRequests();
            viewDetails(id);
        }
    } catch (e) {
        showNotification('❌ فشل تعديل حالة قفل المراسلات.', 'error');
    }
}

async function deleteRequest(id) {
    if(!confirm('هل أنت متأكد من رغبتك في حذف ملف هذا المستفيد نهائياً من السيرفر السحابي؟')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/requests/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showNotification('🗑️ تم حذف الملف بالكامل وتصفية السجلات السحابية.');
            loadRequests();
        }
    } catch(e) {
        showNotification('❌ تعذر إتمام عملية حذف الملف من الخادم.', 'error');
    }
}
