// ==========================================
//   المستشار الروحاني الذكي (نسخة معدلة بالكامل)
// ==========================================

// ===== حالة المحادثة =====
let chatState = {
    step: 'intro',
    userData: {
        problem: '',
        duration: '',
        previous: ''
    },
    isOpen: false
};

// ===== فتح/إغلاق نافذة الدردشة =====
function toggleChat() {
    const window = document.getElementById('chatWindow');
    if (!window) return;
    
    const isShowing = window.classList.contains('show');
    if (isShowing) {
        window.classList.remove('show');
        chatState.isOpen = false;
        // تسجيل أن المستخدم أغلق النافذة يدوياً
        sessionStorage.setItem('chat_manual_closed', 'true');
    } else {
        window.classList.add('show');
        chatState.isOpen = true;
        sessionStorage.removeItem('chat_manual_closed');
        // التركيز على حقل الإدخال بعد فتح النافذة
        setTimeout(() => {
            const input = document.getElementById('chatInput');
            if (input) input.focus();
        }, 300);
    }
}

// ===== إرسال رسالة =====
function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    // إضافة رسالة المستخدم
    addMessage(text, 'user');
    input.value = '';

    // معالجة الرد
    setTimeout(() => {
        processResponse(text);
    }, 600);
}

// ===== إضافة رسالة إلى واجهة الدردشة =====
function addMessage(text, sender) {
    const body = document.getElementById('chatBody');
    if (!body) return;
    
    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;
    
    // تنسيق النص (تحويل الأسطر إلى <br>)
    const formattedText = text.replace(/\n/g, '<br>');
    div.innerHTML = `<div class="message-content">${formattedText}</div>`;
    body.appendChild(div);
    
    // التمرير إلى الأسفل
    body.scrollTop = body.scrollHeight;
}

// ===== إضافة رسالة من البوت =====
function addBotMessage(text) {
    addMessage(text, 'bot');
}

// ===== معالجة ردود البوت بناءً على حالة المحادثة =====
function processResponse(text) {
    const step = chatState.step;
    const data = chatState.userData;

    switch (step) {
        case 'intro':
            data.problem = text;
            chatState.step = 'duration';
            addBotMessage('🙏 شكراً لك على المشاركة.<br><br>منذ متى وأنت تعاني من هذه المشكلة؟<br><small>مثال: أشهر، سنوات، منذ الطفولة</small>');
            break;

        case 'duration':
            data.duration = text;
            chatState.step = 'previous';
            addBotMessage('📖 هل حاولت علاج هذه المشكلة سابقاً؟<br><small>مثال: رقية، استشارة نفسية، طبيب، لا شيء</small>');
            break;

        case 'previous':
            data.previous = text;
            chatState.step = 'summary';
            
            // تحليل البيانات وتقديم التوصية
            const recommendation = analyzeProblem(data);
            addBotMessage(`✨ شكراً لك على مشاركتك.<br><br>بناءً على ما أخبرتني به، إليك توصيتي:<br><br>${recommendation}`);
            
            // عرض أزرار الإجراء بعد قليل
            setTimeout(() => {
                const body = document.getElementById('chatBody');
                if (!body) return;
                
                const div = document.createElement('div');
                div.className = 'chat-message bot';
                div.innerHTML = `
                    <div class="message-content" style="background:#FFFBF0; border-right:4px solid #F5B041; padding:15px;">
                        <button onclick="transferToForm()" style="background:linear-gradient(135deg,#F5B041,#E67E22); color:#0A1628; border:none; padding:12px 20px; border-radius:12px; font-weight:700; cursor:pointer; font-family:'Cairo'; width:100%; font-size:1rem; transition:0.3s;">
                            <i class="fas fa-arrow-left"></i> نقل البيانات إلى نموذج الطلب
                        </button>
                        <button onclick="resetChat()" style="background:#E2E8F0; color:#333; border:none; padding:10px 16px; border-radius:10px; font-weight:600; cursor:pointer; font-family:'Cairo'; margin-top:8px; width:100%; font-size:0.95rem; transition:0.3s;">
                            <i class="fas fa-undo"></i> بدء محادثة جديدة
                        </button>
                    </div>
                `;
                body.appendChild(div);
                body.scrollTop = body.scrollHeight;
            }, 800);
            break;

        default:
            chatState.step = 'intro';
            addBotMessage('🌙 أهلاً بك مرة أخرى. كيف يمكنني مساعدتك اليوم؟');
            break;
    }
}

