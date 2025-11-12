
import { 
  fetchSpeakers, 
  fetchAvailableText, 
  uploadAudioFile, 
  createRecording,
  showToast,
  AudioRecorder,
  generateSessionCode,
  fetchSpeakerStats,
  fetchAccents,
  playBeep
} from './utils.js';

let allSpeakers = [];
let currentText = null;
let currentSpeakerId = null;
let audioRecorder = null;
let recordedBlob = null;
let sessionCode = generateSessionCode();

// DOM Elements
const accentSelect = document.getElementById('accent-select');
const speakerSelect = document.getElementById('speaker-select');
const micTypeSelect = document.getElementById('mic-type');
const currentTextEl = document.getElementById('current-text');
const recordBtn = document.getElementById('record-btn');
const stopBtn = document.getElementById('stop-btn');
const submitBtn = document.getElementById('submit-btn');
const rerecordBtn = document.getElementById('rerecord-btn');
const postRecordingActions = document.getElementById('post-recording-actions');
const nextBtn = document.getElementById('next-btn');
const audioPreview = document.getElementById('audio-preview');
const audioPlayer = document.getElementById('audio-player');
const waveformCanvas = document.getElementById('waveform-canvas');
const recordingDurationEl = document.getElementById('recording-duration');

// Stats Elements
const speakerStatsContainer = document.getElementById('speaker-stats');
const speakerAccentEl = document.getElementById('speaker-accent');
const totalRecordingsEl = document.getElementById('total-recordings');
const approvedRecordingsEl = document.getElementById('approved-recordings');
const rejectedRecordingsEl = document.getElementById('rejected-recordings');

// Countdown Elements
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownTimer = document.getElementById('countdown-timer');

// Initialize
async function init() {
  await loadAccents();
  await loadSpeakers(); // Load all speakers initially
  await loadText();
  setupEventListeners();
  setupCanvas();
}

function setupCanvas() {
  const container = waveformCanvas.parentElement;
  if (container) {
    waveformCanvas.width = container.clientWidth;
    waveformCanvas.height = 120;
  }
}

async function loadAccents() {
    const accents = await fetchAccents();
    accentSelect.innerHTML = '<option value="">كل اللهجات</option>';
    accents.forEach(accentObj => {
        if(accentObj.accent) {
            const option = document.createElement('option');
            option.value = accentObj.accent;
            option.textContent = accentObj.accent;
            accentSelect.appendChild(option);
        }
    });
}

async function loadSpeakers(accent = null) {
  allSpeakers = await fetchSpeakers(accent);
  
  speakerSelect.innerHTML = '<option value="">اختر المتحدث</option>';
  if (allSpeakers.length === 0) {
      speakerSelect.innerHTML = '<option value="">لا يوجد متحدثون لهذه اللهجة</option>';
  }
  
  allSpeakers.forEach(speaker => {
    const option = document.createElement('option');
    option.value = speaker.id;
    option.textContent = speaker.name;
    speakerSelect.appendChild(option);
  });
}

async function loadText(excludeId = null) {
  currentText = await fetchAvailableText(excludeId);
  
  if (currentText) {
    currentTextEl.textContent = currentText.content;
    recordBtn.disabled = false;
  } else {
    currentTextEl.textContent = 'لا توجد نصوص جديدة متاحة حالياً. شكراً لمساهمتك!';
    recordBtn.disabled = true;
  }
}

async function updateSpeakerStats(speakerId) {
    const speaker = allSpeakers.find(s => s.id === speakerId);
    if (!speaker) {
        speakerStatsContainer.style.display = 'none';
        return;
    }

    speakerStatsContainer.style.display = 'flex';
    speakerAccentEl.textContent = speaker.accent || 'غير محدد';

    const stats = await fetchSpeakerStats(speakerId);
    totalRecordingsEl.textContent = stats.total;
    approvedRecordingsEl.textContent = stats.approved;
    rejectedRecordingsEl.textContent = stats.rejected;
}

function setupEventListeners() {
  accentSelect.addEventListener('change', async (e) => {
    const selectedAccent = e.target.value || null;
    await loadSpeakers(selectedAccent);
    speakerStatsContainer.style.display = 'none'; // Hide stats when accent changes
  });

  speakerSelect.addEventListener('change', (e) => {
    currentSpeakerId = e.target.value;
    if (currentSpeakerId) {
        const speaker = allSpeakers.find(s => s.id === currentSpeakerId);
        if(speaker) updateSpeakerStats(currentSpeakerId);
    } else {
        speakerStatsContainer.style.display = 'none';
    }
  });

  recordBtn.addEventListener('click', handleStartRecording);
  stopBtn.addEventListener('click', stopRecording);
  submitBtn.addEventListener('click', submitRecording);
  rerecordBtn.addEventListener('click', handleRerecord);
  nextBtn.addEventListener('click', resetForNext);

  window.addEventListener('resize', setupCanvas);
}

