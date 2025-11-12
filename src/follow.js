
import { 
  fetchSpeakers, 
  fetchRecordings, 
  getRecordingStats,
  exportToCSV,
  showToast,
  formatDateArabic
} from './utils.js';

let allRecordings = [];
let allSpeakersList = [];
let currentSpeakerId = null;

// DOM Elements
const approvedCount = document.getElementById('approved-count');
const rejectedCount = document.getElementById('rejected-count');
const pendingCount = document.getElementById('pending-count');
const speakerFilter = document.getElementById('speaker-filter');
const exportBtn = document.getElementById('export-csv');
const recordingsList = document.getElementById('recordings-list');
const progressSection = document.getElementById('progress-section');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const progressSpeakerName = document.getElementById('progress-speaker-name');

// Initialize
async function init() {
  await loadSpeakers();
  await loadRecordings();
  setupEventListeners();
}

// Load speakers for filter
async function loadSpeakers() {
  allSpeakersList = await fetchSpeakers();
  
  speakerFilter.innerHTML = '<option value="">الكل</option>';
  
  allSpeakersList.forEach(speaker => {
    const option = document.createElement('option');
    option.value = speaker.id;
    option.textContent = speaker.name;
    speakerFilter.appendChild(option);
  });
}

// Load recordings
async function loadRecordings(speakerId = null) {
  recordingsList.innerHTML = '<p class="loading-text">جاري تحميل التسجيلات...</p>';
  progressSection.style.display = 'none';

  allRecordings = await fetchRecordings(speakerId);
  
  // Update statistics
  const stats = await getRecordingStats(speakerId);
  approvedCount.textContent = stats.approved;
  rejectedCount.textContent = stats.rejected;
  pendingCount.textContent = stats.pending;

  // Update progress bar if a speaker is selected
  if (speakerId) {
    updateProgressBar(stats);
  }

  // Display recordings
  displayRecordings(allRecordings);
}

// Update progress bar
function updateProgressBar(stats) {
  const total = stats.approved + stats.rejected + stats.pending;
  if (total === 0) {
    progressSection.style.display = 'none';
    return;
  }

  const percentage = Math.round((stats.approved / total) * 100);
  const speaker = allSpeakersList.find(s => s.id === currentSpeakerId);

  progressSection.style.display = 'block';
  progressSpeakerName.textContent = `تقدم المساهم: ${speaker.name}`;
  progressPercentage.textContent = `${percentage}% مقبول`;
  
  // Use a timeout to allow the element to be visible before transition
  setTimeout(() => {
    progressBar.style.width = `${percentage}%`;
    progressBar.className = 'progress-bar'; // Reset classes
    if (percentage <= 25) {
      progressBar.classList.add('red');
    } else if (percentage <= 50) {
      progressBar.classList.add('orange');
    } else if (percentage <= 75) {
      progressBar.classList.add('yellow');
    } else {
      progressBar.classList.add('green');
    }
  }, 100);
}


// Display recordings
function displayRecordings(recordings) {
  if (recordings.length === 0) {
    recordingsList.innerHTML = '<p class="loading-text">لا توجد تسجيلات</p>';
    return;
  }

  recordingsList.innerHTML = '';

  recordings.forEach(recording => {
    const item = document.createElement('div');
    item.className = 'recording-item';

    const statusClass = recording.status || 'pending';
    const statusText = 
      statusClass === 'approved' ? 'مقبول ✅' :
      statusClass === 'rejected' ? 'مرفوض ❌' :
      'قيد المراجعة ⏳';

    item.innerHTML = `
      <div class="recording-info">
        <h4>${recording.speakers?.name || 'غير معروف'}</h4>
        <p><strong>النص:</strong> ${recording.texts?.content || 'غير متوفر'}</p>
        <p><strong>نوع الميكروفون:</strong> ${recording.mic_type || 'غير محدد'}</p>
        <p><strong>التاريخ:</strong> ${formatDateArabic(recording.created_at)}</p>
      </div>
      <div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
    `;

    recordingsList.appendChild(item);
  });
}

// Setup event listeners
function setupEventListeners() {
  speakerFilter.addEventListener('change', async (e) => {
    currentSpeakerId = e.target.value || null;
    await loadRecordings(currentSpeakerId);
  });

  exportBtn.addEventListener('click', () => {
    if (allRecordings.length === 0) {
      showToast('لا توجد تسجيلات للتصدير', 'error');
      return;
    }
    exportToCSV(allRecordings);
  });
}

// Initialize on page load
init();
