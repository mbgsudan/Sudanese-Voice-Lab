// اتصال Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_OR_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// زر إضافة متحدث جديد
const addSpeakerBtn = document.getElementById('addSpeakerBtn');
if (addSpeakerBtn) {
  addSpeakerBtn.addEventListener('click', async () => {
    const name = prompt("أدخل اسم المتحدث الجديد:");
    if (!name) return;

    // إنشاء رمز تلقائي للمتحدث (مثل SPK-003)
    const { data: speakers } = await supabase
      .from('speakers')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    let nextCode = "SPK-001";
    if (speakers && speakers.length > 0) {
      const lastId = speakers[0].id;
      const nextNumber = (parseInt(lastId.replace('SPK-', '')) + 1).toString().padStart(3, '0');
      nextCode = `SPK-${nextNumber}`;
    }

    // إدخال المتحدث الجديد
    const { data, error } = await supabase
      .from('speakers')
      .insert([{ id: nextCode, name: name }]);

    if (error) {
      alert("حدث خطأ أثناء الإضافة: " + error.message);
    } else {
      alert(`تمت إضافة المتحدث ${name} (${nextCode}) بنجاح ✅`);
      location.reload(); // لتحديث الجدول بعد الإضافة
    }
  });
}
