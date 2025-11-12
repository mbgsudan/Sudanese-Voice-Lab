
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Toast notification system
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `
    <span style="font-size: 1.5rem;">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Fetch distinct accents
export async function fetchAccents() {
    try {
        const { data, error } = await supabase.rpc('get_distinct_accents');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching accents:', error);
        showToast('خطأ في تحميل اللهجات', 'error');
        return [];
    }
}

// Add a new speaker
export async function addSpeaker(speakerData) {
    try {
        const code = `SPK_${Date.now()}`;
        const age_range = `${speakerData.age}-${parseInt(speakerData.age) + 9}`; // e.g. 20-29

        const { data, error } = await supabase
            .from('speakers')
            .insert([{ 
                name: speakerData.name,
                gender: speakerData.gender,
                accent: speakerData.accent,
                age_range: age_range,
                code: code,
             }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding speaker:', error);
        if (error.message.includes('duplicate key')) {
            showToast('متحدث بهذا الاسم موجود بالفعل.', 'error');
        } else {
            showToast('خطأ في إضافة المتحدث', 'error');
        }
        return null;
    }
}


// Fetch all speakers, optionally filtered by accent
export async function fetchSpeakers(accent = null) {
  try {
    let query = supabase
      .from('speakers')
      .select('*')
      .order('name');
    
    if (accent) {
        query = query.eq('accent', accent);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching speakers:', error);
    showToast('خطأ في تحميل المتحدثين', 'error');
    return [];
  }
}

// Fetch speaker-specific stats
export async function fetchSpeakerStats(speakerId) {
  try {
    const { data, error } = await supabase
        .from('recordings')
        .select('status')
        .eq('speaker_id', speakerId);

    if (error) throw error;

    const stats = {
        total: data.length,
        approved: data.filter(r => r.status === 'approved').length,
        rejected: data.filter(r => r.status === 'rejected').length
    };
    return stats;
  } catch (error) {
      console.error('Error fetching speaker stats:', error);
      showToast('خطأ في تحميل إحصائيات المتحدث', 'error');
      return { total: 0, approved: 0, rejected: 0 };
  }
}

// Fetch available text (not full)
export async function fetchAvailableText(excludeTextId = null) {
  try {
    let query = supabase
      .from('texts')
      .select('*')
      .neq('status', 'full')
      .order('record_count')
    
    if (excludeTextId) {
        query = query.neq('id', excludeTextId);
    }
    
    const { data, error } = await query.limit(1).single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching text:', error);
    showToast('خطأ في تحميل النص', 'error');
    return null;
  }
}

// Fetch all recordings for review page
export async function fetchRecordingsForReview(status = null) {
  try {
    let query = supabase
      .from('recordings')
      .select(`
        *,
        speakers (*),
        texts (content)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recordings:', error);
    showToast('خطأ في تحميل التسجيلات', 'error');
    return [];
  }
}

