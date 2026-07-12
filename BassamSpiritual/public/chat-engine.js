// =================================================================
// محرك السيناريوهات الذكي - روح المستشار الروحاني (v2.0)
// =================================================================

const chatScenarios = {
    // ==============================================
    // سيناريو البداية والتشخيص المبدئي
    // ==============================================
    intro: {
        message: `
            <p>السلام عليكم ورحمة الله وبركاته 🌙</p>
            <p>أنا <strong>المستشار الروحاني</strong> لمركز النور الرباني والنَفَس الرحماني، بإدارة الشيخ <strong>بسام الشميري</strong>.</p>
            <p>أنا هنا لأستمع إليك بكل طمأنينة، ولنساعدك معاً في توضيح ما تمر به. تحدث بحرية تامة، فأنت في مجلس آمن.</p>
            <p>🔹 <strong>أخبرني، ما الذي يشغل بالك اليوم؟</strong></p>
        `,
        next: 'analyze'
    },

    // ==============================================
    // سيناريو التحليل الرئيسي (العقل المدبر)
    // ==============================================
    analyze: function(data) {
        const text = (data.problem || '').toLowerCase();
        
        // 1. تحليل العاطفة
        let emotion = 'neutral';
        if (/خائف|خوف|مرعوب|رعب|قلق|خايف|ارتجف/i.test(text)) emotion = 'fear';
        else if (/حزين|حزن|مكتئب|ضيق|ضايقة|مضايق|بكاء|بكي|يأس|يائس/i.test(text)) emotion = 'sadness';
        else if (/غاضب|غضب|عصبي|متوتر|توتر|مدمر/i.test(text)) emotion = 'anger';
        else if (/مشتت|تائه|ضائع|حيران|محتار|مش عارف|مب عارف/i.test(text)) emotion = 'confusion';
        
        // 2. تحليل الموضوع
        let topic = 'general';
        if (/وسواس|وسوس|افكار|فكرة|خواطر|تكرار|قهري|وسوسة/i.test(text)) topic = 'spiritual_obsession';
        else if (/جن|عفريت|مس|شيطان|كابوس|كوابيس|ظل|شبح|قرين/i.test(text)) topic = 'spiritual_jinn';
        else if (/سحر|مسحور|ساحر|عقد|عاقد|عقدة|رصد|مربوط|تعطيل/i.test(text)) topic = 'spiritual_magic';
        else if (/حسد|عين|حاسد|عائن|نظرة|اصابة|مصاب/i.test(text)) topic = 'spiritual_envy';
        else if (/زوج|زوجة|زوجي|زوجتي|طلاق|انفصال|خيانة|أهل الزوج/i.test(text)) topic = 'family_marriage';
        else if (/أبن|ابن|بنت|طفل|أطفالي|ابني|بنتي|مراهق/i.test(text)) topic = 'family_children';
        else if (/مال|فلوس|فقر|دين|ديون|رزق|عمل|وظيفة|تجارة|بزنس/i.test(text)) topic = 'financial_work';
        else if (/مرض|مريض|ألم|وجع|صداع|جسم|جسدي|تعب جسدي|تنميل/i.test(text)) topic = 'health_physical';

        // 3. توليد الرد المناسب (Emotion + Topic = Unique Response)
        let response = '';
        
        // ---------- المسار الروحي (الوساوس) ----------
        if (topic === 'spiritual_obsession') {
            if (emotion === 'fear') {
                response = `<p>أشعر بكلماتك، وأتفهم الخوف الذي ينتابك من هذه الخواطر. 🕊️</p>
                <p>اعلم يا أخي/أختي أن <strong>الوسواس في ذاته دليل على الإيمان</strong>. إنه تماماً كما قال الصحابة: "إن أحدنا ليجد في نفسه ما لأن يخر من السماء أسهل عليه من أن ينطق به"، فقال النبي ﷺ: <strong>"ذاك صريح الإيمان"</strong>.</p>
                <p>لا تقاوم الوسواس بقوة، فهذا يزيده. بل استعذ بالله، واشغل نفسك بذكره. هل تريد مني أن أرشدك إلى <strong>برنامج تحصين يومي</strong> يريح صدرك ويطرد عنك هذه الخواطر؟</p>`;
            } else {
                response = `<p>بارك الله فيك على صراحتك. 🌿</p>
                <p>الوساوس والخواطر المتكررة لها أسباب روحانية ونفسية معاً. مهم أن نفرق بين <strong>وسواس الشيطان</strong> و<strong>وسواس النفس</strong>، لأن علاج كل منهما يختلف. الشيخ بسام له باع طويل في هذا، وبإذن الله يضع لك برنامجاً علاجياً مخصصاً بعد أن يدرس حالتك بتفصيل.</p>`;
            }
        }
        // ---------- المسار الروحي (الجن والمس) ----------
        else if (topic === 'spiritual_jinn') {
            response = `<p>أشكر لك ثقتك الغالية. 🌙</p>
                <p>ما تذكره من أعراض قد يكون له علاقة بوجود <strong>تابعة أو مس</strong> - والعياذ بالله. لكن لا تخف، فهذا بإذن الله يمكن علاجه بالرقية الشرعية الصحيحة والأذكار.</p>
                <p>أريد منك أن تصف لي بدقة أكثر: منذ متى بدأت هذه الأعراض تحديداً؟ وهل تأتي على شكل نوبات أم هي مستمرة؟ وهل ذهبت لأحد المعالجين قبل ذلك؟</p>`;
        }
        // ---------- المسار الروحي (السحر والعين والحسد) ----------
        else if (topic === 'spiritual_magic' || topic === 'spiritual_envy') {
            response = `<p>اللهم اكفنا بحلالك عن حرامك. 🛡️</p>
                <p>أعراض ${topic === 'spiritual_magic' ? 'السحر' : 'العين'} حقيقية ولا ينكرها إلا جاهل. ولكن أبشر، فباب الشفاء مفتوح بإذن الله.</p>
                <p>أهم خطوة هي <strong>الدقة في التشخيص</strong>. ليس كل تعطيل سحراً، وليس كل مرض عضوي عيناً. الشيخ بسام -حفظه الله- دقيق جداً في التثبت قبل إعطاء العلاج. ستحتاج أن تملأ وصفاً دقيقاً للأعراض، مواقيتها، وكيف بدأت.</p>`;
        }
        // ---------- المسار الأسري ----------
        else if (topic === 'family_marriage' || topic === 'family_children') {
            response = `<p>البيوت السعيدة هي سر النجاح، كما قال حكيم. 🏡</p>
                <p>ما تمر به من ${topic === 'family_marriage' ? 'خلافات زوجية' : 'تحديات مع الأبناء'} أمر شائع جداً، وهذا لا يقلل من ألمه أبداً. المشاكل الأسرية تحتاج إلى <strong>حكمة وتوجيه واحتواء</strong> أكثر مما تحتاج إلى حلول سريعة.</p>
                <p>كثير من هذه المشاكل جذورها نفسية وروحانية معاً. الاستشارة النفسية والروحانية المتكاملة مع الشيخ بسام ستفتح لك آفاقاً جديدة لرؤية المشكلة وحلها. ما رأيك أن تبدأ معه في جلسة خاصة؟</p>`;
        }
        // ---------- المسار المالي ----------
        else if (topic === 'financial_work') {
            response = `<p>اللهم ارزقنا من واسع فضلك. 💰</p>
                <p>ضيق الرزق والهم المالي من أعظم ما يثقل كاهل الإنسان. اسمع مني: الرزق بيد الله، ولكن له <strong>مفاتيح روحانية وعملية</strong>.</p>
                <p>أولاً: عليك بالاستغفار، فهو أعظم مفتاح للرزق. ثانياً: راجع علاقاتك الأسرية، فصلة الرحم تجلب البركة. ثالثاً: قد تحتاج إلى <strong>تحصين روحي</strong> إن كان هناك ما يعطلك. الشيخ سيكتب لك برنامجاً متكاملاً يجمع كل هذه الجوانب.</p>`;
        }
        // ---------- المسار الصحي ----------
        else if (topic === 'health_physical') {
            response = `<p>اللهم اشف كل مريض. 💚</p>
                <p>الأمراض الجسدية تحتاج إلى طبيب مختص أولاً، ثم إلى <strong>دعم روحاني ونفسي</strong> يعين على الشفاء. نحن في مركز النور نقدم هذا الدعم للذين يعانون من أمراض مزمنة أو آلام ليس لها تفسير طبي واضح. سنقوم بتقييم حالتك من الناحية الروحانية لنرى إن كان هناك ما يعيق تعافيك.</p>`;
        }
        // ---------- الرد العام ----------
        else {
            if (emotion === 'fear') {
                response = `<p>لا تخف، فأنت في مكان آمن. 🌙</p><p>أشعر أن قلبك ملآن بالخوف، وهذا طبيعي. دعنا نواجه هذا معاً. تحدث لي أكثر عن هذا الشعور، وكلما أوضحت أكثر، استطعت أن أرشدك بدقة للشيخ أو للخدمة المناسبة.</p>`;
            } else if (emotion === 'sadness') {
                response = `<p>اللهم اشرح صدرك. 🕊️</p><p>أشعر بحزنك، وأتفهمه. الحزن ليس ضعفاً، بل هو دليل على قلب حي. لا تيأس، فبعد العسر يسراً. دعنا نرى كيف يمكننا أن نعينك ونتشارك معك هذا الحمل حتى يفرجه الله عليك.</p>`;
            } else {
                response = `<p>جزاك الله خيراً على ثقتك. 🌿</p><p>لقد فهمت ما تعاني منه بشكل عام. لكي نتمكن من مساعدتك بدقة عالية، أنصحك بالتوجه إلى <strong>تقديم طلب جديد</strong> ليفتح لك الشيخ بسام ملفاً خاصاً ويضع لك التشخيص وخطة العلاج المثلى.</p>`;
            }
        }

        // 4. إضافة الدعوة إلى اتخاذ إجراء (Call to Action)
        response += `<p style="margin-top:15px; border-top:1px dashed #ccc; padding-top:10px;">🔹 <strong>ماذا تود أن تفعل الآن؟</strong><br>- يمكنك أن تخبرني المزيد من التفاصيل عن حالتك لأفهمك أكثر.<br>- أو يمكنك التوجه مباشرة إلى <strong>تسجيل الدخول وتقديم طلب</strong> ليبدأ الشيخ في دراسة حالتك فوراً.</p>`;
        
        return response;
    },

    // ==============================================
    // سيناريو الشكر والختام
    // ==============================================
    thank_you: {
        message: `
            <p>الحمد لله الذي هدانا لهذا. 🌙</p>
            <p>أشكر لك ثقتك الغالية. تذكر دائماً أن باب المركز مفتوح لك في أي وقت. حفظك الله ورعاك.</p>
            <p>إن أردت العودة للمحادثة في أي وقت، فقط ابدأ بالسلام عليكم.</p>
        `,
        next: 'intro' // يعيد المحادثة للبداية
    }
};

