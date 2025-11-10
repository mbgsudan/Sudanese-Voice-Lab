// اتصال Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qcctqvmwwpsoiexgdqwp.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3Rxdm13d3Bzb2lleGdkcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI1OTcsImV4cCI6MjA3ODI5ODU5N30.uTfskCuzkZNcvy1QdaOzqlW8km-wcZQoVRFi6k2xndQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// تحميل التسجيلات في لوحة المراجعة
async function loadRecordings() {
  const tableBody = document.getElementById("recordsTable");
  if (!tableBody) return;

  const { data, error } = await supabase.from("recordings").select(`
      id, status, audio_url, 
      speakers(name), 
      texts(content)
  `);

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="5">خطأ في تحميل التسجيلات ⚠️</td></tr>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5">لا توجد تسجيلات بعد 🎧</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.speakers?.name || "غير معروف"}</td>
      <td>${row.texts?.content || "—"}</td>
      <td><audio controls src="${row.audio_url || "#"}"></audio></td>
      <td>${row.status || "pending"}</td>
      <td>
        <button class="approve-btn" data-id="${row.id}">✅</button>
        <button class="reject-btn" data-id="${row.id}">❌</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // إضافة أحداث الأزرار
  document.querySelectorAll(".approve-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await updateStatus(btn.dataset.id, "approved");
    })
  );

  document.querySelectorAll(".reject-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await updateStatus(btn.dataset.id, "rejected");
    })
  );
}

// تحديث حالة التسجيل
async function updateStatus(id, newStatus) {
  const { error } = await supabase
    .from("recordings")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    alert("فشل في تحديث الحالة ❌");
    console.error(error);
  } else {
    alert("تم التحديث بنجاح ✅");
    loadRecordings();
  }
}

// إضافة متحدث جديد
const addSpeakerBtn = document.getElementById("addSpeakerBtn");
if (addSpeakerBtn) {
  addSpeakerBtn.addEventListener("click", async () => {
    const name = prompt("أدخل اسم المتحدث الجديد:");
    if (!name) return;

    // إنشاء رمز تلقائي
    const { data: speakers } = await supabase
      .from("speakers")
      .select("code")
      .order("code", { ascending: false })
      .limit(1);

    let nextCode = "SPK-001";
    if (speakers && speakers.length > 0) {
      const last = speakers[0].code.replace("SPK-", "");
      const next = String(parseInt(last) + 1).padStart(3, "0");
      nextCode = `SPK-${next}`;
    }

    // إدخال المتحدث الجديد
    const { error } = await supabase.from("speakers").insert([
      {
        code: nextCode,
        name: name,
        gender: "غير محدد",
        accent: "لهجة السودان",
        age_range: "غير معروف",
      },
    ]);

    if (error) {
      alert("فشل في الإضافة: " + error.message);
      console.error(error);
    } else {
      alert(`تمت إضافة المتحدث ${name} (${nextCode}) بنجاح ✅`);
      loadRecordings();
    }
  });
}

// تحميل التسجيلات عند فتح الصفحة
loadRecordings();