// ===== تحليل المشكلة وتقديم التوصية =====
function analyzeProblem(data) {
    const text = (data.problem + ' ' + data.previous).toLowerCase();
    let service = 'استشارة مجانية';
    let confidence = 0;

    // الكلمات المفتاحية
    const keywords = {
        'استشارة مجانية': ['رؤيا', 'حلم', 'استشارة', 'توجيه', 'نصيحة', 'حيرة', 'تردد', 'خوف'],
        'علاج': ['سحر', 'عين', 'حسد', 'مس', 'رصد', 'صدمة', 'خوف', 'قلق', 'اكتئاب', 'وسواس', 'ضيق', 'نوبات'],
        'صوتي': ['صوتي', 'مباشر', 'جلسة', 'مكالمة', 'اتصال', 'تحدث', 'كلام']
    };

    for (const [key, words] of Object.entries(keywords)) {
        let count = 0;
        for (const word of words) {
            if (text.includes(word)) count++;
        }
        if (count > confidence) {
            confidence = count;
            service = key;
        }
    }

    // بناء التوصية
    let recommendation = '';
    if (service === 'استشارة مجانية') {
        recommendation = `
            <strong>🕊️ الخدمة الموصى بها:</strong> الاستشارة الروحانية والنفسية (مجاناً)<br><br>
            يبدو أنك بحاجة إلى توجيه روحاني ونفسي. هذه الاستشارة ستساعدك في توضيح رؤيتك وتقديم النصائح المناسبة لحالتك.
        `;
    } else if (service === 'علاج') {
        recommendation = `
            <strong>🛡️ الخدمة الموصى بها:</strong> علاج العين والحسد والأسحار والرصد (200 ر.س)<br><br>
            الأعراض التي ذكرتها قد تكون مرتبطة بالعين أو الحسد أو السحر. نوصي بجلسة علاجية شاملة تشمل الرقية الشرعية والتحصين.
        `;
    } else if (service === 'صوتي') {
        recommendation = `
            <strong>🎧 الخدمة الموصى بها:</strong> جلسة صوتية مباشرة مع الشيخ بسام (500 ر.س)<br><br>
            حالتك تتطلب تواصلاً مباشراً مع الشيخ بسام عبر مكالمة صوتية. هذه الجلسة ستتيح لك فرصة لمناقشة تفاصيلك بشكل أعمق.
        `;
    }

    return recommendation;
}

// ===== نقل البيانات إلى نموذج الطلب =====
function transferToForm() {
    const data = chatState.userData;
    
    // بناء وصف المشكلة
    const description = `[تم إنشاء هذا الطلب عبر المستشار الروحاني الذكي]\n\nالمشكلة: ${data.problem}\nالمدة: ${data.duration}\nالمحاولات السابقة: ${data.previous}`;
    
    const descField = document.getElementById('description');
    if (descField) descField.value = description;
    
    // اختيار الخدمة المناسبة تلقائياً
    const text = (data.problem + ' ' + data.previous).toLowerCase();
    let serviceValue = 'استشارة مجانية';
    if (text.includes('سحر') || text.includes('عين') || text.includes('حسد') || text.includes('مس')) {
        serviceValue = 'علاج';
    } else if (text.includes('صوتي') || text.includes('مباشر') || text.includes('جلسة')) {
        serviceValue = 'جلسة صوتية';
    }
    
    const serviceSelect = document.getElementById('serviceType');
    if (serviceSelect) {
        for (let option of serviceSelect.options) {
            if (option.value === serviceValue) {
                option.selected = true;
                break;
            }
        }
    }
    
    // إغلاق نافذة الدردشة
    toggleChat();
    
    // التمرير إلى النموذج
    const formCard = document.querySelector('.form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
    
    // إشعار
    showNotification('✅ تم نقل بياناتك إلى نموذج الطلب! راجع التفاصيل وأكمل الإرسال.', 'success');
    
    // إعادة ضبط المحادثة
    resetChat();
}

// ===== إعادة ضبط المحادثة =====
function resetChat() {
    chatState = {
        step: 'intro',
        userData: { problem: '', duration: '', previous: '' },
        isOpen: false
    };
    
    const body = document.getElementById('chatBody');
    if (!body) return;
    
    body.innerHTML = `
        <div class="chat-message bot">
            <div class="message-content">
                السلام عليكم ورحمة الله وبركاته 🌙<br><br>
                أنا المستشار الروحاني الذكي، هنا لمساعدتك في توضيح مشكلتك وتوجيهك إلى الخدمة المناسبة.<br><br>
                <strong>هل يمكنك إخباري بما تمر به؟</strong>
            </div>
        </div>
    `;
    
    // إعادة تعيين علامة الفتح التلقائي
    sessionStorage.removeItem('chat_manual_closed');
    hasAutoOpened = false;
}

// ===== الفتح التلقائي (مرة واحدة لكل جلسة) =====
let hasAutoOpened = false;

function autoOpenChat() {
    const manualClosed = sessionStorage.getItem('chat_manual_closed');
    if (manualClosed === 'true') return;
    if (hasAutoOpened) return;
    if (chatState.isOpen) return;

    hasAutoOpened = true;
    setTimeout(() => {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow && !chatWindow.classList.contains('show')) {
            chatWindow.classList.add('show');
            chatState.isOpen = true;
            const input = document.getElementById('chatInput');
            if (input) setTimeout(() => input.focus(), 300);
            const badge = document.querySelector('.chat-badge');
            if (badge) badge.style.display = 'none';
        }
    }, 3500);
}

// ===== تحميل الصفحة وتفعيل الفتح التلقائي =====
document.addEventListener('DOMContentLoaded', function() {
    // الفتح التلقائي بعد 3 ثوانٍ
    setTimeout(autoOpenChat, 3000);
});

// ===== إغلاق النافذة عند النقر خارج المحتوى (للدردشة) =====
document.addEventListener('click', function(e) {
    const chatWindow = document.getElementById('chatWindow');
    const chatIcon = document.getElementById('chatIcon');
    if (!chatWindow || !chatIcon) return;
    
    if (chatWindow.classList.contains('show')) {
        const isClickInside = chatWindow.contains(e.target) || chatIcon.contains(e.target);
        if (!isClickInside) {
            // إغلاق النافذة إذا نقر المستخدم خارجها
            chatWindow.classList.remove('show');
            chatState.isOpen = false;
            sessionStorage.setItem('chat_manual_closed', 'true');
        }
    }
});
