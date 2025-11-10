// JavaScript خاص بالصفحة الرئيسية

function pageInit() {
    console.log('تم تحميل الصفحة الرئيسية');
    
    // تحريك العناصر عند التمرير
    initializeScrollAnimations();
    
    // تحديث الإحصائيات كل 30 ثانية
    setInterval(updateStats, 30000);
}

function initializeScrollAnimations() {
    // مراقب التقاطعات لتحريك العناصر
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'slideInUp 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // مراقبة العناصر
    const elementsToAnimate = document.querySelectorAll(
        '.feature-card, .stat-card, .footer-brand, .footer-links, .footer-info'
    );
    
    elementsToAnimate.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        observer.observe(element);
    });
}

// تحديث الإحصائيات مع تحريك الأرقام
async function updateStats() {
    try {
        const { data: recordings } = await supabase
            .from('recordings')
            .select('duration, status');
            
        const { data: speakers } = await supabase
            .from('speakers')
            .select('dialect');
        
        if (recordings && speakers) {
            const stats = {
                totalRecordings: recordings.length,
                totalSpeakers: speakers.length,
                totalMinutes: Math.round(recordings.reduce((sum, r) => sum + (r.duration || 0), 0) / 60),
                totalDialects: [...new Set(speakers.map(s => s.dialect))].length
            };
            
            // تحديث العدادات مع الحركة
            Object.keys(stats).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    animateNumber(element, stats[key]);
                }
            });
        }
    } catch (error) {
        console.error('خطأ في تحديث الإحصائيات:', error);
    }
}

function animateNumber(element, target) {
    const current = parseInt(element.textContent) || 0;
    const increment = (target - current) / 60; // 60 إطار
    let frame = 0;
    
    const animate = () => {
        frame++;
        const value = Math.round(current + (increment * frame));
        
        if (frame < 60 && Math.abs(target - value) > 0) {
            element.textContent = value.toLocaleString('ar-SA');
            requestAnimationFrame(animate);
        } else {
            element.textContent = target.toLocaleString('ar-SA');
        }
    };
    
    if (increment !== 0) {
        requestAnimationFrame(animate);
    }
}

// إضافة تأثيرات تفاعلية للبطاقات
document.addEventListener('DOMContentLoaded', function() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // تأثير تحريك الشعار
    const heroLogo = document.querySelector('.hero-logo-img');
    if (heroLogo) {
        heroLogo.addEventListener('mouseenter', function() {
            this.style.animation = 'logoSpin 1s ease-in-out';
        });
        
        heroLogo.addEventListener('animationend', function() {
            this.style.animation = 'logoFloat 3s ease-in-out infinite';
        });
    }
    
    // إضافة أنماط CSS للحركات
    const styles = document.createElement('style');
    styles.textContent = `
        @keyframes logoSpin {
            from { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            to { transform: rotate(360deg) scale(1); }
        }
        
        .feature-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 255, 136, 0.3);
        }
        
        .hero-actions .btn {
            transition: all 0.3s ease;
        }
        
        .hero-actions .btn:hover {
            transform: translateY(-3px) scale(1.05);
        }
    `;
    document.head.appendChild(styles);
});