
import { 
  fetchRecordingsForReview, 
  updateRecordingStatus,
  showToast,
  addSpeaker,
  fetchAccents
} from './utils.js';

let allRecordings = [];
let currentFilter = 'all';

// DOM Elements
const recordingsGrid = document.getElementById('recordings-grid');
const logoutBtn = document.getElementById('logout-btn');
const tabButtons = document.querySelectorAll('.tab-btn');

// Modal Elements
const addSpeakerBtn = document.getElementById('add-speaker-btn');
const modalOverlay = document.getElementById('add-speaker-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const addSpeakerForm = document.getElementById('add-speaker-form');
const saveSpeakerBtn = document.getElementById('save-speaker-btn');
const speakerAccentModalSelect = document.getElementById('speaker-accent-modal');

function checkAuth() {
  const isAuthenticated = sessionStorage.getItem('admin_authenticated');
  if (!isAuthenticated) {
    window.location.href = '/admin.html';
  }
}

async function init() {
  checkAuth();
  await loadRecordings();
  await populateAccentsModal();
  setupEventListeners();
}

async function loadRecordings(status = null) {
  recordingsGrid.innerHTML = '<p class="loading-text">جاري تحميل التسجيلات...</p>';

  const statusFilter = status === 'all' ? null : status;
  allRecordings = await fetchRecordingsForReview(statusFilter);

  displayRecordings(allRecordings);
}

function displayRecordings(recordings) {
  if (recordings.length === 0) {
    recordingsGrid.innerHTML = '<p class="loading-text">لا توجد تسجيلات تطابق هذا الفلتر.</p>';
    return;
  }

  recordingsGrid.innerHTML = '';

  recordings.forEach(recording => {
    const card = document.createElement('div');
    const statusClass = recording.status || 'pending';
    card.className = `recording-card ${statusClass}`;
    card.id = `recording-${recording.id}`;

    const statusText = 
      statusClass === 'approved' ? 'مقبول' :
      statusClass === 'rejected' ? 'مرفوض' :
      'قيد المراجعة';

    card.innerHTML = `
      <div class="recording-card-header">
        <h3>${recording.speakers?.name || 'متحدث غير معروف'}</h3>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      
      <div class="speaker-info">
        <span class="speaker-info-item"><strong>اللهجة:</strong> ${recording.speakers?.accent || 'N/A'}</span>
        <span class="speaker-info-item"><strong>الجنس:</strong> ${recording.speakers?.gender || 'N/A'}</span>
        <span class="speaker-info-item"><strong>العمر:</strong> ${recording.speakers?.age_range || 'N/A'}</span>
      </div>

      <div class="recording-text">
        <p><strong>النص:</strong> ${recording.texts?.content || 'غير متوفر'}</p>
      </div>
      
      ${recording.public_url ? `
        <audio controls src="${recording.public_url}">
          المتصفح لا يدعم تشغيل الصوت
        </audio>
      ` : '<p style="color: var(--neon-red-start);">الملف الصوتي غير متوفر</p>'}
      
      <div class="review-actions">
        <button class="neon-button green" onclick="handleReview('${recording.id}', 'approved')">
          <span class="icon">✅</span><span class="text">قبول</span>
        </button>
        <button class="neon-button red" onclick="handleReview('${recording.id}', 'rejected')">
          <span class="icon">❌</span><span class="text">رفض</span>
        </button>
      </div>
    `;

    recordingsGrid.appendChild(card);
  });
}

window.handleReview = async function(recordingId, newStatus) {
    const card = document.getElementById(`recording-${recordingId}`);
    if (!card) return;
    
    card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0.5';

    const result = await updateRecordingStatus(recordingId, newStatus);
  
    if (result) {
        showToast(`تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} التسجيل`, 'success');
        
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';
        setTimeout(() => {
            card.remove();
            if (recordingsGrid.children.length === 0) {
                recordingsGrid.innerHTML = '<p class="loading-text">لا توجد تسجيلات تطابق هذا الفلتر.</p>';
            }
        }, 300);
    } else {
        card.style.transform = 'scale(1)';
        card.style.opacity = '1';
    }
};

// Modal Functions
function openModal() {
    modalOverlay.style.display = 'flex';
    setTimeout(() => modalOverlay.classList.add('show'), 10);
}

function closeModal() {
    modalOverlay.classList.remove('show');
    setTimeout(() => {
        modalOverlay.style.display = 'none';
        addSpeakerForm.reset();
    }, 300);
}

async function populateAccentsModal() {
    const accents = await fetchAccents();
    speakerAccentModalSelect.innerHTML = '<option value="">اختر اللهجة...</option>';
    accents.forEach(accentObj => {
        if(accentObj.accent) {
            const option = document.createElement('option');
            option.value = accentObj.accent;
            option.textContent = accentObj.accent;
            speakerAccentModalSelect.appendChild(option);
        }
    });
}

async function handleSaveSpeaker(e) {
    e.preventDefault();
    const name = document.getElementById('speaker-name').value.trim();
    const gender = document.getElementById('speaker-gender').value;
    const age = document.getElementById('speaker-age').value;
    const accent = document.getElementById('speaker-accent-modal').value;

    if (!name || !gender || !age || !accent) {
        showToast('الرجاء ملء جميع الحقول', 'error');
        return;
    }
    
    if (age < 5 || age > 100) {
        showToast('الرجاء إدخال عمر صحيح', 'error');
        return;
    }

    saveSpeakerBtn.disabled = true;
    saveSpeakerBtn.innerHTML = 'جاري الحفظ...';

    const result = await addSpeaker({ name, gender, age, accent });

    if (result) {
        showToast('تمت إضافة المتحدث بنجاح!', 'success');
        closeModal();
    } else {
        showToast('فشلت عملية الإضافة', 'error');
    }

    saveSpeakerBtn.disabled = false;
    saveSpeakerBtn.innerHTML = 'حفظ';
}

function setupEventListeners() {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('admin_authenticated');
    showToast('تم تسجيل الخروج', 'info');
    setTimeout(() => { window.location.href = '/index.html'; }, 1000);
  });

  tabButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.status;
      await loadRecordings(currentFilter);
    });
  });

  // Modal event listeners
  addSpeakerBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
          closeModal();
      }
  });
  addSpeakerForm.addEventListener('submit', handleSaveSpeaker);
}

init();
