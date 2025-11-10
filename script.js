(function () {
  let _client = null;
  async function waitFor(condition, { tries = 50, delay = 120 } = {}) {
    while (tries-- > 0) { if (condition()) return true; await new Promise(r => setTimeout(r, delay)); }
    return false;
  }
  async function initSupabase() {
    if (_client) return _client;
    const ok = await waitFor(() =>
      window.supabase && window.SUPABASE_URL && window.SUPABASE_KEY
    );
    if (!ok) { console.error("❌ فشل تحميل Supabase."); alert("تعذر الاتصال بقاعدة البيانات."); return null; }
    const { createClient } = window.supabase;
    _client = createClient(window.SUPABASE_URL, window.SUPABASE_KEY, { auth: { persistSession: false } });
    return _client;
  }
  window.getDB = initSupabase;
  window.bindClick = (selector, handler) => {
    const el = document.querySelector(selector);
    if (el) el.addEventListener("click", handler);
  };
  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  });
})();