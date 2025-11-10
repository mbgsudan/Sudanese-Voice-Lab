// استيراد إعدادات Supabase
import { createClient } from '@supabase/supabase-js'

// بيانات الاتصال بمشروعك في Supabase
const SUPABASE_URL = "https://qcctqvmwwpsoiexgdqwp.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjY3Rxdm13d3Bzb2lleGdkcXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI1OTcsImV4cCI6MjA3ODI5ODU5N30.uTfskCuzkZNcvy1QdaOzqlW8km-wcZQoVRFi6k2xndQ"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const BUCKET = 'recordings'

// الدالة التي ترفع التسجيل وتخزّن بياناته في الجدول
export async function uploadRecording({ file, speakerId, textId, micType, sessionCode }) {
  try {
    // توليد اسم ملف فريد
    const fileName = `${Date.now()}-${speakerId}-${textId}.webm`
    const filePath = `${speakerId}/${fileName}`

    // 1️⃣ رفع الملف إلى الباكِت
    const { data: storageData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'audio/webm'
      })

    if (uploadError) throw uploadError

    // 2️⃣ الحصول على الرابط العام للملف
    const { data: publicUrlData } = supabase
      .storage
      .from(BUCKET)
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData?.publicUrl

    // 3️⃣ تسجيل الميتاداتا في جدول recordings
    const { data, error } = await supabase
      .from('recordings')
      .insert([{
        speaker_id: speakerId,
        text_id: textId,
        mic_type: micType || 'USB',
        session_code: sessionCode || 'S-' + new Date().toISOString().slice(0, 10),
        session_id: sessionCode || 'S-' + Date.now(),
        storage_path: filePath,
        duration_seconds: null,
        qa_status: 'pending',
        public_url: publicUrl
      }])

    if (error) throw error

    console.log('✅ تم رفع التسجيل وتسجيل البيانات بنجاح:', data)
    return { success: true, filePath, publicUrl }
  } catch (err) {
    console.error('❌ فشل في رفع أو تسجيل الملف:', err.message)
    return { success: false, error: err.message }
  }
}
