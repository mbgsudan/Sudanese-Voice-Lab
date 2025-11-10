// إعدادات Supabase
const SUPABASE_URL = 'https://qcctqvmwwpsoiexgdqwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3Rxdm13d3Bzb2lleGdkcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI1OTcsImV4cCI6MjA3ODI5ODU5N30.uTfskCuzkZNcvy1QdaOzqlW8km-wcZQoVRFi6k2xndQ';
const BUCKET = 'recordings';

// تهيئة عميل Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabase = supabaseClient;

// النصوص العربية السودانية للتسجيل
const arabicTexts = [
    "السودان بلد جميل يقع في شمال شرق أفريقيا، ويتميز بتنوع ثقافي وجغرافي رائع.",
    "النيل الأزرق والنيل الأبيض يلتقيان في الخرطوم ليكونا نهر النيل الأعظم.",
    "الشعب السوداني معروف بكرم الضيافة والترحيب بالزوار من جميع أنحاء العالم.",
    "القبائل السودانية متنوعة وكل قبيلة لها تقاليدها وثقافتها الخاصة.",
    "الزراعة والرعي من أهم الأنشطة الاقتصادية في السودان منذ القدم.",
    "الخرطوم عاصمة السودان وتضم العديد من الجامعات والمعاهد التعليمية المهمة.",
    "الصناعات التقليدية في السودان تشمل صناعة النسيج والفخار والحدادة.",
    "المناخ في السودان متنوع من الصحراوي في الشمال إلى الاستوائي في الجنوب.",
    "اللغة العربية هي اللغة الرسمية في السودان إلى جانب العديد من اللغات المحلية.",
    "الموسيقى والرقص جزء مهم من التراث الثقافي السوداني عبر التاريخ.",
    "مدينة كسلا تشتهر بأسواقها التقليدية وتنوع المجتمعات التي تسكنها.",
    "دارفور منطقة واسعة تضم قبائل عديدة ولها تاريخ عريق في التجارة.",
    "ولاية الجزيرة تعتبر سلة غذاء السودان وتشتهر بزراعة القطن والذرة.",
    "البحر الأحمر يطل على السودان من الشرق ويضم موانئ مهمة للتجارة.",
    "كردفان منطقة غنية بالثروات الطبيعية والمعادن والغابات.",
    "تتميز اللهجات السودانية بالتنوع والثراء اللغوي في جميع أنحاء البلاد.",
    "التعليم في السودان له تاريخ طويل ويشمل الجامعات العريقة والمعاهد المتخصصة.",
    "الطب التقليدي السوداني يحتوي على علاجات طبيعية متوارثة عبر الأجيال.",
    "الألعاب الشعبية السودانية تعكس ثقافة المجتمع وتقاليده الأصيلة.",
    "الحرف اليدوية السودانية تشمل النسيج والخزف والصياغة والنجارة."
];

// دوال مساعدة عامة
function showLoading(element) {
    if (element) {
        element.innerHTML = '<div class="loading"></div>';
        element.disabled = true;
    }
}

function hideLoading(element) {
    if (element) {
        element.disabled = false;
        const loading = element.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notificationContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-text">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // إزالة الإشعار تلقائياً
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    return notification;
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getRandomText() {
    return arabicTexts[Math.floor(Math.random() * arabicTexts.length)];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// دوال إدارة القوائم
function getDialectName(dialect) {
    const dialects = {
        'khartoum': 'خرطوم',
        'gezira': 'الجزيرة',
        'kassala': 'كسلا',
        'darfur': 'دارفور',
        'kordofan': 'كردفان',
        'white_nile': 'النيل الأبيض',
        'blue_nile': 'النيل الأزرق',
        'northern': 'الشمالية',
        'red_sea': 'البحر الأحمر',
        'other': 'أخرى'
    };
    return dialects[dialect] || dialect;
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد المراجعة ⏳',
        'approved': 'تم القبول ✅',
        'rejected': 'تم الرفض ❌'
    };
    return statusMap[status] || status;
}

function getGenderText(gender) {
    return gender === 'male' ? 'ذكر' : 'أنثى';
}

// تهيئة القائمة المحمولة
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
        
        // إغلاق القائمة عند النقر خارجها
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }
}

