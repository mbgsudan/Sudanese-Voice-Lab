import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://qcctqvmwwpsoiexgdqwp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3Rxdm13d3Bzb2lleGdkcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI1OTcsImV4cCI6MjA3ODI5ODU5N30.uTfskCuzkZNcvy1QdaOzqlW8km-wcZQoVRFi6k2xndQ"
);

const speakerSelect = document.getElementById("speakerSelect");
const newSpeakerDiv = document.getElementById("newSpeakerDiv");
const newSpeakerInput = document.getElementById("newSpeakerInput");
const micType = document.getElementById("micType");
const textBox = document.getElementById("textBox");
const recordBtn = document.getElementById("recordBtn");
const msg = document.getElementById("msg");
const statsBody = document.getElementById("statsBody");

let texts = [];
let index = 0;
let chunks = [];
let recorder;

async function loadTexts() {
  try {
    const { data, error } = await supabase.from("texts").select("uuid, content").order("created_at");
    if (error || !data.length) {
      textBox.innerHTML = "⚠️ تعذّر تحميل النصوص. تأكد من تفعيل سياسة القراءة (RLS) لجدول texts.";
      return;
    }
    texts = data;
    index = 0;
    showText();
  } catch {
    textBox.textContent = "⚠️ خطأ أثناء تحميل النصوص.";
  }
}

function showText() {
  if (texts[index]) textBox.textContent = texts[index].content;
  else textBox.textContent = "✅ انتهت جميع النصوص.";
}

async function loadSpeakers() {
  const { data, error } = await supabase.from("speakers").select("name");
  if (!error && data) {
    speakerSelect.innerHTML = '<option value="">اختر المتحدث...</option>';
    data.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.name;
      speakerSelect.appendChild(opt);
    });
    speakerSelect.innerHTML += '<option value="__new__">➕ إضافة متحدث جديد</option>';
  }
}

speakerSelect.addEventListener("change", () => {
  newSpeakerDiv.style.display = speakerSelect.value === "__new__" ? "block" : "none";
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      let speaker = speakerSelect.value;
      if (speaker === "__new__") {
        speaker = newSpeakerInput.value.trim();
        if (!speaker) return (msg.textContent = "⚠️ أدخل اسمك أولاً.");
        await supabase.from("speakers").insert([{ name: speaker }]);
      }

      const fileName = `${speaker}_${Date.now()}.webm`;
      await supabase.storage.from("recordings").upload(fileName, blob);
      await supabase.from("recordings").insert([
        { speaker_name: speaker, mic_type: micType.value, text_id: texts[index].uuid, status: "pending" },
      ]);
      msg.textContent = "✅ تم الحفظ بنجاح.";
      if (index < texts.length - 1) index++;
      showText();
      loadStats();
    };

    recorder.start();
    msg.textContent = "🎤 جارٍ التسجيل...";
    recordBtn.textContent = "⏹️ إيقاف التسجيل";
    recordBtn.onclick = stopRecording;
  } catch {
    msg.textContent = "❌ لم يتم الوصول إلى الميكروفون.";
  }
}

function stopRecording() {
  recorder.stop();
  recordBtn.textContent = "🎙️ ابدأ التسجيل";
  recordBtn.onclick = startRecording;
}

async function loadStats() {
  const { data } = await supabase.from("recordings").select("speaker_name,status,created_at");
  const map = {};
  data?.forEach((r) => {
    if (!map[r.speaker_name]) map[r.speaker_name] = { count: 0, last: r.created_at, status: r.status };
    map[r.speaker_name].count++;
  });
  statsBody.innerHTML = "";
  Object.entries(map).forEach(([n, v]) => {
    const s = v.status === "approved" ? "ok" : v.status === "rejected" ? "bad" : "pending";
    const t =
      v.status === "approved"
        ? "✔️ مقبول"
        : v.status === "rejected"
        ? "❌ مرفوض"
        : "⏳ قيد المراجعة";
    statsBody.innerHTML += `<tr><td>${n}</td><td>${v.count}</td><td>${new Date(v.last).toLocaleDateString(
      "ar-EG"
    )}</td><td class="${s}">${t}</td></tr>`;
  });
}

document.getElementById("prevBtn").onclick = () => {
  if (index > 0) index--;
  showText();
};
document.getElementById("skipBtn").onclick = () => {
  if (index < texts.length - 1) index++;
  showText();
};
recordBtn.onclick = startRecording;

loadTexts();
loadSpeakers();
loadStats();
