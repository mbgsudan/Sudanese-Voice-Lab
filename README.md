# Sawtna v1.4 Final Fix (GitHub Pages)

## النشر على GitHub Pages
1) ارفع كل الملفات إلى جذر الفرع `main`.
2) من **Settings → Pages** اختر `Deploy from a branch` وفرع `main` وجذر `/`.
3) انتظر دقائق ثم افتح رابط Pages.

## إعداد Supabase
- حدّث `config.js` إذا تغيّر URL أو ANON_KEY.
- تأكد من أن bucket `recordings` **Public**.
- الجداول:
  - `texts(id, content)`
  - `recordings(id, storage_path, status, mic_type, text_id, speaker_name, created_at)`
  - (اختياري) `speakers(name, gender, age_range, accent)`

## الصفحات
- `index.html` — الرئيسية
- `record.html` — التسجيل
- `follow.html` — متابعة
- `admin.html` — كلمة سر المشرف → `review.html`
- `review.html` — المراجعة (Realtime)

> كلمة المرور الافتراضية للمراجعة: **70003mbgz**
