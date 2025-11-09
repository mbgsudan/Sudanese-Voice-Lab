import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (s)=>document.querySelector(s);
const speakerSel=$('#speaker'), textSel=$('#text'), sessionId=$('#sessionId'), micType=$('#micType'), currentText=$('#currentText');
const startBtn=$('#start'), stopBtn=$('#stop'), uploadBtn=$('#upload'), resetBtn=$('#reset'), player=$('#player'), msg=$('#msg');
async function preload(){
  const sp=await supabase.from('speakers').select('id,code,name,accent').order('code');
  speakerSel.innerHTML=(sp.data||[]).map(s=>`<option value="${s.id}">${s.code} — ${s.name||''}</option>`).join('');
  const tx=await supabase.from('texts').select('id,code,content').order('code');
  textSel.innerHTML=(tx.data||[]).map(t=>`<option value="${t.id}" data-content="${encodeURIComponent(t.content)}">${t.code}</option>`).join('');
  if(tx.data&&tx.data[0]) document.getElementById('currentText').textContent=decodeURIComponent(textSel.options[0].dataset.content);
  const d=new Date().toISOString().slice(0,10); sessionId.value=`S-${d}-A`;
}
textSel.addEventListener('change',()=>{ const opt=textSel.options[textSel.selectedIndex]; currentText.textContent=decodeURIComponent(opt.dataset.content||'');});
preload();
let mediaRecorder, chunks=[];
startBtn.onclick=async()=>{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  mediaRecorder=new MediaRecorder(stream,{mimeType:'audio/webm'}); chunks=[];
  mediaRecorder.ondataavailable=e=>chunks.push(e.data);
  mediaRecorder.onstop=()=>{ const blob=new Blob(chunks,{type:'audio/webm'}); player.src=URL.createObjectURL(blob); uploadBtn.disabled=false; resetBtn.disabled=false; };
  mediaRecorder.start(); startBtn.disabled=true; stopBtn.disabled=false; msg.textContent='جارٍ التسجيل...';
};
stopBtn.onclick=()=>{ mediaRecorder.stop(); startBtn.disabled=false; stopBtn.disabled=true; msg.textContent='تم إيقاف التسجيل.'; };
resetBtn.onclick=()=>{ player.removeAttribute('src'); uploadBtn.disabled=true; resetBtn.disabled=true; };
uploadBtn.onclick=async()=>{
  msg.textContent='رفع التسجيل...'; const blob=new Blob(chunks,{type:'audio/webm'});
  const spId=speakerSel.value, txId=textSel.value; if(!spId||!txId){ msg.textContent='اختر المتحدث والنص أولاً.'; return; }
  const sp=await supabase.from('speakers').select('code').eq('id',spId).single(); const tx=await supabase.from('texts').select('code').eq('id',txId).single();
  const spCode=sp.data?.code||'SPK', txCode=tx.data?.code||'TXT'; const ts=new Date().toISOString().replace(/[:.]/g,'-');
  const fileName=`${spCode}_${txCode}_T1_${ts}.webm`; const path=`${spCode}/${sessionId.value}/${fileName}`;
  const up=await supabase.storage.from(BUCKET).upload(path, blob, {contentType:'audio/webm', upsert:false}); if(up.error){ msg.textContent='فشل الرفع: '+up.error.message; return; }
  const ins=await supabase.from('recordings').insert({speaker_id:spId, text_id:txId, storage_path:path, qa_status:'pending'}); if(ins.error){ msg.textContent='تم الرفع لكن فشل إدخال السجل: '+ins.error.message; return; }
  msg.textContent='تم الرفع والتسجيل بنجاح ✅'; uploadBtn.disabled=true;
};
