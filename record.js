// record.js — Sawtna v1.4 Final Fix
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';

// إنشاء العميل
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// عناصر الصفحة
const $ = s => document.querySelector(s);
const speakerName = $('#speakerName');
const micType = $('#micType');
const recBtn = $('#recBtn');
const meter = $('#meter');
const msg = $('#recMsg');
const currText = $('#currText');
const progressInfo = $('#progressInfo');

let texts = [];
let idx = 0;
let media;
let chunks = [];
let recording = false;

// تحميل النصوص من Supabase
async function loadTexts() {
  // ✅ استخدم uuid بدل id، مع ترتيب حسب created_at
  const { data, error } = await supabase
    .from('texts')
    .select('uuid, content')
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    currText.textContent = 'تعذّر تحميل نص. تأكد من وجود بيانات في جدول النصوص.';
    console.error(error);
    return;
  }
  texts = data;
  idx = 0;
  renderText();
}

// عرض النص الحالي
function renderText() {
  if (!texts.length) {
    progressInfo.textContent = '0/0';
    currText.textContent = 'لا توجد نصوص متاحة حالياً.';
    return;
  }
  const t = texts[idx];
  currText.textContent = t.content;
  progressInfo.textContent = `${idx + 1}/${texts.length}`;
}

// التنقل بين النصوص
$('#prev').onclick = () => {
  if (idx > 0) {
    idx--;
    renderText();
  }
};
$('#skip').onclick = () => {
  if (idx < texts.length - 1) {
    idx++;
    renderText();
  }
};

// مؤثر بصري أثناء التسجيل
function pulse(on) {
  meter.style.width = on ? '100%' : '0%';
  meter.style.transition = on ? 'width .25s ease' : 'none';
}

// التأكد من صلاحيات الميكروفون
async function ensureMedia() {
  if (media) return media;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    }
  });
  const rec = new MediaRecorder(stream, {
    mimeType: 'audio/webm; codecs=opus',
    audioBitsPerSecond: 128000
  });
  rec.ondataavailable = e => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.onstop = async () => {
    pulse(false);
    recording = false;
    recBtn.textContent = 'ابدأ التسجيل 🎙️';
    const blob = new Blob(chunks, { type: 'audio/webm' });
    chunks = [];

    // التحقق من اسم المتحدث
    const spk = speakerName.value.trim();
    if (!spk) {
      msg.textContent = '⚠️ اكتب اسم المتحدث أولاً.';
      return;
    }

    if (!texts.length) {
      msg.textContent = '⚠️ لا يوجد نص.';
      return;
    }

    const path = `${encodeURIComponent(spk)}/${Date.now()}.webm`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: false });

    if (upErr) {
      msg.textContent = '❌ فشل رفع الملف.';
      console.error(upErr);
      return;
    }

    // ✅ استخدم uuid بدل id
    const textId = texts[idx].uuid;
    const { error: insErr } = await supabase.from('recordings').insert([
      {
        storage_path: path,
        status: 'pending',
        mic_type: micType.value,
        text_id: textId,
        speaker_name: spk
      }
    ]);

    if (insErr) {
      msg.textContent = '⚠️ تم الرفع لكن فشل حفظ السجل.';
      console.error(insErr);
      return;
    }

    msg.textContent = '✅ تم حفظ التسجيل بنجاح.';
    if (idx < texts.length - 1) {
      idx++;
      renderText();
    }
  };

  media = rec;
  return rec;
}

// زر التسجيل
recBtn.onclick = async () => {
  const rec = await ensureMedia();
  if (!recording) {
    recording = true;
    rec.start();
    pulse(true);
    recBtn.textContent = 'إيقاف ◼️';
    msg.textContent = 'جارٍ التسجيل...';
  } else {
    rec.stop();
  }
};

// بدء التشغيل
loadTexts();
