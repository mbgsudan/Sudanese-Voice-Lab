// إعدادات Supabase
const SUPABASE_URL = "https://qcctqvmwwpsoiexgdqwp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3Rxdm13d3Bzb2lleGdkcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI1OTcsImV4cCI6MjA3ODI5ODU5N30.uTfskCuzkZNcvy1QdaOzqlW8km-wcZQoVRFi6k2xndQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تحميل التسجيلات
async function loadRecordings() {
  try {
    const { data, error } = await supabaseClient
      .from("recordings")
      .select("*, speakers(name), texts(content)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const tableBody = document.getElementById("recordingsTableBody");
    tableBody.innerHTML = "";

    data.forEach((rec) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${rec.speakers?.name || "—"}</td>
        <td>${rec.texts?.content || "—"}</td>
        <td><audio controls src="https://qcctqvmwwpsoiexgdqwp.supabase.co/storage/v1/object/public/recordings/${rec.storage_path}"></audio></td>
        <td>${rec.status || "pending"}</td>
        <td>
          <button class="approve" onclick="updateStatus(${rec.id}, 'approved')">✅</button>
          <button class="reject" onclick="updateStatus(${rec.id}, 'rejected')">❌</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading recordings:", err.message);
    alert("حدث خطأ في تحميل التسجيلات");
  }
}

// تحديث الحالة
async function updateStatus(id, status) {
  try {
    const { error } = await supabaseClient
      .from("recordings")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
    loadRecordings();
  } catch (err) {
    console.error("Error updating status:", err.message);
  }
}

// نموذج إضافة متحدث جديد
document
  .getElementById("addSpeakerBtn")
  ?.addEventListener("click", showSpeakerForm);

function showSpeakerForm() {
  if (document.getElementById("formContainer")) return;

  const formHTML = `
  <div id="formContainer" style="
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: linear-gradient(145deg, #0a0a0a, #1c1c1c);
    color: #f8f9fa;
    padding: 25px;
    border-radius: 16px;
    box-shadow: 0 0 25px rgba(0,255,200,0.25);
    width: 340px;
    z-index: 9999;
    text-align: right;
    font-family: 'Cairo', sans-serif;
  ">
    <h3 style="text-align:center; margin-bottom:15px;">➕ إضافة متحدث جديد</h3>
    
    <label>الاسم:</label>
    <input id="spk_name" type="text" style="width:100%;padding:6px;margin:6px 0;border-radius:6px;border:1px solid #444;background:#111;color:#fff;">
    
    <label>الجنس:</label>
    <select id="spk_gender" style="width:100%;padding:6px;margin:6px 0;border-radius:6px;border:1px solid #444;background:#111;color:#fff;">
      <option value="">اختر الجنس</option>
      <option value="ذكر">ذكر</option>
      <option value="أنثى">أنثى</option>
    </select>

    <label>الفئة العمرية:</label>
    <select id="spk_age" style="width:100%;padding:6px;margin:6px 0;border-radius:6px;border:1px solid #444;background:#111;color:#fff;">
      <option value="">اختر الفئة</option>
      <option value="20-30">20-30</option>
      <option value="30-40">30-40</option>
      <option value="40-50">40-50</option>
    </select>

    <label>اللهجة:</label>
    <select id="spk_accent" style="width:100%;padding:6px;margin:6px 0;border-radius:6px;border:1px solid #444;background:#111;color:#fff;">
      <option value="">اختر اللهجة</option>
      <option value="لهجة الخرطوم">لهجة الخرطوم</option>
      <option value="لهجة وسط السودان">لهجة وسط السودان</option>
      <option value="لهجة شرق السودان">لهجة شرق السودان</option>
      <option value="لهجة غرب السودان">لهجة غرب السودان</option>
    </select>

    <div style="text-align:center;margin-top:15px;">
      <button id="saveSpk" style="margin:5px; background:linear-gradient(90deg,#00e0c6,#00b4d8); color:#fff; padding:8px 20px; border:none; border-radius:8px;">حفظ</button>
      <button id="cancelSpk" style="margin:5px; background:#ff3b30; color:#fff; padding:8px 20px; border:none; border-radius:8px;">إلغاء</button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML("beforeend", formHTML);

  document
    .getElementById("saveSpk")
    .addEventListener("click", async function () {
      const name = document.getElementById("spk_name").value.trim();
      const gender = document.getElementById("spk_gender").value;
      const age = document.getElementById("spk_age").value;
      const accent = document.getElementById("spk_accent").value;

      if (!name || !gender || !age || !accent) {
        alert("يرجى إدخال جميع البيانات المطلوبة");
        return;
      }

      const code = `SPK-${Math.floor(100 + Math.random() * 900)}`;

      try {
        const { error } = await supabaseClient.from("speakers").insert([
          { code, name, gender, age_range: age, accent },
        ]);

        if (error) throw error;
        alert("✅ تم إضافة المتحدث بنجاح");
        document.getElementById("formContainer").remove();
        loadRecordings();
      } catch (err) {
        alert("❌ فشل في إضافة المتحدث: " + err.message);
      }
    });

  document
    .getElementById("cancelSpk")
    .addEventListener("click", () =>
      document.getElementById("formContainer").remove()
    );
}

// تحميل البيانات عند فتح الصفحة
document.addEventListener("DOMContentLoaded", loadRecordings);
