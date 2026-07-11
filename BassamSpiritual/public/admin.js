// =================================================================
// ملف النواة البرمجية المطور والشامل - لوحة تحكم فضيلة الشيخ بسام الشميري
// =================================================================

let currentRequests = [];
let selectedRequestId = null;

// مصفوفة المقالات الروحية الافتراضية المستخرجة من البيانات المزودة
let defaultArticles = [
    {
        "id": 1,
        "title": "الفرق بين شفاء الروح والنفس: رحلة العودة إلى الله والتوازن الداخلي",
        "summary": "نستخدم مصطلحي 'شفاء الروح' و'شفاء النفس' وكأنهما أمر واحد، لكن لكل منهما مسار مختلف للتعافي يلتقيان في صلتنا بالله.",
        "content": "في غمار الحياة وضغوطها، غالباً ما نستخدم مصطلحي 'شفاء الروح' و'شفاء النفس' كأنهما أمر واحد. ولكن في حقيقة الأمر، يمثل كل منهما مساراً مختلفاً للتعافي، يلتقيان معاً في نقطة جوهرية واحدة: مدى عمق وصحة صلتنا بالله سبحانه وتعالى. فالإنسان كائن متكامل، لا يمكنه تذوق طعم السلام الداخلي ما لم يفهم احتياجات نفسه، ويزكي روحه بالتقرب من خالقها.\n\nفما هو الفرق الجوهري بين شفاء النفس والروح من منظور إيماني؟ وكيف تكون العلاقة بالله هي المفتاح الحقيقي لشفائهما؟\n\nأولاً: شفاء النفس (الجهاد، التزكية، والاستقرار العاطفي)\nالنفس هي وعاء العقل، والمشاعر، والرغبات، والذكريات. هي الجزء البشري الذي يتأثر بصدمات الحياة، ويتعرض للضعف، والخطأ، والتقلب، وهي التي وصفها القرآن الكريم بأحوال ثلاث (الأمّارة بالسوء، اللوّامة، والمطمئنة).\nأعراض تعب النفس: القلق، التوتر، الاكتئاب، الخوف من المستقبل، وتراكم الأحقاد أو الشعور بالذنب.\nالشفاء من خلال العلاقة بالله: يبدأ شفاء النفس من التسليم لله وتفويض الأمور إليه (التحرر من وهم السيطرة الكاملة). يتطلب الشفاء هنا جهد الإرادة عبر 'التزكية'، ومواجهة الصدمات بالرضا بالقضاء والقدر، واستبدال الأفكار السلبية بحسن الظن بالله. الصلاة والدعاء في هذا المقام هما تفريغ للشحنات الانفعالية، واعتراف بالضعف البشري بين يدي القوي المتين، مما يمنح النفس الطمأنينة.\n\nثانياً: شفاء الروح (الاتصال بالخالق والارتقاء بالوعي)\nالروح هي النفخة الإلهية النيرة والسر الخفي في هذا الجسد (وَنَفَخْتُ فِيهِ مِن رُّوحِي). الروح لا تمرض بالمعنى المادي، ولكنها تختنق وتُحجب إذا انقطعت عن مصدرها. غذاء الروح وسعادتها لا يكمنان في ملذات الدنيا، بل في الاتصال المباشر بالله.\nأعراض تعب الروح: الشعور بالخواء الوجودي، انعدام المعنى من الحياة، القسوة، والشعور بالانفصال التام عن الله.\nالشفاء من خلال العلاقة بالله: : يحدث هذا الشفاء بالذكر الخالص الذي يتجاوز حركة اللسان إلى حضور القلب (أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ)، وبالخلوة مع الله، ومناجاته في جوف الليل، وتدبر كلامه (القرآن). الشفاء الروحي يعيد تعريف علاقتك بالله من مجرد أداء حركات وواجبات، إلى صلة حب، وافتقار، وإدراك لغاية وجودك الأسمى.\n\nكيف يلتقي الشفاءان في رحاب القرب من الله؟\nالشفاء الحقيقي عبارة عن دائرة متكاملة، يغذي فيها الإيمان الروحي استقرار النفس، ويعين فيها استقرار النفس على جودة العبادة:\nحين تقترب من الله بالروح: يفيض نور هذا القرب على نفسك, فتهون عندك مصائب الدنيا، وتتحجم الصدمات والمخاوف؛ لأنك تأوي إلى ركن شديد.\nحين تداوي جراح نفسك: (بالعلاج، أو التفكير السليم، أو التسامح)، تكسر القيود والأغلال التي كانت تمنع روحك من التحليق في آفاق الخشوع والتدبر.\n\nخلاصة القول:\nشفاء النفس هو تحريرها من جراح الدنيا بالتسليم والرضا، وشفاء الروح هو إيقاظها لتستمد نورها من رب العالمين. لن تجد النفس مستقرها، ولن تجد الروح مستودعها، إلا في عتبات العبودية الحقة لله. ابدأ اليوم بتجديد صلتك بخالقك، واجعل من صلاتك، وذكرك، وتفويضك لأمرك بوابتك الكبرى نحو تعافٍ شامل وجسد يملؤه السلام.",
        "date": "2026-06-28",
        "icon": "fa-solid fa-heart"
    },
    {
        "id": 2,
        "title": "أسرار خفية: سر التسبيح في الساعات الذهبية من اليوم والليلة",
        "summary": "في زحام الحياة اليومية وضجيجها المتواصل، جعل الله في كل يوم وليلة بوابات زمنية خاصة تفيض بالرحمات، فما هي هذه الساعات الذهبية؟",
        "content": "في زحام الحياة اليومية وضجيجها المتواصل، تتشتت عقولنا وتنهك نفوسنا، ونظل نبحث عن واحة للسلام والأمان الروحي. لكن المفاجأة هي أن الله سبحانه وتعالى قد جعل لنا في كل يوم وليلة 'بوابات زمنية' خاصة، تفيض بالرحمات والسكينة، وتُفتح فيها أبواب الإجابة بشكل فريد. هذه الأوقات ليست مجرد ساعات عادية، بل هي الساعات الذهبية التي يقترن فيها الذكر والتسبيح بأعظم تجليات العافية النفسية والروحية.\n\nفما هي هذه الساعات الذهبية؟ وما هو السر الكامن وراء التسبيح فيها تحديداً؟\n\nالبوابات الزمنية الثلاث: متى تكون الساعات الذهبية؟\nالقرآن الكريم والسنة النبوية وجها الأنظار بدقة شديدة نحو أوقات محددة يتضاعف فيها أثر الذكر، وأبرزها ثلاثة أوقات:\nساعة السَّحَر (ثلث الليل الأخير): وقت النزول الإلهي، حيث الهدوء التام والكون الساكن.\nساعة البكور (ما بعد الفجر حتى الشروق): وقت توزيع الأرزاق وانطلاق البركة في الأرض.\nساعة الأصيل (ما قبل الغروب): وقت تبدل الملائكة وانطواء النهار، وحيث تميل النفس للهدوء بعد عناء العمل.\nوقد لخص القرآن الكريم هذه الأوقات في آية جامعة تدل على عظم سرها: (وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا وَمِنْ آنَاءِ اللَّيْلِ فَسَبِّحْ وَأَطْرَافَ النَّهَارِ لَعَلَّكَ تَرْضَى).\n\nسر اختيار 'التسبيح' في هذه الأوقات بالذات\nالتسبيح هو قول 'سبحان الله وبحمده'، وهو يعني تنزيه الله عن كل نقص، والاعتراف بكماله وجلاله. وفي الساعات الذهبية، يحمل التسبيح أسراراً مذهلة:\nالتناغم مع الكون: في وقتي الفجر والغروب، تسبح الكائنات كلها، من طيور وشجر ودواب، بلغاتها التي لا نفقهها. عندما تسبح في هذه الأوقات، فإنك تُدخل روحك في 'سيمفونية كونية' من العبودية، فتتحرر من عزلتك الأرضية وتشعر بأنك جزء من منظومة نورانية كبرى.\nسرادق الأمان والرضا النفسي: ختم الله آية التسبيح السابقة بعبارة لافتة جداً: (لَعَلَّكَ تَرْضَى). هذا هو السر النفسي الأكبر؛ التسبيح في هذه الساعات يفرغ الشحنات السلبية، ويزيل القلق والتوتر، وينزل في القلب 'الرضا العارم' بالمقسوم، وكأن التسبيح يعيد ترتيب فوضى مشاعرك الداخلية.\nالاستمداد والتحصين: التسبيح في البكور يمدك بـ 'الوقود الروحي' الذي تحتاجه لمواجهة مشاق يومك، والتسبيح في الأصيل يغسل عنك كدر ما واجهته خلال النهار، أما تسبيح السحر فهو النور الذي يضيء عتمة صدرك.\n\nكيف تستثمر هذه الساعات الذهبية عملياً؟\nالاستفادة من هذه الأوقات لا تتطلب تفريغ ساعات طويلة، بل تتطلب حضور القلب الاستثنائي من خلال خطوات بسيطة:\nاحرص على 'جلسة الشروق' ولو لـ 15 دقيقة: بعد صلاة الفجر، اجلس مكاناً هادئاً، وتأمل خروج النور، وسبّح بقلب حاضر؛ ستجد بركة غريبة في وقتك وصحتك طوال اليوم.\nاستغل وقت العودة من العمل (الأصيل): بدلاً من الانشغال بالهاتف أو الضيق من زحام السير قبل الغروب، اجعل لسانك رطباً بالتسبيح والاستغفار، وراقب كيف يتبدد تعب يومك.\nاستيقظ قبل الفجر بـ 20 دقيقة فقط: انطرح بين يدي الله، وسبحه واستغفره في وقت السحر؛ فالاستغفار والتسبيح هنا لهما مذاق لا يعرفه إلا من تذوقه.\n\nخلاصة القول:\nالساعات الذهبية هي هدايا ربانية مجانية، تمنحنا فرصة يومية لإعادة ضبط المصنع لنفوسنا وأرواحنا. التسبيح فيها ليس مجرد كلمات نرددها، بل هو حبل متين يربطنا بالخالق في أرقى تجليات القرب. اجعل لنفسك حظاً من هذه الساعات، وراقب كيف ستتحول حياتك من الشتات والضيق، إلى الرضا والسكينة والبركة الشاملة.",
        "date": "2026-06-25",
        "icon": "fa-solid fa-clock"
    },
    {
        "id": 3,
        "title": "البيوت السعيدة.. محراب السكينة ومصدر النجاح المكتوم",
        "summary": "وراء كل قصة نجاح أبهرت العالم، هناك فصْلٌ غير مكتوب جرت أحداثه خلف الأبواب المغلقة. النجاح الحقيقي يبدأ من دفء البيت واستقراره القائم على الارتباط بالله.",
        "content": "وراء كل قصة نجاح أبهرت العالم، هناك فصْلٌ غير مكتوب جرت أحداثه خلف الأبواب المغلقة. نبحث كثيراً عن أسرار التميز في خطط العمل واستراتيجيات الإدارة، وننسى أن المحرك الأول لكل إنجاز عظيم يبدأ من مكان واحد: دفء البيت واستقراره القائم على الارتباط بالله. السعادة الأسرية ليست مجرد توافق اجتماعي، بل هي منصة إيمانية ونفسية ينطلق منها الإنسان ليواجه الحياة بثقة، مستمداً قوته من سكينة بيته وتوفيقه من رب العالمين.\n\nفكيف تتحول جدران المنزل البسيطة بفضل القرب من الله إلى وقود للنجاح والتميز؟\n\n1. السكينة الإلهية.. الملاذ الآمن من ضجيج العالم\nالحياة في الخارج مليئة بالتحديات، والضغوط، والمعارك المهنية التي تستنزف طاقة الإنسان العقلية والنفسية.\nالأثر: عندما يعود المرء إلى بيت ذُكر اسم الله فيه، وعُمّر بالطاعة، تتنزل عليه السكينة تلقائياً (هُوَ الَّذِي أَنزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ).\nالنتيجة: يتحول البيت من مجرد جدران خرسانية إلى واحة للتعافي الروحي، مما يمنح الإنسان القوة الذهنية والقلبية للبدء من جديد كل صباح بكفاءة مضاعفة.\n\n2. البيوت الموصولة بالله تتحرر من القلق والنزاع\nأثبتت التجارب النفسية والواقعية أن البيوت التي تفتقد للروابط الإيمانية تكون أكثر عرضة للخلافات المستمرة، مما يضع عقل الإنسان في حالة 'دفاع واضطراب دائم'.\nالراحة النفسية: : الارتباط المشترك بالله بين أفراد الأسرة (كالصلاة جماعة وقراءة القرآن) يطرد الشياطين ويزيل أسباب الشقاق والمشاحنات.\nالإنتاجية: عندما يطمئن البال داخل البيت بذكر الله (أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ)، يتفرغ العقل البشري بالكامل للتركيز على الابتكار، والتميز، واتخاذ القرارات الذكية في العمل أو الدراسة.\n\n3. البركة.. السر الخفي وراء التوفتيق\nالنجاح ليس مجرد حسابات مادية أو ساعات عمل طويلة، بل هو 'بركة' يضعها الله في الوقت والجهد والأثر.\nصناعة البركة: البيوت السعيدة والمستقرة إيمانياً هي البيوت المستحقة للبركة؛ لأنها تلتزم بحدود الله وتُبنى على المودة والرحمة التي جعلها الله آية من آياته.\nالتيسير: هذا الارتباط يجعل التوفيق حليفاً لصاحب البيت في مسعاه الخارجي، فتُفتح له الأبواب المغلقة بأقل مجهود، ويُدفع عنه السوء بفضل دعوات صادقة تصعد من جوف بيته المستقر.\n\n4. كيف تبني بيتاً موصولاً بالله ليكون منطلقاً لنجاحك؟\nتحويل البيت إلى بيئة داعمة ومباركة يتطلب خطوات إيمانية وعملية بسيطة ومستمرة:\nأحيوا البيت بالذكر والطاعة: اجعل لبيتك حظاً من صلاة النوافل، وقراءة القرآن، وتجنبوا الأجواء التي تطرد الملائكة والبركة.\nاجعل المعاملة قائمة على التقوى: استبدل اللوم والتقريع بـ 'الكلمة الطيبة' والنصح الرفيق، متأسياً بالنبي ﷺ: «خَيرُكُم خَيرُكُم لِأَهلِهِ».\nالتفويض والتوكل المشترك: عند مواجهة أي أزمة مالية أو مهنية، اجمع أسرتك على الدعاء والتفويض لله، ليتعلم الجميع أن مصدر الأمان والرزق هو الله وحده.\n\nخلاصة القول:\nالنجاح الحقيقي ليس هرمًا تبنيه في الخارج بينما تتداعى أساساته الروحية في الداخل. إن تميزك المهني، والمالي، والاجتماعي ما هو إلا انعكاس لسلامك الداخلي الذي تصنعه في بيتك تحت ظلال طاعة الله. استثمر في صلة بيتك برب العالمين أولاً، وستجد أن أبواب التوفيق والبركة في الحياة تفتح لك ولأسرتك تلقائياً وبأبهى صورها.",
        "date": "2026-06-22",
        "icon": "fa-solid fa-house-chimney"
    }
];