function handleStartRecording() {
    if (!currentSpeakerId) {
        showToast('الرجاء اختيار المتحدث أولاً', 'error');
        return;
    }
    if (!currentText) {
        showToast('لا يوجد نص متاح للتسجيل', 'error');
        return;
    }

    let count = 3;
    countdownOverlay.style.display = 'flex';
    countdownTimer.textContent = count;
    playBeep(440, 100);

    const interval = setInterval(() => {
        count--;
        countdownTimer.textContent = count > 0 ? count : 'ابدأ الآن!';
        if (count > 0) {
            playBeep(440, 100);
        } else if (count === 0) {
            playBeep(880, 200);
        }

        if (count < 0) {
            clearInterval(interval);
            countdownOverlay.style.display = 'none';
            startRecording();
        }
    }, 1000);
}

async function startRecording() {
  resetAudioPreview();
  audioRecorder = new AudioRecorder();
  const started = await audioRecorder.start();

  if (started) {
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    postRecordingActions.style.display = 'none';
    nextBtn.style.display = 'none';
    audioPreview.style.display = 'none';

    audioRecorder.visualize(waveformCanvas);
    showToast('بدأ التسجيل...', 'info');
  }
}

async function stopRecording() {
  if (!audioRecorder) return;
  
  playBeep(523.25, 150);
  recordedBlob = await audioRecorder.stopAndProcess();

  if (recordedBlob) {
    stopBtn.style.display = 'none';
    postRecordingActions.style.display = 'flex';
    nextBtn.style.display = 'none';

    const audioUrl = URL.createObjectURL(recordedBlob);
    audioPlayer.src = audioUrl;
    
    const duration = await audioRecorder.getDuration(recordedBlob);
    recordingDurationEl.textContent = `${duration.toFixed(1)}s`;
    
    audioPreview.style.display = 'block';

    showToast('تم إيقاف التسجيل. يمكنك الاستماع أو الإرسال', 'success');
  }
}

function handleRerecord() {
    if (window.confirm('هل أنت متأكد من أنك تريد حذف هذا التسجيل والبدء من جديد؟')) {
        resetAudioPreview();
        recordBtn.style.display = 'flex';
        postRecordingActions.style.display = 'none'; // Corrected typo here
        showToast('جاهز للتسجيل مرة أخرى', 'info');
    }
}

async function submitRecording() {
  if (!recordedBlob || !currentSpeakerId || !currentText) {
    showToast('خطأ في البيانات', 'error');
    return;
  }

  submitBtn.disabled = true;
  rerecordBtn.disabled = true;
  submitBtn.innerHTML = '<span class="icon">⏳</span><span class="text">جاري الإرسال...</span>';

  try {
    const duration = await audioRecorder.getDuration(recordedBlob);
    const timestamp = Date.now();
    const fileName = `${sessionCode}_${currentSpeakerId}_${timestamp}.wav`;

    const uploadResult = await uploadAudioFile(recordedBlob, fileName);
    if (!uploadResult) throw new Error('فشل رفع الملف');

    const recordingData = {
      speaker_id: currentSpeakerId,
      text_id: currentText.id,
      storage_path: uploadResult.path,
      public_url: uploadResult.publicUrl,
      file_path: uploadResult.path,
      duration_s: duration,
      mic_type: micTypeSelect.value,
      session_code: sessionCode,
      status: 'pending',
      qa_status: 'pending',
      file_mime: 'audio/wav',
      file_size: recordedBlob.size
    };

    const result = await createRecording(recordingData);

    if (result) {
      showToast('تم إرسال التسجيل بنجاح! ✅', 'success');
      postRecordingActions.style.display = 'none';
      nextBtn.style.display = 'flex';
      await updateSpeakerStats(currentSpeakerId);
    } else {
      throw new Error('فشل حفظ التسجيل');
    }
  } catch (error) {
    console.error('Error submitting recording:', error);
    showToast('حدث خطأ أثناء الإرسال. حاول مرة أخرى', 'error');
  } finally {
      submitBtn.disabled = false;
      rerecordBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon">✅</span><span class="text">إرسال التسجيل</span>';
  }
}

function resetAudioPreview() {
    recordedBlob = null;
    audioRecorder = null;
    audioPreview.style.display = 'none';
    audioPlayer.src = '';
    recordingDurationEl.textContent = '0s';

    const ctx = waveformCanvas.getContext('2d');
    ctx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
}

async function resetForNext() {
  sessionCode = generateSessionCode();
  resetAudioPreview();

  recordBtn.style.display = 'flex';
  stopBtn.style.display = 'none';
  postRecordingActions.style.display = 'none';
  nextBtn.style.display = 'none';
  
  await loadText(currentText?.id);
  showToast('جاهز للنص التالي!', 'info');
}

init();
