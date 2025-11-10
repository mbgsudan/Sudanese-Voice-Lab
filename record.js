// record.js — واجهة التسجيل + إحصاءات المساهمين (بدون أي تغيير في إعداداتك)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// نحافظ على نفس الإعدادات القديمة من config.js إن كنت تستخدمه.
// إن لم يكن لديك config.js فضع القيم مباشرة هنا:
const SUPABASE_URL = window?.SAWTNA?.SUPABASE_URL || "https://qcctqvmwwpsoiexgdqwp.supabase.co";
const SUPABASE_ANON_KEY = window?.SAWTNA?.SUPABASE_ANON || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3Rxdm13d3Bzb2lleGdkcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI1OTcsImV4cCI6MjA3ODI5ODU5N30.uTfskCuzkZNcvy1QdaOzqlW8km-wcZQoVRFi6k2xndQ";
const BUCKET = window?.SAWTNA?.BUCKET || "recordings";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// عناصر DOM
const $ = s => document.querySelector(s);
const speakerName = $('#speakerName');
const micType = $('#micType');
const recBtn = $('#recBtn');
const bar = $('#bar');
const meter = $('#meter');
const msg = $('#recMsg');
const currText = $('#currText');
const progressInfo = $('#progressInfo');

// إحصاءات
const statsTable = $('#statsTable tbody');
const statsEmpty = $('#statsEmpty');
const statsSummary = $('#statsSummary');

let texts = [];
let idx = 0;
let mediaRecorder;
let chunks = [];
let isRecording = false;

// ===================== تحميل النصوص =====================
async function loadTexts() {
  try {
    // 💡 جدولك يعتمد uuid بدل id — نلتزم به
    const { data, error } = await supabase
      .from('texts')
      .select('uuid, content')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      currText.textContent = '⚠️ لا توجد نصوص جاهزة الآن — يرجى المحاولة لاحقًا.';
      progressInfo.textContent = '0/0';
      bar.style.width = '0%';
      return;
    }

    texts = data;
    idx = 0;
    renderText();
  } catch (e) {
    console.error(e);
    currText.textContent = 'تعذّر تحميل النص. تحقق من صلاحيات Supabase أو سياسة RLS.';
  }
}

function renderText() {
  const total = texts.length;
  if (total === 0) return;
  const t = texts[idx];
  currText.textContent = t?.content || '—';
  progressInfo.textContent = `${idx + 1}/${total}`;
  const pct = Math.max(0, Math.min(100, Math.round(((idx + 1) / total) * 100)));
  bar.style.width = pct + '%';
}

// أزرار تنقّل
$('#prev').onclick = () => { if (idx > 0) { idx--; renderText(); } };
$('#skip').onclick = () => { if (idx < texts.length - 1) { idx++; renderText(); } };

// ===================== التسجيل =====================
async function ensureMedia() {
  if (mediaRecorder) return mediaRecorder;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    }
  });

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm; codecs=opus',
    audioBitsPerSecond: 128000
  });

  mediaRecorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };

  mediaRecorder.onstop = async () => {
    pulse(false);
    isRecording = false;
    recBtn.textContent = 'ابدأ التسجيل 🎙️';

    const blob = new Blob(chunks, { type: 'audio/webm' });
    chunks = [];

    const spk = (speakerName.value || '').trim();
    if (!spk) {
      msg.textContent = '⚠️ اكتب اسم المتحدث أولًا.';
      return;
    }
    if (!texts.length) {
      msg.textContent = '⚠️ لا يوجد نص.';
      return;
    }

    const storage_path = `${encodeURIComponent(spk)}/${Date.now()}.webm`;
    const up = await supabase.storage.from(BUCKET).upload(storage_path, blob, { upsert: false });

    if (up.error) {
      console.error(up.error);
      msg.textContent = '❌ فشل رفع الملف. حاول مجددًا.';
      return;
    }

    // حفظ السجل في recordings (نفس أعمدة مشروعك)
    const textId = texts[idx].uuid;
    const ins = await supabase.from('recordings').insert([{
      storage_path,
      status: 'pending',
      mic_type: micType.value,
      text_id: textId,
      speaker_name: spk
    }]);

    if (ins.error) {
      console.error(ins.error);
      msg.textContent = '⚠️ تم الرفع لكن فشل حفظ السجل في قاعدة البيانات.';
      return;
    }

    msg.textContent = '✅ تم حفظ التسجيل بنجاح. انتقل للنص التالي…';
    if (idx < texts.length - 1) {
      idx++;
      renderText();
    }

    // حدّث الإحصاءات مباشرة بعد أي تسجيل
    loadStats();
  };

  return mediaRecorder;
}

