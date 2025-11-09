import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';
const supabase=createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_PASSWORD='admin123';
const $=(s)=>document.querySelector(s); const lock=$('#lock'); const app=$('#app');
document.getElementById('enter').onclick=()=>{ const p=document.getElementById('pwd').value.trim(); if(p===ADMIN_PASSWORD){ lock.classList.add('hidden'); app.classList.remove('hidden'); init(); } else alert('كلمة المرور غير صحيحة'); };
const speakerFilter=document.getElementById('speakerFilter'); const statusFilter=document.getElementById('statusFilter'); const list=document.getElementById('list'); const msg=document.getElementById('msg');
async function init(){ await loadSpeakers(); await loadList(); speakerFilter.onchange=loadList; statusFilter.onchange=loadList; }
async function loadSpeakers(){ const sp=await supabase.from('speakers').select('id,code,name').order('code'); speakerFilter.innerHTML=`<option value="all">الكل</option>`+(sp.data||[]).map(s=>`<option value="${s.id}">${s.code} — ${s.name||''}</option>`).join(''); }
async function loadList(){ list.innerHTML=''; msg.textContent='جاري التحميل...'; let q=supabase.from('recordings').select('id,speaker_id,text_id,storage_path,qa_status,created_at').order('created_at',{ascending:false}).limit(50);
  if(statusFilter.value!=='all'){ q=q.eq('qa_status',statusFilter.value);} const spId=speakerFilter.value; if(spId!=='all'){ q=q.eq('speaker_id',spId);} const res=await q; msg.textContent='';
  if(res.error){ msg.textContent='خطأ: '+res.error.message; return; } for(const r of (res.data||[])){ const sp=await supabase.from('speakers').select('code,name').eq('id',r.speaker_id).single(); const tx=await supabase.from('texts').select('code,content').eq('id',r.text_id).single();
    const pub=supabase.storage.from(BUCKET).getPublicUrl(r.storage_path).data.publicUrl; const card=document.createElement('div'); card.className='card';
    card.innerHTML=`<div class="badge">${sp.data?.code||''} — ${sp.data?.name||''} · ${tx.data?.code||''}</div><p>${tx.data?.content||''}</p><audio controls class="audio" src="${pub}"></audio>
    <div class="row"><button class="btn-success" data-id="${r.id}" data-act="approve">قبول</button><button class="btn-danger" data-id="${r.id}" data-act="reject">رفض</button></div>`;
    card.querySelectorAll('button').forEach(b=> b.onclick=()=> act(r.id, b.dataset.act)); list.appendChild(card); } }
async function act(id, action){ const status = action==='approve' ? 'approved' : 'rejected'; const up=await supabase.from('recordings').update({qa_status:status}).eq('id',id); if(up.error){ alert('فشل التحديث'); return;} await loadList(); }
