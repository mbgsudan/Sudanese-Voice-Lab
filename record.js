// JavaScript خاص بصفحة التسجيل

let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let timerInterval;
let audioContext;
let analyser;
let microphone;
let animationFrame;
let isRecording = false;

function pageInit() {
    console.log('تم تحميل صفحة التسجيل');
    
    // تحميل المتحدثين
    loadSpeakers();
    
    // تحميل نص عشوائي
    loadRandomText();
    
    // تهيئة واجهة التسجيل
    setupRecordingInterface();
    
    // تهيئة النوافذ المنبثقة
    setupModals();
    
    // إنشاء أعمدة المؤشر المرئي
    createVisualizerBars();
}

// تحميل قائمة المتحدثين من قاعدة البيانات
async function loadSpeakers() {
    try {
        const { data: speakers, error } = await supabase
            .from('speakers')
            .select('*')
            .order('name');

        if (error) throw error;

        const speakerSelect = document.getElementById('speakerSelect');
        speakerSelect.innerHTML = '<option value="">اختر المتحدث...</option>';
        
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = speaker.id;
            option.textContent = `${speaker.name} (${getGenderText(speaker.gender)}, ${speaker.age}, ${getDialectName(speaker.dialect)})`;
            speakerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('خطأ في تحميل المتحدثين:', error);
        sawtna.showNotification('خطأ في تحميل قائمة المتحدثين', 'error');
    }
}

// تحميل نص عشوائي للقراءة
function loadRandomText() {
    const textContent = document.getElementById('textContent');
    textContent.textContent = sawtna.getRandomText();
}

// تهيئة واجهة التسجيل
function setupRecordingInterface() {
    const recordBtn = document.getElementById('recordBtn');
    const newTextBtn = document.getElementById('newTextBtn');
    const reRecordBtn = document.getElementById('reRecordBtn');
    const submitBtn = document.getElementById('submitBtn');
    const recordingForm = document.getElementById('recordingForm');
    const newRecordingBtn = document.getElementById('newRecordingBtn');

    // أزرار التحكم
    recordBtn.addEventListener('click', toggleRecording);
    newTextBtn.addEventListener('click', loadRandomText);
    reRecordBtn.addEventListener('click', resetRecording);
    newRecordingBtn.addEventListener('click', startNewRecording);
    
    // إرسال النموذج
    recordingForm.addEventListener('submit', submitRecording);
}

// تبديل حالة التسجيل
async function toggleRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const recordIcon = recordBtn.querySelector('.record-icon');
    const recordText = recordBtn.querySelector('.record-text');

    if (!isRecording) {
        try {
            await startRecording();
            isRecording = true;
            recordBtn.classList.add('recording');
            recordIcon.textContent = '⏹️';
            recordText.textContent = 'إيقاف';
            sawtna.showNotification('بدأ التسجيل...', 'info');
        } catch (error) {
            console.error('خطأ في بدء التسجيل:', error);
            sawtna.showNotification('خطأ في الوصول إلى الميكروفون', 'error');
        }
    } else {
        stopRecording();
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordIcon.textContent = '🎤';
        recordText.textContent = 'بدء التسجيل';
        sawtna.showNotification('تم إيقاف التسجيل', 'success');
    }
}

// بدء التسجيل
async function startRecording() {
    try {
        // طلب إذن الميكروفون
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100
            }
        });

        // إعداد السياق الصوتي للمؤشر المرئي
        setupAudioContext(stream);

        // إعداد مسجل الصوت
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/webm'
        });

        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            stopAudioContext();
            createAudioBlob();
        };

        // بدء التسجيل
        mediaRecorder.start();
        recordingStartTime = Date.now();
        startTimer();
        startVisualization();
        
    } catch (error) {
        throw new Error('لا يمكن الوصول إلى الميكروفون');
    }
}

// إيقاف التسجيل
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        stopTimer();
        stopVisualization();
    }
}

// إعداد السياق الصوتي
function setupAudioContext(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
}

// إيقاف السياق الصوتي
function stopAudioContext() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

// إنشاء أعمدة المؤشر المرئي
function createVisualizerBars() {
    const visualizerBars = document.getElementById('visualizerBars');
    visualizerBars.innerHTML = '';
    
    for (let i = 0; i < 32; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        visualizerBars.appendChild(bar);
    }
}

// بدء المؤشر المرئي
function startVisualization() {
    const visualizerBars = document.getElementById('visualizerBars');
    const messageElement = document.querySelector('.visualizer-message');
    
    visualizerBars.classList.add('active');
    if (messageElement) {
        messageElement.style.display = 'none';
    }
    
    updateVisualization();
}

// إيقاف المؤشر المرئي
function stopVisualization() {
    const visualizerBars = document.getElementById('visualizerBars');
    const messageElement = document.querySelector('.visualizer-message');
    const bars = visualizerBars.querySelectorAll('.visualizer-bar');
    
    visualizerBars.classList.remove('active');
    if (messageElement) {
        messageElement.style.display = 'block';
    }
    
    // إعادة تعيين ارتفاع الأعمدة
    bars.forEach(bar => {
        bar.style.height = '10px';
    });
}

// تحديث المؤشر المرئي
function updateVisualization() {
    if (!analyser || !isRecording) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    const bars = document.querySelectorAll('.visualizer-bar');
    const step = Math.floor(bufferLength / bars.length);
    
    bars.forEach((bar, index) => {
        const value = dataArray[index * step];
        const height = Math.max(10, (value / 255) * 80);
        bar.style.height = height + 'px';
    });
    
    animationFrame = requestAnimationFrame(updateVisualization);
}

