let mediaRecorder, chunks = [], timerInt = null;
document.addEventListener("DOMContentLoaded", async () => {
  const db = await getDB(); if (!db) return;
  const startBtn = document.querySelector("#btnStartRecord");
  const timerEl  = document.querySelector("#recTimer");
  await loadNextText(db);
  startBtn?.addEventListener("click", async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      await startRecording(timerEl); startBtn.textContent = "إيقاف";
    } else {
      await stopRecording(db); startBtn.textContent = "بدء التسجيل";
    }
  });
});
async function loadNextText(db) {
  const hint = document.querySelector("#currentText");
  try {
    const { data, error } = await db.from("texts").select("content").limit(1);
    if (error) throw error; hint.textContent = data?.[0]?.content || "— لا يوجد نص متاح حالياً —";
  } catch (e) { hint.textContent = "تعذر تحميل النص…"; }
}
async function startRecording(timerEl) {
  chunks = []; const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.start();
  const t0 = Date.now(); clearInterval(timerInt);
  timerInt = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    timerEl.textContent = new Date(s * 1000).toISOString().substring(14, 19);
  }, 250);
}
async function stopRecording(db) {
  return new Promise(resolve => {
    mediaRecorder.onstop = async () => {
      clearInterval(timerInt);
      const blob = new Blob(chunks, { type: "audio/webm" });
      await uploadRecording(db, blob); resolve();
    }; mediaRecorder.stop();
  });
}
async function uploadRecording(db, blob) {
  try {
    const path = `rec_${Date.now()}.webm`;
    const { error: upErr } = await db.storage.from(window.SUPABASE_BUCKET).upload(path, blob, { contentType: "audio/webm" });
    if (upErr) throw upErr;
    const { data: urlData } = db.storage.from(window.SUPABASE_BUCKET).getPublicUrl(path);
    const { error: insErr } = await db.from("recordings").insert({ audio_url: urlData.publicUrl, status: "pending" });
    if (insErr) throw insErr;
    alert("✅ تم رفع تسجيلك بنجاح. شكراً لمساهمتك!");
  } catch (e) { alert("تعذر رفع التسجيل."); }
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/dist/umd/supabase.min.js"></script>
<script src="config.js"></script>
<script src="script.js"></script>
<script src="record.js"></script>
}