function pulse(on) {
  meter.style.width = on ? '100%' : '0%';
  meter.style.transition = on ? 'width .25s ease' : 'none';
}

recBtn.onclick = async () => {
  const rec = await ensureMedia();
  if (!isRecording) {
    isRecording = true;
    rec.start();
    recBtn.textContent = 'إيقاف ◼️';
    msg.textContent = 'جارٍ التسجيل…';
    pulse(true);
  } else {
    rec.stop();
  }
};

// ===================== إحصاءات المساهمين =====================
async function loadStats() {
  try {
    const [{ data: recs, error }, { data: totalTexts }] = await Promise.all([
      supabase.from('recordings').select('speaker_name, status, created_at').order('created_at', { ascending: false }),
      supabase.from('texts').select('uuid', { count: 'exact', head: true })
    ]);

    if (error) throw error;

    const total = totalTexts?.length ?? totalTexts?.count ?? null; // حسب طريقة إرجاع العدّ عندك
    const bySpeaker = new Map();

    (recs || []).forEach(r => {
      const key = (r.speaker_name || '—').trim() || '—';
      if (!bySpeaker.has(key)) bySpeaker.set(key, { count: 0, last: null, statuses: {approved:0,pending:0,rejected:0} });
      const entry = bySpeaker.get(key);
      entry.count += 1;
      entry.last = entry.last ? entry.last : r.created_at;
      if (r.status && entry.statuses[r.status] !== undefined) entry.statuses[r.status] += 1;
    });

    // تفريغ الجدول
    statsTable.innerHTML = '';

    const speakers = [...bySpeaker.entries()];
    if (!speakers.length) {
      statsEmpty.style.display = 'block';
      statsSummary.textContent = '—';
      return;
    }
    statsEmpty.style.display = 'none';

    let totalRecs = 0;

    speakers.forEach(([name, info]) => {
      totalRecs += info.count;
      const dominant =
        info.statuses.approved >= info.statuses.pending && info.statuses.approved >= info.statuses.rejected ? 'approved' :
        info.statuses.rejected >= info.statuses.pending ? 'rejected' : 'pending';

      const pillClass = dominant === 'approved' ? 'ok' : dominant === 'rejected' ? 'bad' : 'pending';

      // نسبة التقدم من إجمالي النصوص
      const denom = total || 0;
      const progressPct = denom ? Math.round((info.count / denom) * 100) : 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700">${escapeHTML(name)}</td>
        <td>${info.count}</td>
        <td>${denom || '—'}</td>
        <td>
          <div class="circle" style="--pct:${progressPct}">
            ${progressPct}%
          </div>
        </td>
        <td>${formatDate(info.last)}</td>
        <td><span class="pill ${pillClass}">${labelStatus(dominant)}</span></td>
      `;
      statsTable.appendChild(tr);
    });

    statsSummary.textContent = `عدد المساهمين: ${speakers.length} • إجمالي التسجيلات: ${totalRecs}`;
  } catch (e) {
    console.error(e);
    statsTable.innerHTML = '';
    statsEmpty.style.display = 'block';
    statsEmpty.textContent = '⚠️ تعذّر تحميل الإحصاءات.';
  }
}

function labelStatus(s){
  return s === 'approved' ? '✅ مقبول' : s === 'rejected' ? '❌ مرفوض' : '⏳ قيد المراجعة';
}
function formatDate(iso){
  if(!iso) return '—';
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'});
  }catch{ return '—'; }
}
function escapeHTML(str=''){
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}

// تشغيل أوّل مرّة
loadTexts();
loadStats();
