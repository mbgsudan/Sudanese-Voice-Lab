// JavaScript خاص بصفحة الإدارة

const ADMIN_PASSWORD = '70003mbgz';
let isAuthenticated = false;
let currentAdminFilter = '';
let currentRecordingId = null;

function pageInit() {
    console.log('تم تحميل صفحة الإدارة');
    
    // التحقق من المصادقة
    checkAuthentication();
    
    // تهيئة نظام تسجيل الدخول
    setupAuthentication();
    
    // تهيئة التبويبات
    setupTabs();
    
    // تهيئة النوافذ المنبثقة
    setupAdminModals();
}

// التحقق من المصادقة
function checkAuthentication() {
    const isAuth = sessionStorage.getItem('admin_authenticated');
    if (isAuth === 'true') {
        isAuthenticated = true;
        showAdminContent();
    } else {
        showLoginModal();
    }
}

// إعداد نظام تسجيل الدخول
function setupAuthentication() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        
        if (password === ADMIN_PASSWORD) {
            isAuthenticated = true;
            sessionStorage.setItem('admin_authenticated', 'true');
            showAdminContent();
            sawtna.showNotification('تم تسجيل الدخول بنجاح! مرحباً بك في لوحة الإدارة', 'success');
        } else {
            sawtna.showNotification('كلمة المرور غير صحيحة', 'error');
            document.getElementById('adminPassword').value = '';
        }
    });
    
    logoutBtn.addEventListener('click', logout);
}

// عرض نافذة تسجيل الدخول
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
}

// عرض محتوى الإدارة
function showAdminContent() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    
    // تحميل البيانات الافتراضية
    loadAdminRecordings();
}

// تسجيل الخروج
function logout() {
    isAuthenticated = false;
    sessionStorage.removeItem('admin_authenticated');
    showLoginModal();
    sawtna.showNotification('تم تسجيل الخروج بنجاح', 'info');
}

// تهيئة التبويبات
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // إزالة التفعيل من جميع التبويبات
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // تفعيل التبويب المحدد
            btn.classList.add('active');
            const targetTab = document.getElementById(btn.dataset.tab + 'Tab');
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // تحميل بيانات التبويب
            loadTabData(btn.dataset.tab);
        });
    });
    
    // تهيئة فلتر التسجيلات
    const statusFilter = document.getElementById('adminStatusFilter');
    statusFilter.addEventListener('change', () => {
        currentAdminFilter = statusFilter.value;
        loadAdminRecordings();
    });
}

// تحميل بيانات التبويب
function loadTabData(tab) {
    switch (tab) {
        case 'recordings':
            loadAdminRecordings();
            break;
        case 'speakers':
            loadAdminSpeakers();
            break;
        case 'analytics':
            loadAdminAnalytics();
            break;
    }
}

// تحميل تسجيلات الإدارة
async function loadAdminRecordings() {
    const container = document.getElementById('adminRecordingsContainer');
    
    try {
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
        
        // تطبيق الفلتر
        if (currentAdminFilter) {
            query = query.eq('status', currentAdminFilter);
        }
        
        const { data: recordings, error } = await query;
        
        if (error) throw error;
        
        displayAdminRecordings(recordings);
        
    } catch (error) {
        console.error('خطأ في تحميل التسجيلات:', error);
        container.innerHTML = `
            <div class="empty-message">
                <h3>خطأ في التحميل</h3>
                <p>حدث خطأ أثناء تحميل التسجيلات</p>
            </div>
        `;
    }
}

