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
const recBtn = document.getElementById("recBtn");
const msg = document.getElementById("recMsg");
const statsTable = document.getElementById("statsTable");

let texts = [];
let idx = 0;
let chunks = [];
let mediaRecorder;

// تحميل النصوص
async function loadTexts() {
  try {
    const { data, error } = await supabase.from("texts").select("uuid, content").order("created_at");
    if (error) throw error;
    if (!data?.length) currText.textContent = "⚠️ لا توجد نصوص متاحة.";
    else { texts = data; idx = 0; showText(); }
  } catch (e) {
    currText.innerHTML = "⚠️ تعذر تحميل النصوص.<br>تحقق من صلاحيات Supabase أو سياسة RLS.";
  }
}

function showText() {
  currText.textContent = texts[idx]?.content || "📜 انتهت النصوص.";
}

// تحميل المتحدثين
async function loadSpeakers() {
  try {
    const { data, error } = await supabase.from("speakers").select("name").order("name");
    if (error) throw error;
    speakerSelect.innerHTML = '<option value="">اختر المتحدث...</option>';
    data.forEach(sp => {
      const opt = document.createElement("option");
      opt.value = sp.name;
      opt.textContent = sp.name;
      speakerSelect.appendChild(opt);
    });
    speakerSelect.innerHTML += '<option value="__new__">➕ إضافة متحدث جديد</option>';
  } catch {
    console.log("خطأ تحميل المتحدثين");
  }
}

speakerSelect.addEventListener("change", () => {
  newSpeakerDiv.style.display = speakerSelect.value === "__new__" ? "block" : "none";
});

// بدء التسجيل
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      chunks = [];
      let speaker = speakerSelect.value;
      if (speaker === "__new__") {
        speaker = newSpeakerInput.value.trim();
        if (speaker) await supabase.from("speakers").insert([{ name: speaker }]);
      }
      if (!speaker) return (msg.textContent = "⚠️ يرجى اختيار أو كتابة اسمك.");
      await supabase.storage.from("recordings").upload(`${speaker}/${Date.now()}.webm`, blob);
      await supabase.from("recordings").insert([{ speaker_name: speaker, mic_type: micType.value, text_id: texts[idx].uuid, status: "pending" }]);
      msg.textContent = "✅ تم حفظ التسجيل بنجاح.";
      if (idx < texts.length - 1) { idx++; showText(); }
      loadStats();
    };
    mediaRecorder.start();
    msg.textContent = "🎤 جارٍ التسجيل...";
    recBtn.textContent = "⏹️ إيقاف التسجيل";
    recBtn.onclick = stopRecording;
  } catch {
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
  const { data, error } = await supabase.from("recordings").select("speaker_name,status,created_at");
  if (error) return;
  const map = {};
  data.forEach(r => {
    if (!map[r.speaker_name]) map[r.speaker_name] = { count: 0, last: r.created_at, status: r.status };
    map[r.speaker_name].count++;
  });
  statsTable.innerHTML = "";
  Object.entries(map).forEach(([n, v]) => {
    const s = v.status === "approved" ? "ok" : v.status === "rejected" ? "bad" : "pending";
    const t = v.status === "approved" ? "✔️ مقبول" : v.status === "rejected" ? "❌ مرفوض" : "⏳ قيد المراجعة";
    statsTable.innerHTML += `<tr><td>${n}</td><td>${v.count}</td><td>${new Date(v.last).toLocaleDateString("ar-EG")}</td><td class="${s}">${t}</td></tr>`;
  });
}

// أزرار
document.getElementById("prev").onclick = () => { if (idx > 0) { idx--; showText(); } };
document.getElementById("skip").onclick = () => { if (idx < texts.length - 1) { idx++; showText(); } };
recBtn.onclick = startRecording;

// تشغيل أولي
loadTexts();
loadSpeakers();
loadStats();