// Fetch all recordings for follow page
export async function fetchRecordings(speakerId = null) {
  try {
    let query = supabase
      .from('recordings')
      .select(`
        *,
        speakers (name),
        texts (content)
      `)
      .order('created_at', { ascending: false });

    if (speakerId) {
      query = query.eq('speaker_id', speakerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recordings for follow page:', error);
    showToast('خطأ في تحميل التسجيلات', 'error');
    return [];
  }
}


// Get recording statistics
export async function getRecordingStats(speakerId = null) {
  try {
    let query = supabase
      .from('recordings')
      .select('status');

    if (speakerId) {
      query = query.eq('speaker_id', speakerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      approved: 0,
      rejected: 0,
      pending: 0
    };

    data.forEach(record => {
      if (record.status === 'approved') stats.approved++;
      else if (record.status === 'rejected') stats.rejected++;
      else if (record.status === 'pending') stats.pending++;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { approved: 0, rejected: 0, pending: 0 };
  }
}

// Upload audio file to Supabase Storage
export async function uploadAudioFile(file, fileName) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    showToast('خطأ في رفع الملف', 'error');
    return null;
  }
}

// Create new recording
export async function createRecording(recordingData) {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .insert([recordingData])
      .select()
      .single();

    if (error) throw error;

    // Increment text record count
    await supabase.rpc('increment_record_count', { text_uuid: recordingData.text_id });

    return data;
  } catch (error) {
    console.error('Error creating recording:', error);
    showToast('خطأ في حفظ التسجيل', 'error');
    return null;
  }
}

// Update recording status
export async function updateRecordingStatus(recordingId, status) {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .update({ status, qa_status: status })
      .eq('id', recordingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating status:', error);
    showToast('خطأ في تحديث الحالة', 'error');
    return null;
  }
}

// Export recordings to CSV
export function exportToCSV(recordings) {
  const headers = ['المتحدث', 'النص', 'الحالة', 'نوع الميكروفون', 'التاريخ'];
  const rows = recordings.map(rec => [
    rec.speakers?.name || 'غير معروف',
    rec.texts?.content || 'غير متوفر',
    rec.status || 'pending',
    rec.mic_type || 'غير محدد',
    new Date(rec.created_at).toLocaleDateString('ar-SA')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `recordings_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('تم تصدير الملف بنجاح', 'success');
}

// Audio Processing Functions
async function processAudio(audioBlob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const normalizedBuffer = applyNormalization(audioBuffer, audioContext);

    const processedBlob = await bufferToWave(normalizedBuffer, audioContext);
    return processedBlob;
}


function applyNormalization(buffer, context) {
    const channels = [];
    let max = 0;
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
        for (let j = 0; j < channels[i].length; j++) {
            if (Math.abs(channels[i][j]) > max) {
                max = Math.abs(channels[i][j]);
            }
        }
    }

    if (max === 0) return buffer; // Avoid division by zero

    const gain = 1.0 / max;
    const newBuffer = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const channelData = buffer.getChannelData(c);
        const newChannelData = newBuffer.getChannelData(c);
        for (let i = 0; i < channelData.length; i++) {
            newChannelData[i] = channelData[i] * gain;
        }
    }
    return newBuffer;
}

function bufferToWave(abuffer, context) {
    let numOfChan = abuffer.numberOfChannels,
        length = abuffer.length * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample, offset = 0, pos = 0;
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16);
    setUint32(0x61746164); setUint32(length - pos - 4);
    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true); pos += 2;
        }
        offset++;
    }
    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
    return new Blob([view], { type: "audio/wav" });
}

// Audio Recording Class
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null; this.audioChunks = []; this.stream = null;
    this.audioContext = null; this.analyser = null; this.dataArray = null;
    this.animationId = null;
  }
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => { this.audioChunks.push(event.data); };
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast('خطأ في بدء التسجيل. تأكد من السماح بالوصول للميكروفون', 'error');
      return false;
    }
  }
  async stopAndProcess() {
    return new Promise((resolve) => {
        if (!this.mediaRecorder) { resolve(null); return; }
        this.mediaRecorder.onstop = async () => {
            const rawAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            if (this.stream) { this.stream.getTracks().forEach(track => track.stop()); }
            if (this.animationId) { cancelAnimationFrame(this.animationId); }
            showToast('جاري معالجة الصوت...', 'info');
            try {
                const processedBlob = await processAudio(rawAudioBlob);
                showToast('اكتملت معالجة الصوت', 'success');
                resolve(processedBlob);
            } catch (e) {
                console.error("Audio processing failed:", e);
                showToast('فشلت معالجة الصوت، سيتم استخدام التسجيل الأصلي', 'error');
                resolve(rawAudioBlob);
            } finally {
                if (this.audioContext && this.audioContext.state !== 'closed') { this.audioContext.close(); }
            }
        };
        this.mediaRecorder.stop();
    });
  }
  visualize(canvas) {
    if (!canvas || !this.analyser) return;
    const canvasCtx = canvas.getContext('2d');
    const WIDTH = canvas.width; const HEIGHT = canvas.height;
    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(this.dataArray);
      canvasCtx.fillStyle = 'rgba(10, 10, 15, 0.3)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
      const barWidth = (WIDTH / this.dataArray.length) * 2.5; let barHeight; let x = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = (this.dataArray[i] / 255) * HEIGHT;
        const gradient = canvasCtx.createLinearGradient(0, HEIGHT - barHeight, 0, HEIGHT);
        gradient.addColorStop(0, '#00E0B6'); gradient.addColorStop(1, '#00B4FF');
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }
  getDuration(audioBlob) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      audio.addEventListener('loadedmetadata', () => { resolve(audio.duration); URL.revokeObjectURL(audio.src); });
    });
  }
}

export function generateSessionCode() { return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
export function formatDateArabic(dateString) { const date = new Date(dateString); return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

let audioCtxBeep;
export function playBeep(freq = 523.25, duration = 100) {
    if (!audioCtxBeep || audioCtxBeep.state === 'closed') { audioCtxBeep = new (window.AudioContext || window.webkitAudioContext)(); }
    const oscillator = audioCtxBeep.createOscillator(); const gainNode = audioCtxBeep.createGain();
    oscillator.connect(gainNode); gainNode.connect(audioCtxBeep.destination);
    gainNode.gain.setValueAtTime(0, audioCtxBeep.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtxBeep.currentTime + 0.01);
    oscillator.frequency.setValueAtTime(freq, audioCtxBeep.currentTime);
    oscillator.type = 'sine'; oscillator.start(audioCtxBeep.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtxBeep.currentTime + duration/1000);
    oscillator.stop(audioCtxBeep.currentTime + duration/1000);
}
