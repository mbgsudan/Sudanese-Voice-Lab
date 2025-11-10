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
    } else {
      alert(`تمت إضافة المتحدث ${name} (${nextCode}) بنجاح ✅`);
      location.reload();
    }
  });
}
