// JavaScript خاص بصفحة المتابعة

let currentFilters = {
    speaker: '',
    status: ''
};

function pageInit() {
    console.log('تم تحميل صفحة المتابعة');
    
    // تحميل المتحدثين للفلتر
    loadSpeakersForFilter();
    
    // تحميل التسجيلات
    loadRecordings();
    
    // تهيئة الفلاتر
    setupFilters();
    
    // تهيئة النوافذ المنبثقة
    setupAudioModal();
}

// تحميل المتحدثين لقائمة التصفية
async function loadSpeakersForFilter() {
    try {
        const { data: speakers, error } = await supabase
            .from('speakers')
            .select('*')
            .order('name');

        if (error) throw error;

        const speakerFilter = document.getElementById('speakerFilter');
        speakerFilter.innerHTML = '<option value="">جميع المتحدثين</option>';
        
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = speaker.id;
            option.textContent = speaker.name;
            speakerFilter.appendChild(option);
        });
    } catch (error) {
        console.error('خطأ في تحميل المتحدثين:', error);
    }
}

// تحميل التسجيلات مع التصفية
async function loadRecordings() {
    const container = document.getElementById('recordingsContainer');
    
    try {
        // عرض رسالة التحميل
        container.innerHTML = `
            <div class="loading-message">
                <div class="loading"></div>
                <p>جاري تحميل التسجيلات...</p>
            </div>
        `;
        
        // بناء الاستعلام
        let query = supabase
            .from('recordings')
            .select(`
                *,
                speakers (
                    name,
                    gender,
                    age,
                    dialect
                )
            `)
            .order('created_at', { ascending: false });

        // تطبيق الفلاتر
        if (currentFilters.speaker) {
            query = query.eq('speaker_id', currentFilters.speaker);
        }
        if (currentFilters.status) {
            query = query.eq('status', currentFilters.status);
        }

        const { data: recordings, error } = await query;

        if (error) throw error;

        // عرض التسجيلات
        displayRecordings(recordings);
        
        // تحديث الإحصائيات
        updateUserStats(recordings);

    } catch (error) {
        console.error('خطأ في تحميل التسجيلات:', error);
        container.innerHTML = `
            <div class="empty-message">
                <h3>خطأ في التحميل</h3>
                <p>حدث خطأ أثناء تحميل التسجيلات. يرجى إعادة المحاولة.</p>
                <button onclick="loadRecordings()" class="btn btn-primary">إعادة المحاولة</button>
            </div>
        `;
    }
}

