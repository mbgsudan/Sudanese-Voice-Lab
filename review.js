import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';
if(!localStorage.getItem('admin_auth')){ alert('يجب تسجيل الدخول أولًا 🔐'); location.href='./admin.html'; }
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s=>document.querySelector(s);
$('#logout').onclick = ()=>{ localStorage.removeItem('admin_auth'); location.href='./'; };
const list = $('#list');
async function fileUrl(p){ return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(p)}`; }
function card(rec, url){
  const sp = rec.speakers, tx = rec.texts;
  const statusClass = rec.status==='approved'?'ok':rec.status==='rejected'?'danger':'warn';
  return `<div class="card">
    <div class="row" style="justify-content:space-between">
      <span class="badge ${statusClass}">الحالة: ${rec.status}</span>
      <strong>${sp?.name ?? rec.speaker_name ?? '—'}</strong>
    </div>
    <div class="meta">🗣️ اللهجة: ${sp?.accent ?? '—'} • 🎂 العمر: ${sp?.age_range ?? '—'} • 👤 الجنس: ${sp?.gender ?? '—'}</div>
    <div class="meta">💬 النص: ${tx?.content ?? '—'}</div>
    <div class="hr"></div>
    <audio class="audio" controls src="${url}"></audio>
    <div class="row" style="gap:8px; margin-top:10px">
      <button class="btn ok" data-act="approve" data-id="${rec.id}">✅ موافقة</button>
      <button class="btn danger" data-act="reject" data-id="${rec.id}">❌ رفض</button>
    </div>
  </div>`;
}
async function load(){
  list.innerHTML='<div class="subtitle">⏳ جارِ التحميل...</div>';
  const { data, error } = await supabase
    .from('recordings')
    .select('id,status,storage_path,speaker_name, speakers(name,gender,age_range,accent), texts(content)')
    .order('created_at',{ascending:false});
  if(error){ list.innerHTML='<div class="subtitle">⚠️ فشل التحميل.</div>'; return; }
  if(!data?.length){ list.innerHTML='<div class="subtitle">لا توجد تسجيلات بعد.</div>'; return; }
  const html = await Promise.all(data.map(async r => card(r, await fileUrl(r.storage_path))));
  list.innerHTML = html.join('');
  list.querySelectorAll('[data-act]').forEach(btn=>{
    btn.onclick = async e => {
      const id = e.currentTarget.dataset.id;
      const status = e.currentTarget.dataset.act==='approve'?'approved':'rejected';
      const { error } = await supabase.from('recordings').update({ status }).eq('id', id);
      if(error) toast('❌ فشل تحديث الحالة'); else toast('✅ تم التحديث');
    };
  });
}
function toast(t){ const el=document.createElement('div'); el.className='toast show'; el.textContent=t; document.body.appendChild(el);
  setTimeout(()=>{el.remove()},1800); }
await load();
supabase.channel('rec_changes').on('postgres_changes',{event:'*',schema:'public',table:'recordings'},()=>load()).subscribe();
