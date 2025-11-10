import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s=>document.querySelector(s);
const speakerName=$('#speakerName'), micType=$('#micType'), recBtn=$('#recBtn'),
      meter=$('#meter'), msg=$('#recMsg'), currText=$('#currText'), progressInfo=$('#progressInfo');
let texts=[], idx=0, media, chunks=[], recording=false;
async function loadTexts(){
  const { data, error } = await supabase.from('texts').select('id,content').order('id');
  if(error || !data?.length){ currText.textContent='تعذّر تحميل النصوص. تأكد من وجود بيانات في Supabase.'; return; }
  texts=data; idx=0; renderText();
}
function renderText(){
  if(!texts.length){ progressInfo.textContent='0/0'; currText.textContent='لا توجد نصوص متاحة حالياً.'; return; }
  const t=texts[idx]; currText.textContent=t.content; progressInfo.textContent=`${idx+1}/${texts.length}`;
}
$('#prev').onclick=()=>{ if(idx>0){ idx--; renderText(); }};
$('#skip').onclick=()=>{ if(idx<texts.length-1){ idx++; renderText(); }};
function pulse(on){ meter.style.width = on?'100%':'0%'; meter.style.transition = on?'width .25s ease':'none'; }
async function ensureMedia(){
  if(media) return media;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true, sampleRate:48000, channelCount:1 }
  });
  const rec = new MediaRecorder(stream, { mimeType:'audio/webm; codecs=opus', audioBitsPerSecond:128000 });
  rec.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
  rec.onstop = async () => {
    pulse(false); recording=false; recBtn.textContent='ابدأ التسجيل 🎙️';
    const blob = new Blob(chunks,{type:'audio/webm'}); chunks=[];
    const spk = speakerName.value.trim(); if(!spk){ msg.textContent='⚠️ اكتب اسم المتحدث أولاً.'; return; }
    if(!texts.length){ msg.textContent='⚠️ لا يوجد نص.'; return; }
    const path = `${encodeURIComponent(spk)}/${Date.now()}.webm`;
    const { error:upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert:false });
    if(upErr){ msg.textContent='❌ فشل رفع الملف.'; return; }
    const textId = texts[idx].id;
    const { error:insErr } = await supabase.from('recordings').insert([{
      storage_path:path, status:'pending', mic_type:micType.value, text_id:textId, speaker_name:spk
    }]);
    if(insErr){ msg.textContent='⚠️ تم الرفع لكن فشل حفظ السجل.'; return; }
    msg.textContent='✅ تم حفظ التسجيل بنجاح.';
    if(idx<texts.length-1){ idx++; renderText(); }
  };
  media=rec; return rec;
}
recBtn.onclick = async ()=>{
  const rec = await ensureMedia();
  if(!recording){ recording=true; rec.start(); pulse(true); recBtn.textContent='إيقاف ◼️'; msg.textContent='جارٍ التسجيل...'; }
  else{ rec.stop(); }
};
loadTexts();