// عرض التسجيلات
function displayRecordings(recordings) {
    const container = document.getElementById('recordingsContainer');
    
    if (!recordings || recordings.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <h3>لا توجد تسجيلات</h3>
                <p>لم يتم العثور على تسجيلات تطابق معايير البحث المحددة.</p>
                <a href="record.html" class="btn btn-primary">إضافة تسجيل جديد</a>
            </div>
        `;
        return;
    }

    container.innerHTML = recordings.map(recording => `
        <div class="recording-card" data-recording-id="${recording.id}">
            <div class="recording-header">
                <div class="recording-info">
                    <h3>👤 ${recording.speakers.name}</h3>
                    <div class="recording-meta">
                        <div class="meta-item">
                            <span>📅</span>
                            <span>${sawtna.formatDate(recording.created_at)}</span>
                        </div>
                        <div class="meta-item">
                            <span>⏱️</span>
                            <span>${sawtna.formatDuration(recording.duration)}</span>
                        </div>
                        <div class="meta-item">
                            <span>👥</span>
                            <span>${sawtna.getGenderText(recording.speakers.gender)}</span>
                        </div>
                        <div class="meta-item">
                            <span>🗺️</span>
                            <span>${sawtna.getDialectName(recording.speakers.dialect)}</span>
                        </div>
                    </div>
                </div>
                <div class="status-badge status-${recording.status}">
                    ${sawtna.getStatusText(recording.status)}
                </div>
            </div>
            
            <div class="recording-text">
                "${recording.text}"
            </div>
            
            <div class="recording-actions">
                <button onclick="playRecording('${recording.file_path}', '${recording.id}')" class="play-btn">
                    🎵 تشغيل التسجيل
                </button>
                ${recording.status === 'rejected' ? `
                    <button onclick="resubmitRecording('${recording.id}')" class="resubmit-btn">
                        🔄 إعادة إرسال
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// تحديث إحصائيات المستخدم
function updateUserStats(recordings) {
    const total = recordings.length;
    const approved = recordings.filter(r => r.status === 'approved').length;
    const pending = recordings.filter(r => r.status === 'pending').length;
    const rejected = recordings.filter(r => r.status === 'rejected').length;

    // تحديث العدادات
    animateStatNumber('totalUserRecordings', total);
    animateStatNumber('approvedUserRecordings', approved);
    animateStatNumber('pendingUserRecordings', pending);
    animateStatNumber('rejectedUserRecordings', rejected);
}

// تحريك الأرقام
function animateStatNumber(elementId, targetNumber) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startNumber = parseInt(element.textContent) || 0;
    const difference = targetNumber - startNumber;
    const duration = 1000; // ميلي ثانية
    const steps = 30;
    const stepValue = difference / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
        currentStep++;
        const currentNumber = startNumber + (stepValue * currentStep);
        
        if (currentStep >= steps) {
            element.textContent = targetNumber;
            clearInterval(interval);
        } else {
            element.textContent = Math.round(currentNumber);
        }
    }, stepDuration);
}

// تهيئة نظام التصفية
function setupFilters() {
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const speakerFilter = document.getElementById('speakerFilter');
    const statusFilter = document.getElementById('statusFilter');

    // تطبيق التصفية
    applyFilterBtn.addEventListener('click', () => {
        currentFilters.speaker = speakerFilter.value;
        currentFilters.status = statusFilter.value;
        loadRecordings();
    });

    // مسح التصفية
    clearFilterBtn.addEventListener('click', () => {
        currentFilters.speaker = '';
        currentFilters.status = '';
        speakerFilter.value = '';
        statusFilter.value = '';
        loadRecordings();
    });

    // تطبيق الفلتر عند التغيير
    speakerFilter.addEventListener('change', () => {
        currentFilters.speaker = speakerFilter.value;
        loadRecordings();
    });

    statusFilter.addEventListener('change', () => {
        currentFilters.status = statusFilter.value;
        loadRecordings();
    });
}

// تشغيل التسجيل
async function playRecording(filePath, recordingId) {
    try {
        // إنشاء رابط موقع للملف
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(filePath, 3600); // صالح لساعة واحدة

        if (error) throw error;

        // إعداد المشغل في النافذة المنبثقة
        const audioPlayer = document.getElementById('modalAudioPlayer');
        const audioModal = document.getElementById('audioModal');
        const audioInfo = document.getElementById('audioInfo');
        
        audioPlayer.src = data.signedUrl;
        
        // عرض معلومات التسجيل
        const recordingCard = document.querySelector(`[data-recording-id="${recordingId}"]`);
        if (recordingCard) {
            const speakerName = recordingCard.querySelector('h3').textContent;
            const recordingText = recordingCard.querySelector('.recording-text').textContent;
            
            audioInfo.innerHTML = `
                <h4>معلومات التسجيل</h4>
                <p><strong>المتحدث:</strong> ${speakerName}</p>
                <p><strong>النص:</strong> ${recordingText}</p>
            `;
        }
        
        // عرض النافذة المنبثقة
        audioModal.style.display = 'flex';
        
        sawtna.showNotification('جاري تحميل التسجيل...', 'info');
        
    } catch (error) {
        console.error('خطأ في تشغيل التسجيل:', error);
        sawtna.showNotification('خطأ في تشغيل التسجيل', 'error');
    }
}

// إعادة إرسال التسجيل المرفوض
async function resubmitRecording(recordingId) {
    try {
        const { error } = await supabase
            .from('recordings')
            .update({ 
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', recordingId);

        if (error) throw error;

        sawtna.showNotification('تم إعادة إرسال التسجيل للمراجعة بنجاح!', 'success');
        
        // إعادة تحميل التسجيلات
        loadRecordings();
        
    } catch (error) {
        console.error('خطأ في إعادة الإرسال:', error);
        sawtna.showNotification('خطأ في إعادة إرسال التسجيل', 'error');
    }
}

// تهيئة نافذة تشغيل الصوت
function setupAudioModal() {
    const audioModal = document.getElementById('audioModal');
    const closeAudioModal = document.getElementById('closeAudioModal');
    const audioPlayer = document.getElementById('modalAudioPlayer');

    // إغلاق النافذة
    function closeModal() {
        audioModal.style.display = 'none';
        audioPlayer.pause();
        audioPlayer.src = '';
    }

    closeAudioModal.addEventListener('click', closeModal);

    // إغلاق عند النقر خارج النافذة
    audioModal.addEventListener('click', (e) => {
        if (e.target === audioModal) {
            closeModal();
        }
    });

    // إغلاق بمفتاح Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && audioModal.style.display === 'flex') {
            closeModal();
        }
       <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/dist/umd/supabase.min.js"></script>
<script src="config.js"></script>
<script src="script.js"></script>
<script src="record.js"></script>
    });

}
