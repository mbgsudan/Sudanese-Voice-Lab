import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  "https://qcctqvmwwpsoiexgdqwp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3Rxdm13d3Bzb2lleGdkcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI1OTcsImV4cCI6MjA3ODI5ODU5N30.uTfskCuzkZNcvy1QdaOzqlW8km-wcZQoVRFi6k2xndQ"
);

const speakerSelect = document.getElementById("speakerName");
const newSpeakerDiv = document.getElementById("newSpeakerDiv");
const newSpeakerInput = document.getElementById("newSpeakerInput");
const micType = document.getElementById("micType");
const currText = document.getElementById("currText");
const progressInfo = document.getElementById("progressInfo");
const recBtn = document.getElementById("recBtn");
const msg = document.getElementById("recMsg");
const statsTable = document.getElementById("statsTable").querySelector("tbody");

let texts = [];
let idx = 0;
let chunks = [];
let mediaRecorder;

// تحميل النصوص
async function loadTexts() {
  try {
    const { data, error } = await supabase.from("texts").select("uuid, content").order("created_at", { ascending: true });
    if (error) throw error;
    if (!data || !data.length) {
      currText.textContent = "⚠️ لا توجد نصوص متاحة حالياً.";
      return;
    }
    texts = data;
    idx = 0;
    renderText();
  } catch (e) {
    currText.textContent = "⚠️ تعذّر تحميل النصوص. تأكد من تفعيل سياسة القراءة (RLS) لجدول texts.";
  }
}

function renderText() {
  if (!texts.length) return;
  const t = texts[idx];
  currText.textContent = t.content;
  progressInfo.textContent = `${idx + 1}/${texts.length}`;
}

// تحميل أسماء المتحدثين
async function loadSpeakers() {
  try {
    const { data, error } = await supabase.from("speakers").select("name").order("name", { ascending: true });
    if (error) throw error;
    speakerSelect.innerHTML = '<option value="">اختر المتحدث...</option>';
    (data || []).forEach(sp => {
      const opt = document.createElement("option");
      opt.value = sp.name;
      opt.textContent = sp.name;
      speakerSelect.appendChild(opt);
    });
    speakerSelect.innerHTML += '<option value="__new__">➕ إضافة متحدث جديد</option>';
  } catch (e) {
    console.error("خطأ في تحميل أسماء المتحدثين", e);
  }
}

speakerSelect.addEventListener("change", () => {
  if (speakerSelect.value === "__new__") newSpeakerDiv.style.display = "block";
  else newSpeakerDiv.style.display = "none";
});

// التسجيل
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      chunks = [];
      let spk = "";
      if (speakerSelect.value === "__new__") {
        spk = newSpeakerInput.value.trim();
        if (spk) await supabase.from("speakers").insert([{ name: spk }]);
      } else spk = speakerSelect.value;

      if (!spk) return (msg.textContent = "⚠️ يرجى اختيار أو كتابة اسمك.");

      const { data, error } = await supabase.storage.from("recordings").upload(`${spk}/${Date.now()}.webm`, blob);
      if (error) return (msg.textContent = "❌ فشل رفع الملف.");

      await supabase.from("recordings").insert([{ speaker_name: spk, mic_type: micType.value, text_id: texts[idx].uuid, status: "pending" }]);
      msg.textContent = "✅ تم حفظ التسجيل بنجاح.";
      if (idx < texts.length - 1) { idx++; renderText(); }
      loadStats();
    };
    mediaRecorder.start();
    msg.textContent = "🎤 جارٍ التسجيل...";
    recBtn.textContent = "⏹️ إيقاف التسجيل";
    recBtn.onclick = stopRecording;
  } catch (e) {
    msg.textContent = "❌ لم يتم الوصول إلى الميكروفون.";
  }
}

function stopRecording() {
  mediaRecorder.stop();
  msg.textContent = "📦 جارٍ حفظ التسجيل...";
  recBtn.textContent = "🎙️ ابدأ التسجيل";
  recBtn.onclick = startRecording;
}

// تحميل الإحصاءات
async function loadStats() {
  try {
    const { data, error } = await supabase.from("recordings").select("speaker_name,status,created_at");
    if (error) throw error;
    statsTable.innerHTML = "";
    const bySpeaker = {};
    (data || []).forEach(r => {
      if (!bySpeaker[r.speaker_name]) bySpeaker[r.speaker_name] = { count: 0, status: r.status, last: r.created_at };
      bySpeaker[r.speaker_name].count++;
    });
    Object.entries(bySpeaker).forEach(([name, info]) => {
      const tr = document.createElement("tr");
      const st = info.status === "approved" ? "ok" : info.status === "rejected" ? "bad" : "pending";
      const stText = info.status === "approved" ? "مقبول" : info.status === "rejected" ? "مرفوض" : "قيد المراجعة";
      tr.innerHTML = `<td>${name}</td><td>${info.count}</td><td>${new Date(info.last).toLocaleDateString("ar-EG")}</td><td class="${st}">${stText}</td>`;
      statsTable.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

// أزرار
document.getElementById("prev").onclick = () => { if (idx > 0) { idx--; renderText(); } };
document.getElementById("skip").onclick = () => { if (idx < texts.length - 1) { idx++; renderText(); } };
recBtn.onclick = startRecording;

// التشغيل الأول
loadTexts();
loadSpeakers();
loadStats();