// تهيئة التأثيرات البصرية
function initializeParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(0, 255, 136, 0.3);
            border-radius: 50%;
            animation: float ${Math.random() * 20 + 10}s linear infinite;
            left: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 20}s;
        `;
        particlesContainer.appendChild(particle);
    }
}

// تأثيرات CSS للجسيمات
function addParticleStyles() {
    if (!document.querySelector('#particle-styles')) {
        const styles = document.createElement('style');
        styles.id = 'particle-styles';
        styles.textContent = `
            @keyframes float {
                0% {
                    opacity: 0;
                    transform: translateY(100vh) rotate(0deg);
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                    transform: translateY(-100vh) rotate(360deg);
                }
            }
            
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// تهيئة عداد الإحصائيات
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target || 0);
        const duration = 2000; // مدة الحركة بالميلي ثانية
        const increment = target / (duration / 16); // 60fps
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current).toLocaleString('ar-SA');
        }, 16);
    });
}

// تحديث الإحصائيات من قاعدة البيانات
async function updateStats() {
    try {
        // جلب الإحصائيات
        const { data: recordings } = await supabase
            .from('recordings')
            .select('duration, status');
            
        const { data: speakers } = await supabase
            .from('speakers')
            .select('dialect');
        
        if (recordings && speakers) {
            const totalRecordings = recordings.length;
            const totalSpeakers = speakers.length;
            const totalMinutes = Math.round(recordings.reduce((sum, r) => sum + (r.duration || 0), 0) / 60);
            const totalDialects = [...new Set(speakers.map(s => s.dialect))].length;
            
            // تحديث العدادات
            const elements = {
                totalRecordings: document.getElementById('totalRecordings'),
                totalSpeakers: document.getElementById('totalSpeakers'),
                totalMinutes: document.getElementById('totalMinutes'),
                totalDialects: document.getElementById('totalDialects')
            };
            
            if (elements.totalRecordings) {
                elements.totalRecordings.dataset.target = totalRecordings;
                elements.totalRecordings.textContent = '0';
            }
            if (elements.totalSpeakers) {
                elements.totalSpeakers.dataset.target = totalSpeakers;
                elements.totalSpeakers.textContent = '0';
            }
            if (elements.totalMinutes) {
                elements.totalMinutes.dataset.target = totalMinutes;
                elements.totalMinutes.textContent = '0';
            }
            if (elements.totalDialects) {
                elements.totalDialects.dataset.target = totalDialects;
                elements.totalDialects.textContent = '0';
            }
            
            // تشغيل الحركة
            setTimeout(animateCounters, 500);
        }
    } catch (error) {
        console.error('خطأ في تحديث الإحصائيات:', error);
    }
}

// تهيئة عامة للصفحة
function initializePage() {
    // تهيئة القائمة المحمولة
    initializeMobileMenu();
    
    // إضافة أنماط الجسيمات
    addParticleStyles();
    
    // تهيئة الجسيمات
    initializeParticles();
    
    // تحديث الإحصائيات
    updateStats();
    
    // تشغيل دالة التهيئة الخاصة بكل صفحة
    if (typeof pageInit === 'function') {
        pageInit();
    }
}

// تشغيل التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تأثير تحميل الصفحة
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
        initializePage();
    }, 100);
});

// تصدير الدوال للاستخدام في الملفات الأخرى
window.sawtna = {
    showNotification,
    showLoading,
    hideLoading,
    formatTime,
    formatDate,
    formatDuration,
    getRandomText,
    getDialectName,
    getStatusText,
    getGenderText,
    supabase
};