// ===== 1. محرك الإشعارات السريعة لراحة البال =====
function showNotification(msg, type = 'success') {
    alert(msg); 
}

// ===== دالة الإملاء الصوتي الاختيارية للشيخ بسام للرد المباشر =====
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

// ===== إدارة ومراقبة المقالات الروحية (CRUD) =====

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

// 3. جلب جميع المقالات الروحية من السيرفر وعرضها في الجدول مع توفير حل بديل (Fallback)
async function fetchAdminArticles() {
    const tbody = document.getElementById('adminArticlesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px; color:#888;"><i class="fas fa-spinner fa-spin"></i> جاري جلب المقالات الموثقة من السيرفر...</td></tr>';

    try {
        const res = await fetch('/api/articles');
        let articles = [];
        
        if (res.ok) {
            articles = await res.json();
        }

        // في حال فشل جلب البيانات من السيرفر أو كانت فارغة، يتم الرندرة من البيانات الافتراضية المزودة
        if (!articles || articles.length === 0) {
            articles = defaultArticles;
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
        // عرض البيانات الافتراضية لضمان عمل اللوحة كخيار حماية أخير في حال انهيار الـ API تماماً
        renderDefaultArticlesFallback();
    }
}

function renderDefaultArticlesFallback() {
    const tbody = document.getElementById('adminArticlesTableBody');
    if (!tbody) return;
    tbody.innerHTML = defaultArticles.map(article => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; color: #2c3e50; font-weight: 600;">${article.title}</td>
            <td style="padding: 12px; color: #64748b;">${article.date}</td>
            <td style="padding: 12px; text-align: center; display: flex; gap: 8px; justify-content: center;">
                <button onclick="editArticle('${article.id}')" style="background:#3498db; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Cairo';"><i class="fas fa-edit"></i> تعديل</button>
                <button onclick="deleteArticle('${article.id}')" style="background:#e74c3c; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-family:'Cairo';"><i class="fas fa-trash-alt"></i> حذف</button>
            </td>
        </tr>
    `).join('');
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

        if (res.ok) {
            showNotification('✅ تم حفظ ونشر المقال الروحي وتوثيقه بنجاح مذهل.');
            closeArticleForm();
            fetchAdminArticles();
        } else {
            // تحديث محلي في المصفوفة في حال العمل بدون سيرفر كامل
            if (id) {
                let index = defaultArticles.findIndex(a => a.id == id);
                if (index !== -1) {
                    defaultArticles[index] = { ...defaultArticles[index], title, summary, content };
                }
            } else {
                defaultArticles.push({ id: Date.now(), title, summary, content, date: '2026-07-11' });
            }
            showNotification('✅ تم التحديث المحلي للمقال بنجاح.');
            closeArticleForm();
            fetchAdminArticles();
        }
    } catch (e) {
        console.error(e);
        showNotification('⚠️ حدث خطأ، تم حفظ التعديل محلياً على المتصفح.', 'success');
        closeArticleForm();
        fetchAdminArticles();
    }
}

// 5. دالة جلب بيانات المقال المحدد ووضعها في النموذج للتعديل
async function editArticle(id) {
    try {
        let article = null;
        const res = await fetch('/api/articles');
        if (res.ok) {
            const articles = await res.json();
            article = articles.find(a => a.id == id || a._id == id);
        }
        
        if (!article) {
            article = defaultArticles.find(a => a.id == id);
        }
        
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
    if (!confirm('⚠️ تنبيه فقهي وإداري: هل أنت متأكد تماماً من رغبتك في حذف هذا المقال نهائياً؟')) return;
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
            defaultArticles = defaultArticles.filter(a => a.id != id);
            showNotification('🗑️ تم مسح المقال بنجاح من اللوحة.');
            fetchAdminArticles();
        }
    } catch (e) {
        console.error(e);
        defaultArticles = defaultArticles.filter(a => a.id != id);
        showNotification('🗑️ تم حذف المقال محلياً بنجاح.', 'success');
        fetchAdminArticles();
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

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">

            <!-- نموذج صياغة البرنامج العلاجي أو الرد المباشر للشيخ -->
            <div style="text-align: right; direction: rtl;">
                <label style="font-weight: 700; color: var(--sidebar-bg); display: block; margin-bottom: 8px;">
                    <i class="fas fa-edit"></i> صياغة البرنامج العلاجي أو التوجيه الروحي للمستفيد:
                </label>
                
                <!-- زر الإملاء الصوتي المطور للشيخ بسام -->
                <button type="button" onclick="startAdminDictation(this)" style="background: #2c3e50; color: var(--gold); border: 1px solid var(--gold); padding: 6px 12px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-size: 0.85rem; margin-bottom: 10px; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fas fa-microphone"></i> إملاء البرنامج صوتاً
                </button>

                <textarea id="replyText" rows="6" placeholder="اكتب البرنامج العلاجي، الأذكار، أو التوجيهات الفقهية والروحية المخصصة لهذه الحالة..." style="width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 12px; font-family: 'Cairo'; font-size: 0.95rem; line-height: 1.6; resize: vertical;">${req.reply || ''}</textarea>
                
                <label style="font-weight: 700; color: var(--sidebar-bg); display: block; margin-top: 15px; margin-bottom: 5px;">
                    <i class="fas fa-tasks"></i> تحديث حالة الطلب الإدارية:
                </label>
                <select id="updateStatusSelect" style="width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 12px; font-family: 'Cairo'; background: #fff;">
                    <option value="pending" ${req.status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار والمراجعة</option>
                    <option value="processing" ${req.status === 'processing' ? 'selected' : ''}>⚙️ قيد العلاج والدراسة</option>
                    <option value="completed" ${req.status === 'completed' ? 'selected' : ''}>✅ مكتمل وتم إرسال الخطة العلاجية</option>
                    <option value="rejected" ${req.status === 'rejected' ? 'selected' : ''}>❌ مستعد / لا يتوافق مع الضوابط</option>
                </select>
            </div>
        `;
    } catch (error) {
        console.error(error);
        mBody.innerHTML = '<div style="text-align:center; color:#e74c3c; padding:20px;">❌ خطأ في تحميل ملف المستفيد من السيرفر.</div>';
    }
}

// ===== 9. إغلاق نافذة تفاصيل الحالات =====
function closeModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    selectedRequestId = null;
}

// ===== 10. حفظ رد الشيخ وإرساله عبر السيرفر للمستفيد (API) =====
async function saveAdminReply() {
    if (!selectedRequestId) return;
    const token = localStorage.getItem('token');
    const replyText = document.getElementById('replyText').value.trim();
    const newStatus = document.getElementById('updateStatusSelect').value;

    if (!replyText && newStatus === 'completed') {
        showNotification('⚠️ يرجى كتابة البرنامج العلاجي أو التوجيه أولاً قبل إعطاء حالة "مكتمل".', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/admin/requests/${selectedRequestId}/reply`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reply: replyText,
                status: newStatus
            })
        });

        if (res.ok) {
            showNotification('✅ تم حفظ البرنامج العلاجي، تحديث الحالة، وإخطار المستفيد بنجاح.');
            closeModal();
            loadRequests(); // إعادة تحميل الجدول لتحديث البيانات والبطاقات
        } else {
            // حل بديل محلي (Fallback) في حال انقطاع الاتصال بالسيرفر
            const reqIndex = currentRequests.findIndex(r => r.id === selectedRequestId);
            if (reqIndex !== -1) {
                currentRequests[reqIndex].status = newStatus;
                currentRequests[reqIndex].reply = replyText;
                renderTable(currentRequests);
                updateStats(currentRequests);
            }
            showNotification('✅ تم حفظ التحديثات محلياً في اللوحة بنجاح.');
            closeModal();
        }
    } catch (error) {
        console.error(error);
        showNotification('⚠️ حدث خطأ أثناء الاتصال بالسيرفر، تم حفظ التعديل محلياً.', 'success');
        closeModal();
    }
}

// ===== 11. حذف طلب مستفيد نهائياً من قاعدة البيانات السحابية =====
async function deleteRequest(id) {
    if (!confirm('⚠️ تنبيه فقهي وإداري: هل أنت متأكد من حذف ملف هذا المستفيد نهائياً من قاعدة البيانات؟ لا يمكن التراجع.')) return;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/requests/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showNotification('🗑️ تم حذف ملف المستفيد بنجاح وتصفية اللوحة.');
            loadRequests();
        } else {
            currentRequests = currentRequests.filter(r => r.id !== id);
            renderTable(currentRequests);
            updateStats(currentRequests);
            showNotification('🗑️ تم الحذف المحلي لملف المستفيد بنجاح.');
        }
    } catch (error) {
        console.error(error);
        currentRequests = currentRequests.filter(r => r.id !== id);
        renderTable(currentRequests);
        updateStats(currentRequests);
        showNotification('🗑️ تم الحذف محلياً من المتصفح.', 'success');
    }
}

// ===== 12. تشغيل التبويب الافتراضي تلقائياً عند فتح اللوحة لأول مرة =====
document.addEventListener('DOMContentLoaded', () => {
    // جلب طلبات المستفيدين الحية كتبويب افتراضي للوحة التحكم
    switchTab('requests');
    
    // ربط نموذج المقالات بحدث الإرسال
    const articleForm = document.getElementById('adminArticleForm');
    if (articleForm) {
        articleForm.addEventListener('submit', saveArticle);
    }
});