// عرض تسجيلات الإدارة
function displayAdminRecordings(recordings) {
    const container = document.getElementById('adminRecordingsContainer');
    
    if (!recordings || recordings.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <h3>لا توجد تسجيلات</h3>
                <p>لم يتم العثور على تسجيلات تطابق المعايير المحددة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recordings.map(recording => `
        <div class="admin-recording-card">
            <div class="recording-row">
                <div class="recording-details">
                    <h3>👤 ${recording.speakers.name}</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">الجنس:</span>
                            <span>${sawtna.getGenderText(recording.speakers.gender)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">العمر:</span>
                            <span>${recording.speakers.age} سنة</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">اللهجة:</span>
                            <span>${sawtna.getDialectName(recording.speakers.dialect)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">المدة:</span>
                            <span>${sawtna.formatDuration(recording.duration)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">التاريخ:</span>
                            <span>${sawtna.formatDate(recording.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">الحالة:</span>
                            <span class="status-${recording.status}">${sawtna.getStatusText(recording.status)}</span>
                        </div>
                    </div>
                    <div class="recording-text-preview">
                        "${recording.text}"
                    </div>
                </div>
                
                <div class="recording-actions-admin">
                    <button onclick="playAdminRecording('${recording.file_path}', '${recording.id}')" 
                            class="admin-action-btn btn-play-admin">
                        🎵 تشغيل
                    </button>
                    ${recording.status === 'pending' ? `
                        <button onclick="approveRecording('${recording.id}')" 
                                class="admin-action-btn btn-approve">
                            ✅ قبول
                        </button>
                        <button onclick="rejectRecording('${recording.id}')" 
                                class="admin-action-btn btn-reject">
                            ❌ رفض
                        </button>
                    ` : `
                        <button onclick="changeRecordingStatus('${recording.id}', 'pending')" 
                                class="admin-action-btn btn-secondary">
                            🔄 إعادة للمراجعة
                        </button>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

// تشغيل التسجيل في الإدارة
async function playAdminRecording(filePath, recordingId) {
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(filePath, 3600);
        
        if (error) throw error;
        
        // إعداد المشغل
        const audioPlayer = document.getElementById('adminAudioPlayer');
        const audioModal = document.getElementById('adminAudioModal');
        const audioDetails = document.getElementById('adminAudioDetails');
        
        currentRecordingId = recordingId;
        audioPlayer.src = data.signedUrl;
        
        // عرض معلومات التسجيل
        audioDetails.innerHTML = `
            <h4>تفاصيل التسجيل</h4>
            <p><strong>معرف التسجيل:</strong> ${recordingId}</p>
            <p><strong>مسار الملف:</strong> ${filePath}</p>
        `;
        
        // عرض النافذة
        audioModal.style.display = 'flex';
        
    } catch (error) {
        console.error('خطأ في تشغيل التسجيل:', error);
        sawtna.showNotification('خطأ في تشغيل التسجيل', 'error');
    }
}

// قبول التسجيل
async function approveRecording(recordingId) {
    await changeRecordingStatus(recordingId, 'approved');
}

// رفض التسجيل
async function rejectRecording(recordingId) {
    await changeRecordingStatus(recordingId, 'rejected');
}

// تغيير حالة التسجيل
async function changeRecordingStatus(recordingId, status) {
    try {
        const { error } = await supabase
            .from('recordings')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', recordingId);
        
        if (error) throw error;
        
        const statusText = sawtna.getStatusText(status);
        sawtna.showNotification(`تم تغيير حالة التسجيل إلى: ${statusText}`, 'success');
        
        // إعادة تحميل التسجيلات
        loadAdminRecordings();
        
    } catch (error) {
        console.error('خطأ في تغيير حالة التسجيل:', error);
        sawtna.showNotification('خطأ في تغيير حالة التسجيل', 'error');
    }
}

// تحميل متحدثي الإدارة
async function loadAdminSpeakers() {
    const container = document.getElementById('adminSpeakersContainer');
    
    try {
        container.innerHTML = `
            <div class="loading-message">
                <div class="loading"></div>
                <p>جاري تحميل المتحدثين...</p>
            </div>
        `;
        
        const { data: speakers, error } = await supabase
            .from('speakers')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        // حساب عدد التسجيلات لكل متحدث
        const { data: recordings } = await supabase
            .from('recordings')
            .select('speaker_id, status');
        
        const speakerStats = {};
        if (recordings) {
            recordings.forEach(recording => {
                const speakerId = recording.speaker_id;
                if (!speakerStats[speakerId]) {
                    speakerStats[speakerId] = { total: 0, approved: 0, pending: 0, rejected: 0 };
                }
                speakerStats[speakerId].total++;
                speakerStats[speakerId][recording.status]++;
            });
        }
        
        displayAdminSpeakers(speakers, speakerStats);
        
    } catch (error) {
        console.error('خطأ في تحميل المتحدثين:', error);
        container.innerHTML = `
            <div class="empty-message">
                <h3>خطأ في التحميل</h3>
                <p>حدث خطأ أثناء تحميل المتحدثين</p>
            </div>
        `;
    }
}

// عرض متحدثي الإدارة
function displayAdminSpeakers(speakers, stats) {
    const container = document.getElementById('adminSpeakersContainer');
    
    if (!speakers || speakers.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <h3>لا يوجد متحدثون</h3>
                <p>لم يتم تسجيل أي متحدثين بعد</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = speakers.map(speaker => {
        const speakerStats = stats[speaker.id] || { total: 0, approved: 0, pending: 0, rejected: 0 };
        const genderIcon = speaker.gender === 'male' ? '👨' : '👩';
        
        return `
            <div class="admin-speaker-card">
                <div class="speaker-header">
                    <div class="speaker-avatar">${genderIcon}</div>
                    <div class="speaker-info">
                        <h3>${speaker.name}</h3>
                        <div class="speaker-meta">
                            ${sawtna.getGenderText(speaker.gender)} • ${speaker.age} • ${sawtna.getDialectName(speaker.dialect)}
                        </div>
                    </div>
                </div>
                
                <div class="speaker-details">
                    <div class="speaker-stat">
                        <span>إجمالي التسجيلات:</span>
                        <strong>${speakerStats.total}</strong>
                    </div>
                    <div class="speaker-stat">
                        <span>المقبولة:</span>
                        <strong style="color: var(--accent-green);">${speakerStats.approved || 0}</strong>
                    </div>
                    <div class="speaker-stat">
                        <span>قيد المراجعة:</span>
                        <strong style="color: #ffa500;">${speakerStats.pending || 0}</strong>
                    </div>
                    <div class="speaker-stat">
                        <span>المرفوضة:</span>
                        <strong style="color: #ff4444;">${speakerStats.rejected || 0}</strong>
                    </div>
                    <div class="speaker-stat">
                        <span>تاريخ التسجيل:</span>
                        <span>${sawtna.formatDate(speaker.created_at)}</span>
                    </div>
                </div>
                
                <div class="speaker-actions">
                    <button onclick="editSpeaker('${speaker.id}')" class="btn-edit">
                        ✏️ تعديل
                    </button>
                    <button onclick="deleteSpeaker('${speaker.id}', '${speaker.name}')" class="btn-delete">
                        🗑️ حذف
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// تحميل إحصائيات الإدارة
async function loadAdminAnalytics() {
    try {
        // جلب البيانات
        const { data: recordings } = await supabase
            .from('recordings')
            .select('*, speakers(gender, dialect, age)');
        
        const { data: speakers } = await supabase
            .from('speakers')
            .select('*');
        
        if (recordings && speakers) {
            // حساب الإحصائيات
            const totalRecordings = recordings.length;
            const totalSpeakers = speakers.length;
            const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
            const approvedRecordings = recordings.filter(r => r.status === 'approved').length;
            const approvalRate = totalRecordings > 0 ? Math.round((approvedRecordings / totalRecordings) * 100) : 0;
            
            // تحديث الأرقام
            document.getElementById('totalAdminRecordings').textContent = totalRecordings.toLocaleString('ar-SA');
            document.getElementById('totalAdminSpeakers').textContent = totalSpeakers.toLocaleString('ar-SA');
            document.getElementById('totalAdminDuration').textContent = Math.round(totalDuration / 60).toLocaleString('ar-SA');
            document.getElementById('approvalRate').textContent = approvalRate + '%';
            
            // إنشاء الرسوم البيانية
            generateAdminCharts(recordings, speakers);
        }
        
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// إنشاء الرسوم البيانية للإدارة
function generateAdminCharts(recordings, speakers) {
    // توزيع الجنس
    const genderStats = speakers.reduce((acc, speaker) => {
        acc[speaker.gender] = (acc[speaker.gender] || 0) + 1;
        return acc;
    }, {});
    
    // توزيع اللهجة
    const dialectStats = speakers.reduce((acc, speaker) => {
        acc[speaker.dialect] = (acc[speaker.dialect] || 0) + 1;
        return acc;
    }, {});
    
    // توزيع الحالة
    const statusStats = recordings.reduce((acc, recording) => {
        acc[recording.status] = (acc[recording.status] || 0) + 1;
        return acc;
    }, {});
    
    // توزيع العمر
    const ageStats = speakers.reduce((acc, speaker) => {
        acc[speaker.age] = (acc[speaker.age] || 0) + 1;
        return acc;
    }, {});
    
    // عرض الرسوم البيانية
    displayChart('genderChart', genderStats, {
        'male': 'ذكر',
        'female': 'أنثى'
    });
    
    displayChart('dialectChart', dialectStats, {
        'khartoum': 'خرطوم',
        'gezira': 'الجزيرة',
        'kassala': 'كسلا',
        'darfur': 'دارفور',
        'kordofan': 'كردفان'
    });
    
    displayChart('statusChart', statusStats, {
        'pending': 'قيد المراجعة',
        'approved': 'مقبول',
        'rejected': 'مرفوض'
    });
    
    displayChart('ageChart', ageStats);
}

// عرض الرسم البياني
function displayChart(containerId, data, labels = {}) {
    const container = document.getElementById(containerId);
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    
    if (total === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">لا توجد بيانات</p>';
        return;
    }
    
    container.innerHTML = Object.entries(data).map(([key, value]) => {
        const percentage = Math.round((value / total) * 100);
        const label = labels[key] || key;
        
        return `
            <div class="chart-item">
                <div class="chart-label">${label}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="chart-value">${value}</div>
            </div>
        `;
    }).join('');
}

// تهيئة النوافذ المنبثقة
function setupAdminModals() {
    // نافذة إضافة متحدث
    const addSpeakerBtn = document.getElementById('addSpeakerFromAdmin');
    const addSpeakerModal = document.getElementById('addSpeakerAdminModal');
    const closeModalBtn = document.getElementById('closeAdminSpeakerModal');
    const cancelBtn = document.getElementById('cancelAdminSpeakerBtn');
    const addSpeakerForm = document.getElementById('addAdminSpeakerForm');
    
    addSpeakerBtn.addEventListener('click', () => {
        addSpeakerModal.style.display = 'flex';
    });
    
    function closeAddSpeakerModal() {
        addSpeakerModal.style.display = 'none';
        addSpeakerForm.reset();
    }
    
    closeModalBtn.addEventListener('click', closeAddSpeakerModal);
    cancelBtn.addEventListener('click', closeAddSpeakerModal);
    
    addSpeakerModal.addEventListener('click', (e) => {
        if (e.target === addSpeakerModal) {
            closeAddSpeakerModal();
        }
    });
    
    addSpeakerForm.addEventListener('submit', addSpeakerFromAdmin);
    
    // نافذة الصوت
    const audioModal = document.getElementById('adminAudioModal');
    const closeAudioBtn = document.getElementById('closeAdminAudioModal');
    const approveFromModal = document.getElementById('approveFromModal');
    const rejectFromModal = document.getElementById('rejectFromModal');
    
    function closeAudioModal() {
        audioModal.style.display = 'none';
        document.getElementById('adminAudioPlayer').pause();
        currentRecordingId = null;
    }
    
    closeAudioBtn.addEventListener('click', closeAudioModal);
    
    audioModal.addEventListener('click', (e) => {
        if (e.target === audioModal) {
            closeAudioModal();
        }
    });
    
    approveFromModal.addEventListener('click', () => {
        if (currentRecordingId) {
            approveRecording(currentRecordingId);
            closeAudioModal();
        }
    });
    
    rejectFromModal.addEventListener('click', () => {
        if (currentRecordingId) {
            rejectRecording(currentRecordingId);
            closeAudioModal();
        }
    });
}

// إضافة متحدث من الإدارة
async function addSpeakerFromAdmin(event) {
    event.preventDefault();
    
    const name = document.getElementById('adminSpeakerName').value;
    const gender = document.getElementById('adminSpeakerGender').value;
    const age = document.getElementById('adminSpeakerAge').value;
    const dialect = document.getElementById('adminSpeakerDialect').value;
    
    try {
        const { error } = await supabase
            .from('speakers')
            .insert({
                name,
                gender,
                age,
                dialect,
                created_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        sawtna.showNotification('تمت إضافة المتحدث بنجاح!', 'success');
        
        // إغلاق النافذة وإعادة التحميل
        document.getElementById('addSpeakerAdminModal').style.display = 'none';
        document.getElementById('addAdminSpeakerForm').reset();
        loadAdminSpeakers();
        
    } catch (error) {
        console.error('خطأ في إضافة المتحدث:', error);
        sawtna.showNotification('خطأ في إضافة المتحدث', 'error');
    }
}

// حذف متحدث
async function deleteSpeaker(speakerId, speakerName) {
    if (confirm(`هل أنت متأكد من حذف المتحدث "${speakerName}"؟\nسيتم حذف جميع تسجيلاته أيضاً.`)) {
        try {
            const { error } = await supabase
                .from('speakers')
                .delete()
                .eq('id', speakerId);
            
            if (error) throw error;
            
            sawtna.showNotification('تم حذف المتحدث بنجاح', 'success');
            loadAdminSpeakers();
            
        } catch (error) {
            console.error('خطأ في حذف المتحدث:', error);
            sawtna.showNotification('خطأ في حذف المتحدث', 'error');
        }
    }
}

// تعديل متحدث (للتطوير المستقبلي)
function editSpeaker(speakerId) {
    sawtna.showNotification('ميزة التعديل ستكون متاحة قريباً', 'info');
}