// بدء العداد الزمني
function startTimer() {
    const timerElement = document.getElementById('timer');
    
    timerInterval = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTime) / 1000;
        timerElement.textContent = sawtna.formatTime(elapsed);
    }, 100);
}

// إيقاف العداد الزمني
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// إنشاء ملف الصوت
function createAudioBlob() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audioPlayer = document.getElementById('audioPlayer');
    const audioReview = document.getElementById('audioReview');
    
    audioPlayer.src = audioUrl;
    audioReview.style.display = 'block';
    
    // التمرير إلى قسم المراجعة
    audioReview.scrollIntoView({ behavior: 'smooth' });
}

// إعادة تعيين التسجيل
function resetRecording() {
    const audioReview = document.getElementById('audioReview');
    const timerElement = document.getElementById('timer');
    
    audioReview.style.display = 'none';
    timerElement.textContent = '00:00';
    audioChunks = [];
    
    // إعادة تعيين المؤشر المرئي
    stopVisualization();
    createVisualizerBars();
    
    sawtna.showNotification('تم إعادة تعيين التسجيل', 'info');
}

// إرسال التسجيل
async function submitRecording(event) {
    event.preventDefault();
    
    const speakerId = document.getElementById('speakerSelect').value;
    const textContent = document.getElementById('textContent').textContent;
    const submitBtn = document.getElementById('submitBtn');
    
    // التحقق من صحة البيانات
    if (!speakerId) {
        sawtna.showNotification('يرجى اختيار المتحدث', 'error');
        return;
    }
    
    if (audioChunks.length === 0) {
        sawtna.showNotification('يرجى تسجيل الصوت أولاً', 'error');
        return;
    }
    
    try {
        sawtna.showLoading(submitBtn);
        
        // إنشاء ملف الصوت
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const timestamp = Date.now();
        const fileName = `recording_${speakerId}_${timestamp}.webm`;
        
        // رفع الملف إلى التخزين
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(fileName, audioBlob);
            
        if (uploadError) throw uploadError;
        
        // حفظ معلومات التسجيل في قاعدة البيانات
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);
        
        const { data: recordingData, error: recordingError } = await supabase
            .from('recordings')
            .insert({
                speaker_id: speakerId,
                text: textContent,
                file_path: fileName,
                status: 'pending',
                duration: duration,
                created_at: new Date().toISOString()
            });
            
        if (recordingError) throw recordingError;
        
        // عرض رسالة النجاح
        showSuccessMessage();
        
    } catch (error) {
        console.error('خطأ في إرسال التسجيل:', error);
        sawtna.showNotification('خطأ في إرسال التسجيل. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
        sawtna.hideLoading(submitBtn);
    }
}

// عرض رسالة النجاح
function showSuccessMessage() {
    const submissionStatus = document.getElementById('submissionStatus');
    submissionStatus.style.display = 'flex';
}

// بدء تسجيل جديد
function startNewRecording() {
    const submissionStatus = document.getElementById('submissionStatus');
    const recordingForm = document.getElementById('recordingForm');
    
    submissionStatus.style.display = 'none';
    resetRecording();
    loadRandomText();
    recordingForm.reset();
    
    // التمرير إلى أعلى الصفحة
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// تهيئة النوافذ المنبثقة
function setupModals() {
    const addSpeakerBtn = document.getElementById('addSpeakerBtn');
    const addSpeakerModal = document.getElementById('addSpeakerModal');
    const closeSpeakerModal = document.getElementById('closeSpeakerModal');
    const cancelSpeakerBtn = document.getElementById('cancelSpeakerBtn');
    const addSpeakerForm = document.getElementById('addSpeakerForm');

    // فتح النافذة
    addSpeakerBtn.addEventListener('click', () => {
        addSpeakerModal.style.display = 'flex';
    });

    // إغلاق النافذة
    function closeModal() {
        addSpeakerModal.style.display = 'none';
        addSpeakerForm.reset();
    }

    closeSpeakerModal.addEventListener('click', closeModal);
    cancelSpeakerBtn.addEventListener('click', closeModal);

    // إغلاق عند النقر خارج النافذة
    addSpeakerModal.addEventListener('click', (e) => {
        if (e.target === addSpeakerModal) {
            closeModal();
        }
    });

    // إرسال نموذج إضافة متحدث
    addSpeakerForm.addEventListener('submit', addNewSpeaker);
}

// إضافة متحدث جديد
async function addNewSpeaker(event) {
    event.preventDefault();
    
    const name = document.getElementById('speakerName').value;
    const gender = document.getElementById('speakerGender').value;
    const age = document.getElementById('speakerAge').value;
    const dialect = document.getElementById('speakerDialect').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    try {
        sawtna.showLoading(submitBtn);
        
        const { data, error } = await supabase
            .from('speakers')
            .insert({
                name,
                gender,
                age,
                dialect,
                created_at: new Date().toISOString()
            })
            .select();
            
        if (error) throw error;
        
        sawtna.showNotification('تمت إضافة المتحدث بنجاح!', 'success');
        
        // إغلاق النافذة وإعادة تحميل القائمة
        document.getElementById('addSpeakerModal').style.display = 'none';
        document.getElementById('addSpeakerForm').reset();
        
        await loadSpeakers();
        
        // اختيار المتحدث الجديد
        if (data && data.length > 0) {
            document.getElementById('speakerSelect').value = data[0].id;
        }
        
    } catch (error) {
        console.error('خطأ في إضافة المتحدث:', error);
        sawtna.showNotification('خطأ في إضافة المتحدث', 'error');
    } finally {
        sawtna.hideLoading(submitBtn);
    }
}