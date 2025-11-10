const ADMIN_PASSWORD = "70003mbgz";
document.addEventListener("DOMContentLoaded", async () => {
  const passInput = document.getElementById("adminPass");
  const loginBtn  = document.getElementById("btnAdminLogin");
  const msg       = document.getElementById("adminLoginMsg");
  const loginBox  = document.getElementById("admin-login");
  const panel     = document.getElementById("admin-panel");
  if (localStorage.getItem("sawtna_admin") === "ok") {
    loginBox.style.display = "none"; panel.style.display = "block"; bootAdmin();
  }
  loginBtn?.addEventListener("click", () => {
    const val = (passInput?.value || "").trim();
    if (val === ADMIN_PASSWORD) {
      localStorage.setItem("sawtna_admin", "ok");
      loginBox.style.display = "none"; panel.style.display = "block"; bootAdmin();
    } else {
      msg.textContent = "كلمة المرور غير صحيحة."; msg.style.color = "#ff6b6b";
    }
  });
});
async function bootAdmin() {
  const db = await getDB(); if (!db) return;
  try {
    const { data, error } = await db.from("recordings").select("id,speaker_name,status,audio_url,created_at").order("created_at",{ascending:false}).limit(50);
    if (error) throw error; console.info("📥 التسجيلات:", data);
  } catch (e) { console.error("❌ فشل تحميل التسجيلات:", e.message); }
}
document.addEventListener('DOMContentLoaded', ()=>{
  const pwd = document.getElementById('admin-password');
  const btn = document.getElementById('admin-login-btn');
  if (pwd && btn) {
    pwd.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ btn.click(); } });
  }
});