// ==============================================
// الحالة وإدارة المحادثة
// ==============================================
let chatState = {
    step: 'intro',
    userData: { problem: '', details: '' },
    isProcessing: false
};

// ==============================================
// الدوال المساعدة للواجهة
// ==============================================

// بدء محادثة جديدة
function startNewChat() {
    chatState = {
        step: 'intro',
        userData: { problem: '', details: '' },
        isProcessing: false
    };
    const body = document.getElementById('chatBody');
    if (body) {
        body.innerHTML = '';
        addBotMessage(chatScenarios.intro.message);
    }
}

// إرسال رسالة المستخدم ومعالجتها
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value.trim();
    if (!message || chatState.isProcessing) return;

    chatState.isProcessing = true;
    input.disabled = true;
    addUserMessage(message);
    input.value = '';

    const currentStep = chatState.step;
    const data = chatState.userData;

    // تحديث بيانات المستخدم
    if (currentStep === 'intro' || currentStep === 'analyze') {
        data.problem = data.problem ? (data.problem + '. ' + message) : message;
    }

    // توليد الرد المناسب
    let reply = '';
    if (chatState.step === 'intro' || chatState.step === 'analyze') {
        reply = chatScenarios.analyze(data);
        chatState.step = 'analyze'; // يبقى في طور التحليل ليتعمق أكثر
    } else {
        reply = chatScenarios.intro.message;
    }

    setTimeout(() => {
        addBotMessage(reply);
        chatState.isProcessing = false;
        input.disabled = false;
        input.focus();
    }, 800);
}

// إضافة رسالة المستخدم للشاشة
function addUserMessage(text) {
    const body = document.getElementById('chatBody');
    if (!body) return;
    const div = document.createElement('div');
    div.className = 'chat-message user';
    div.innerHTML = `<div class="message-content">${text}</div>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

// إضافة رسالة البوت للشاشة
function addBotMessage(html) {
    const body = document.getElementById('chatBody');
    if (!body) return;
    const div = document.createElement('div');
    div.className = 'chat-message bot';
    div.innerHTML = `<div class="message-content">${html}</div>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

console.log('✅ محرك السيناريوهات الذكي جاهز للعمل.');
