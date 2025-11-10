const addSpeakerBtn = document.getElementById("addSpeakerBtn");
if (addSpeakerBtn) {
  addSpeakerBtn.addEventListener("click", async () => {
    // إنشاء نافذة HTML ديناميكية لإدخال البيانات
    const formHtml = `
      <div id="formContainer" style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #1e1e1e; color: #fff; padding: 20px; border-radius: 12px;
        box-shadow: 0 0 20px rgba(0,0,0,0.5); width: 280px; z-index: 9999; font-family: 'Cairo', sans-serif;
      ">
        <h3 style="text-align:center; margin-bottom:10px;">إضافة متحدث جديد</h3>
        <label>الاسم:</label>
        <input id="spk_name" style="width:100%; padding:5px; margin-bottom:10px;">
        
        <label>الجنس:</label>
        <select id="spk_gender" style="width:100%; padding:5px; margin-bottom:10px;">
          <option value="ذكر">ذكر</option>
          <option value="أنثى">أنثى</option>
        </select>

        <label>الفئة العمرية:</label>
        <select id="spk_age" style="width:100%; padding:5px; margin-bottom:10px;">
          <option value="شاب">شاب</option>
          <option value="متوسط العمر">متوسط العمر</option>
          <option value="كبير السن">كبير السن</option>
        </select>

        <label>اللهجة:</label>
        <select id="spk_accent" style="width:100%; padding:5px; margin-bottom:10px;">
          <option value="الخرطومية">الخرطومية</option>
          <option value="دارفورية">دارفورية</option>
          <option value="شرق السودان">شرق السودان</option>
          <option value="شمالية">شمالية</option>
          <option value="جزيرة">جزيرة</option>
          <option value="نيلية">نيلية</option>
        </select>

        <div style="text-align:center;">
          <button id="saveSpk" style="margin:5px; background:#0af; color:#fff; padding:5px 15px; border:none; border-radius:6px;">حفظ</button>
          <button id="cancelSpk" style="margin:5px; background:#f33; color:#fff; padding:5px 15px; border:none; border-radius:6px;">إلغاء</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", formHtml);

    document.getElementById("cancelSpk").onclick = () => {
      document.getElementById("formContainer").remove();
    };

    document.getElementById("saveSpk").onclick = async () => {
      const name = document.getElementById("spk_name").value.trim();
      const gender = document.getElementById("spk_gender").value;
      const age = document.getElementById("spk_age").value;
      const accent = document.getElementById("spk_accent").value;

      if (!name) {
        alert("يرجى إدخال الاسم");
        return;
      }

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

      const { error } = await supabase.from("speakers").insert([
        { code: nextCode, name, gender, age_range: age, accent },
      ]);

      if (error) {
        alert("حدث خطأ أثناء الإضافة ❌");
        console.error(error);
      } else {
        alert(`تمت إضافة ${name} (${nextCode}) بنجاح ✅`);
        document.getElementById("formContainer").remove();
        loadRecordings();
      }
    };
  });
}
